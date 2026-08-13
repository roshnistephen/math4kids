/* ==========================================================================
   LokaKids — shared runtime
   Star wallet, sound, confetti and scroll reveals. Loaded by every page.
   ========================================================================== */
(function (global) {
    'use strict';

    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── Storage (never throws — private mode / disabled storage is fine) ── */
    function read(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw === null ? fallback : JSON.parse(raw);
        } catch (e) { return fallback; }
    }
    function write(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    }

    /* ── Star wallet ─────────────────────────────────────────────────── */
    const STARS_KEY = 'lokakids.stars';

    const Stars = {
        all() {
            const v = read(STARS_KEY, {});
            return (v && typeof v === 'object') ? v : {};
        },
        get(game) { return Number(this.all()[game]) || 0; },
        total() {
            return Object.values(this.all()).reduce((sum, n) => sum + (Number(n) || 0), 0);
        },
        add(game, amount) {
            const bag = this.all();
            bag[game] = (Number(bag[game]) || 0) + amount;
            write(STARS_KEY, bag);
            paintCounters(true);
            return bag[game];
        },
        reset() { write(STARS_KEY, {}); paintCounters(false); }
    };

    function paintCounters(bump) {
        document.querySelectorAll('[data-star-total]').forEach(node => {
            const num = node.querySelector('.star-count__num') || node;
            num.textContent = Stars.total();
            if (bump) {
                node.classList.remove('is-bumping');
                void node.offsetWidth;
                node.classList.add('is-bumping');
            }
        });
        document.querySelectorAll('[data-star-game]').forEach(node => {
            const n = Stars.get(node.dataset.starGame);
            node.textContent = node.hasAttribute('data-star-word')
                ? n + (n === 1 ? ' star' : ' stars')
                : n;
        });
    }

    /* ── Sound ───────────────────────────────────────────────────────── */
    const MUTE_KEY = 'lokakids.muted';

    const Sound = {
        muted: read(MUTE_KEY, false) === true,
        _ctx: null,
        _clips: {},

        _clip(name, src) {
            if (!this._clips[name]) {
                const a = new Audio(src);
                a.preload = 'auto';
                a.volume = 0.55;
                this._clips[name] = a;
            }
            return this._clips[name];
        },

        _audio() {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            if (!this._ctx) this._ctx = new AC();
            if (this._ctx.state === 'suspended') this._ctx.resume().catch(() => {});
            return this._ctx;
        },

        /* Short synthesised blips — no assets needed, no latency. */
        tone(freqs, opts) {
            if (this.muted) return;
            const ctx = this._audio();
            if (!ctx) return;
            const o = opts || {};
            const gap = o.gap || 0.08;
            const dur = o.dur || 0.2;
            const vol = o.vol || 0.07;
            const type = o.type || 'sine';
            const now = ctx.currentTime;

            freqs.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const at = now + i * gap;
                osc.type = type;
                osc.frequency.setValueAtTime(freq, at);
                gain.gain.setValueAtTime(0.0001, at);
                gain.gain.linearRampToValueAtTime(vol, at + 0.012);
                gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
                osc.connect(gain).connect(ctx.destination);
                osc.start(at);
                osc.stop(at + dur + 0.02);
            });
        },

        play(name) {
            if (this.muted) return;
            const map = {
                correct: 'media/correct-156911.mp3',
                wrong:   'media/wrong-buzzer-6268.mp3'
            };
            const src = map[name];
            if (!src) return;
            const clip = this._clip(name, src);
            try {
                clip.currentTime = 0;
                const p = clip.play();
                if (p && p.catch) p.catch(() => {});
            } catch (e) { /* ignore */ }
        },

        pop()    { this.tone([660, 990], { gap: 0.03, dur: 0.12, vol: 0.05, type: 'triangle' }); },
        tap()    { this.tone([520],      { dur: 0.09, vol: 0.04, type: 'sine' }); },
        win()    { this.tone([523.25, 659.25, 783.99, 1046.5], { gap: 0.09, dur: 0.28, vol: 0.07 }); },
        oops()   { this.tone([320, 240], { gap: 0.1, dur: 0.22, vol: 0.05, type: 'triangle' }); },
        fanfare(){ this.tone([523.25, 659.25, 783.99, 1046.5, 1318.5], { gap: 0.12, dur: 0.36, vol: 0.08 }); },

        toggle() {
            this.muted = !this.muted;
            write(MUTE_KEY, this.muted);
            paintToggles();
            if (!this.muted) this.tap();
            return this.muted;
        }
    };

    function paintToggles() {
        document.querySelectorAll('[data-sound-toggle]').forEach(btn => {
            btn.textContent = Sound.muted ? '🔇' : '🔊';
            btn.setAttribute('aria-pressed', String(!Sound.muted));
            btn.setAttribute('aria-label', Sound.muted ? 'Turn sound on' : 'Turn sound off');
            btn.title = Sound.muted ? 'Sound off' : 'Sound on';
        });
    }

    /* ── Confetti ────────────────────────────────────────────────────── */
    const CONFETTI_COLORS = ['#FF6FA5', '#FFB627', '#17C3A2', '#3BA9F5', '#7A5AF8', '#FF7A59', '#FFE066'];

    function confetti(count) {
        if (REDUCED) return;
        const n = count || 46;
        for (let i = 0; i < n; i++) {
            setTimeout(() => {
                const bit = document.createElement('div');
                const size = 7 + Math.random() * 9;
                const round = Math.random() > 0.5;
                bit.className = 'confetti-bit';
                bit.style.cssText = [
                    'left:' + (Math.random() * 100) + 'vw',
                    'width:' + size + 'px',
                    'height:' + (round ? size : size * 1.6) + 'px',
                    'background:' + CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
                    'border-radius:' + (round ? '50%' : '3px'),
                    '--drift:' + ((Math.random() - 0.5) * 220) + 'px',
                    'animation-duration:' + (1.6 + Math.random() * 1.6) + 's',
                    'animation-delay:' + (Math.random() * 0.35) + 's'
                ].join(';');
                document.body.appendChild(bit);
                setTimeout(() => bit.remove(), 4200);
            }, i * 22);
        }
    }

    /* Small burst of coloured dots at a point on screen. */
    function burst(x, y, colors) {
        if (REDUCED) return;
        const palette = colors && colors.length ? colors : CONFETTI_COLORS;
        for (let i = 0; i < 12; i++) {
            const dot = document.createElement('div');
            const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.4;
            const dist = 42 + Math.random() * 48;
            const size = 6 + Math.random() * 7;
            dot.style.cssText = [
                'position:fixed', 'z-index:300', 'pointer-events:none',
                'left:' + x + 'px', 'top:' + y + 'px',
                'width:' + size + 'px', 'height:' + size + 'px',
                'border-radius:50%',
                'background:' + palette[(Math.random() * palette.length) | 0],
                'transform:translate(-50%,-50%)',
                'transition:transform .6s cubic-bezier(.2,.8,.3,1), opacity .6s ease-out'
            ].join(';');
            document.body.appendChild(dot);
            requestAnimationFrame(() => {
                dot.style.transform = 'translate(' + (Math.cos(angle) * dist - 50) + '%,' +
                    (Math.sin(angle) * dist - 50) + '%) scale(.3)';
                dot.style.opacity = '0';
            });
            setTimeout(() => dot.remove(), 700);
        }
    }

    /* ── Scroll reveals ──────────────────────────────────────────────── */
    function initReveals() {
        const items = document.querySelectorAll('.reveal');
        if (!items.length) return;
        if (!('IntersectionObserver' in window)) {
            items.forEach(el => el.classList.add('is-in'));
            return;
        }
        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-in');
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px' });
        items.forEach(el => io.observe(el));
    }

    /* ── Boot ────────────────────────────────────────────────────────── */
    function init() {
        paintCounters(false);
        paintToggles();
        initReveals();

        document.querySelectorAll('[data-sound-toggle]').forEach(btn => {
            btn.addEventListener('click', () => Sound.toggle());
        });

        const year = document.querySelector('[data-year]');
        if (year) year.textContent = new Date().getFullYear();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    global.Kid = {
        Stars, Sound, confetti, burst,
        reduced: REDUCED,
        refresh: () => paintCounters(false)
    };
})(window);
