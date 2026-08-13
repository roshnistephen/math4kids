/* ==========================================================================
   Unicorn Makeover — pick a part, pick a colour, watch it sparkle.
   Canvas art is drawn in a fixed 480×480 space and scaled for the screen.
   ========================================================================== */
(function () {
    'use strict';

    const SIZE = 480;

    const PARTS = [
        { id: 'horn',   label: 'Horn',    emoji: '✨' },
        { id: 'mane',   label: 'Mane',    emoji: '🌈' },
        { id: 'eyes',   label: 'Eyes',    emoji: '👁️' },
        { id: 'cheeks', label: 'Blush',   emoji: '🌸' },
        { id: 'lips',   label: 'Lips',    emoji: '💋' },
        { id: 'nails',  label: 'Polish',  emoji: '💅' }
    ];

    const PALETTES = {
        horn:   ['#FFD700', '#FF69B4', '#B39DDB', '#4DD0E1', '#FF7043', '#E0E0E0'],
        mane:   ['#F06292', '#AB47BC', '#26C6DA', '#FFCA28', '#EF5350', '#66BB6A'],
        eyes:   ['#5C6BC0', '#AB47BC', '#EC407A', '#26A69A', '#FF7043', '#26C6DA'],
        cheeks: ['#F48FB1', '#F06292', '#FFCCBC', '#CE93D8', '#B0BEC5', '#FFF59D'],
        lips:   ['#E91E63', '#C62828', '#FF7043', '#AD1457', '#F48FB1', '#FF1744'],
        nails:  ['#F48FB1', '#E53935', '#7B1FA2', '#0288D1', '#F9A825', '#2E7D32']
    };

    const COLOR_NAMES = {
        horn:   ['Gold', 'Rose Pink', 'Lavender', 'Sky Blue', 'Coral', 'Silver'],
        mane:   ['Pink', 'Purple', 'Teal', 'Sunshine', 'Red', 'Green'],
        eyes:   ['Indigo', 'Violet', 'Hot Pink', 'Teal', 'Orange', 'Cyan'],
        cheeks: ['Blush', 'Deep Rose', 'Peach', 'Lilac', 'Misty Blue', 'Cream'],
        lips:   ['Magenta', 'Dark Red', 'Coral', 'Berry', 'Light Pink', 'Cherry'],
        nails:  ['Cotton Candy', 'Cherry Red', 'Royal Purple', 'Ocean Blue', 'Honey Gold', 'Emerald']
    };

    const el = id => document.getElementById(id);

    class Studio {
        constructor() {
            this.canvas   = el('stageCanvas');
            this.ctx      = this.canvas.getContext('2d');
            this.partsEl  = el('parts');
            this.swatchEl = el('swatches');
            this.nameEl   = el('swatchName');
            this.countEl  = el('doneCount');
            this.starsEl  = el('doneStars');
            this.modal    = el('doneModal');

            // Head geometry in the 480×480 art space
            this.CX = 240;
            this.CY = 235;
            this.R  = 115;

            this.partIdx  = 0;
            this.colorIdx = 0;
            this.applied  = Object.fromEntries(PARTS.map(p => [p.id, null]));
            this.done     = 0;
            this.sparkles = [];
            this.finished = false;

            // Blinking
            this.blinkAt = performance.now() + 2200;
            this.blinkStart = null;

            this.buildParts();
            this.buildSwatches();
            this.updateProgress();
            this.resize();
            this.bind();
            requestAnimationFrame(() => this.loop());
        }

        /* ── Panel ───────────────────────────────────────────────────── */
        buildParts() {
            this.partsEl.innerHTML = '';
            PARTS.forEach((p, i) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'part';
                btn.setAttribute('role', 'option');
                btn.setAttribute('aria-selected', String(i === this.partIdx));
                btn.innerHTML =
                    '<span class="part__emoji">' + p.emoji + '</span>' + p.label +
                    '<span class="part__tick">✓</span>';
                btn.addEventListener('click', () => {
                    this.partIdx = i;
                    this.colorIdx = 0;
                    Kid.Sound.tap();
                    this.buildParts();
                    this.buildSwatches();
                });
                if (this.applied[p.id]) btn.classList.add('is-done');
                this.partsEl.appendChild(btn);
            });
        }

        buildSwatches() {
            const part = PARTS[this.partIdx];
            const colors = PALETTES[part.id];
            const names = COLOR_NAMES[part.id];

            this.swatchEl.innerHTML = '';
            colors.forEach((hex, i) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'swatch';
                btn.style.background = hex;
                btn.title = names[i];
                btn.setAttribute('role', 'option');
                btn.setAttribute('aria-label', names[i] + ' for ' + part.label.toLowerCase());
                btn.setAttribute('aria-selected', String(i === this.colorIdx));
                btn.addEventListener('click', () => {
                    this.colorIdx = i;
                    this.apply();
                });
                btn.addEventListener('mouseenter', () => { this.nameEl.textContent = names[i]; });
                this.swatchEl.appendChild(btn);
            });
            this.nameEl.textContent = names[this.colorIdx];
        }

        markSelection() {
            Array.from(this.partsEl.children).forEach((b, i) =>
                b.setAttribute('aria-selected', String(i === this.partIdx)));
            Array.from(this.swatchEl.children).forEach((b, i) =>
                b.setAttribute('aria-selected', String(i === this.colorIdx)));
            this.nameEl.textContent = COLOR_NAMES[PARTS[this.partIdx].id][this.colorIdx];
        }

        /* ── Actions ─────────────────────────────────────────────────── */
        apply() {
            const part = PARTS[this.partIdx];
            const hex = PALETTES[part.id][this.colorIdx];
            const isNew = this.applied[part.id] === null;

            this.applied[part.id] = hex;
            this.spawnSparkles(part.id);
            Kid.Sound.tone([523.25, 659.25, 783.99, 1046.5], { gap: 0.06, dur: 0.22, vol: 0.06 });

            if (isNew) {
                this.done++;
                Kid.Stars.add('unicorn', 1);
                this.partsEl.children[this.partIdx].classList.add('is-done');
                this.updateProgress();
            }

            this.markSelection();

            if (this.done >= PARTS.length && !this.finished) {
                this.finished = true;
                setTimeout(() => this.celebrate(), 900);
            } else if (isNew) {
                // Nudge on to the next part that still needs colour
                const next = PARTS.findIndex(p => this.applied[p.id] === null);
                if (next > -1) {
                    setTimeout(() => {
                        this.partIdx = next;
                        this.colorIdx = 0;
                        this.buildSwatches();
                        this.markSelection();
                    }, 450);
                }
            }
        }

        surprise() {
            const part = PARTS[this.partIdx];
            const options = PALETTES[part.id].length;
            let pick = this.colorIdx;
            while (options > 1 && pick === this.colorIdx) {
                pick = Math.floor(Math.random() * options);
            }
            this.colorIdx = pick;
            this.apply();
        }

        reset() {
            this.applied = Object.fromEntries(PARTS.map(p => [p.id, null]));
            this.done = 0;
            this.finished = false;
            this.partIdx = 0;
            this.colorIdx = 0;
            this.sparkles = [];
            this.modal.hidden = true;
            this.buildParts();
            this.buildSwatches();
            this.updateProgress();
            Kid.Sound.tap();
        }

        celebrate() {
            this.modal.hidden = false;
            el('doneStarRow').textContent = '⭐'.repeat(PARTS.length);
            el('btnKeep').focus({ preventScroll: true });
            Kid.Sound.fanfare();
            Kid.confetti(70);
        }

        savePhoto() {
            try {
                const link = document.createElement('a');
                link.download = 'my-unicorn.png';
                link.href = this.canvas.toDataURL('image/png');
                link.click();
                Kid.Sound.tap();
            } catch (e) {
                alert('Sorry — this browser would not let us save the picture.');
            }
        }

        updateProgress() {
            this.countEl.textContent = this.done + ' / ' + PARTS.length;
            this.starsEl.innerHTML = Array.from({ length: this.done },
                (_, i) => '<span style="animation-delay:' + (i * 0.05) + 's">⭐</span>').join('');
        }

        /* ── Input ───────────────────────────────────────────────────── */
        bind() {
            el('btnSurprise').addEventListener('click', () => this.surprise());
            el('btnReset').addEventListener('click', () => this.reset());
            el('btnSave').addEventListener('click', () => this.savePhoto());
            el('btnKeep').addEventListener('click', () => { this.modal.hidden = true; });
            el('btnNewLook').addEventListener('click', () => this.reset());
            el('btnSaveDone').addEventListener('click', () => this.savePhoto());

            this.canvas.addEventListener('click', () => this.apply());

            window.addEventListener('resize', () => this.resize());

            document.addEventListener('keydown', e => {
                const parts = PARTS.length;
                const colors = PALETTES[PARTS[this.partIdx].id].length;
                switch (e.key) {
                    case 'ArrowUp':
                        e.preventDefault();
                        this.partIdx = (this.partIdx - 1 + parts) % parts;
                        this.colorIdx = 0;
                        this.buildSwatches(); this.markSelection();
                        break;
                    case 'ArrowDown':
                        e.preventDefault();
                        this.partIdx = (this.partIdx + 1) % parts;
                        this.colorIdx = 0;
                        this.buildSwatches(); this.markSelection();
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.colorIdx = (this.colorIdx - 1 + colors) % colors;
                        this.markSelection();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.colorIdx = (this.colorIdx + 1) % colors;
                        this.markSelection();
                        break;
                    case 'Enter':
                    case ' ':
                        if (e.target.closest('button, a')) return;   // let real buttons work
                        e.preventDefault();
                        this.apply();
                        break;
                }
            });
        }

        /* Keep the art crisp on retina screens. */
        resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            this.canvas.width = SIZE * dpr;
            this.canvas.height = SIZE * dpr;
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        /* ── Loop ────────────────────────────────────────────────────── */
        loop() {
            this.render();
            requestAnimationFrame(() => this.loop());
        }

        render() {
            const ctx = this.ctx;
            ctx.clearRect(0, 0, SIZE, SIZE);
            this.drawBg();
            this.drawManeBack();
            this.drawEars();
            this.drawHead();
            this.drawHorn();
            this.drawManeFront();
            this.drawEyes();
            this.drawCheeks();
            this.drawNose();
            this.drawLips();
            this.drawBottles();
            this.tickSparkles();
        }

        /* ── Background ──────────────────────────────────────────────── */
        drawBg() {
            const ctx = this.ctx;
            const g = ctx.createLinearGradient(0, 0, SIZE, SIZE);
            g.addColorStop(0, '#FFF3FB');
            g.addColorStop(0.5, '#F7F1FF');
            g.addColorStop(1, '#EFF6FF');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, SIZE, SIZE);

            const t = performance.now() / 1000;
            [[35, 38, 10], [445, 32, 8], [22, 215, 7], [458, 190, 9],
             [45, 402, 8], [438, 424, 10], [92, 456, 7], [396, 458, 9],
             [120, 14, 6], [356, 12, 7], [466, 340, 6], [14, 320, 7]
            ].forEach(([x, y, s], i) => {
                const twinkle = 0.24 + 0.18 * Math.sin(t * 1.6 + i);
                this.star(x, y, s, '#FFC53D', twinkle);
            });
        }

        star(x, y, size, color, alpha) {
            const ctx = this.ctx;
            ctx.save();
            ctx.translate(x, y);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = color;
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const a1 = (i * 4 * Math.PI / 5) - Math.PI / 2;
                const a2 = a1 + (2 * Math.PI / 5);
                const px = Math.cos(a1) * size, py = Math.sin(a1) * size;
                const qx = Math.cos(a2) * size * 0.4, qy = Math.sin(a2) * size * 0.4;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                ctx.lineTo(qx, qy);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        /* ── Unicorn ─────────────────────────────────────────────────── */
        drawManeBack() {
            const { ctx, CX, CY } = this;
            const c1 = this.applied.mane || '#F06292';
            const strands = [
                { p: [CX + 55, CY - 58, CX + 155, CY - 78, CX + 165, CY + 58, CX + 112, CY + 108], w: 32, c: c1 },
                { p: [CX + 45, CY - 88, CX + 168, CY - 108, CX + 175, CY + 8, CX + 122, CY + 72], w: 26, c: this.tint(c1, 40) },
                { p: [CX + 35, CY - 108, CX + 142, CY - 138, CX + 158, CY - 38, CX + 102, CY + 18], w: 20, c: this.tint(c1, -35) }
            ];
            strands.forEach(s => {
                ctx.beginPath();
                ctx.moveTo(s.p[0], s.p[1]);
                ctx.bezierCurveTo(s.p[2], s.p[3], s.p[4], s.p[5], s.p[6], s.p[7]);
                ctx.strokeStyle = s.c;
                ctx.lineWidth = s.w;
                ctx.lineCap = 'round';
                ctx.stroke();
            });
        }

        drawEars() {
            const { ctx, CX, CY } = this;
            [-1, 1].forEach(dir => {
                ctx.fillStyle = '#FFF5F9';
                ctx.strokeStyle = '#F8BBD0';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(CX + dir * 74, CY - 70);
                ctx.lineTo(CX + dir * 100, CY - 124);
                ctx.lineTo(CX + dir * 42, CY - 86);
                ctx.closePath();
                ctx.fill(); ctx.stroke();

                ctx.fillStyle = '#FFD6E8';
                ctx.beginPath();
                ctx.moveTo(CX + dir * 75, CY - 75);
                ctx.lineTo(CX + dir * 94, CY - 116);
                ctx.lineTo(CX + dir * 50, CY - 90);
                ctx.closePath();
                ctx.fill();
            });
        }

        drawHead() {
            const { ctx, CX, CY, R } = this;
            ctx.beginPath();
            ctx.arc(CX, CY, R, 0, Math.PI * 2);
            ctx.fillStyle = '#FFF5F9';
            ctx.fill();
            ctx.strokeStyle = '#F8BBD0';
            ctx.lineWidth = 2.5;
            ctx.stroke();
        }

        drawHorn() {
            const { ctx, CX, CY, R } = this;
            const color = this.applied.horn || '#F0E68C';
            const tipY = CY - R - 72;
            const baseY = CY - R + 8;
            const half = 14;

            ctx.beginPath();
            ctx.moveTo(CX - half, baseY);
            ctx.lineTo(CX, tipY);
            ctx.lineTo(CX + half, baseY);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = this.tint(color, -45);
            ctx.lineWidth = 1.5;
            ctx.stroke();

            for (let i = 1; i <= 3; i++) {
                const t = i / 4;
                const sy = baseY + t * (tipY - baseY);
                const hw = (1 - t) * half;
                ctx.strokeStyle = 'rgba(255,255,255,0.55)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(CX - hw, sy);
                ctx.lineTo(CX - hw * 0.25, sy - 7);
                ctx.stroke();
            }

            ctx.fillStyle = 'rgba(255,255,255,0.38)';
            ctx.beginPath();
            ctx.moveTo(CX - 4, baseY);
            ctx.lineTo(CX - 1, tipY + 22);
            ctx.lineTo(CX + 5, baseY);
            ctx.closePath();
            ctx.fill();
        }

        drawManeFront() {
            const { ctx, CX, CY, R } = this;
            const c1 = this.applied.mane || '#F06292';
            [
                { p: [CX - 18, CY - R + 12, CX - 34, CY - R + 50, CX - 26, CY - R + 72], w: 14, c: c1 },
                { p: [CX + 5, CY - R + 5, CX - 10, CY - R + 46, CX - 2, CY - R + 68], w: 11, c: this.tint(c1, 35) },
                { p: [CX + 22, CY - R + 14, CX + 16, CY - R + 48, CX + 18, CY - R + 62], w: 9, c: this.tint(c1, -35) }
            ].forEach(s => {
                ctx.beginPath();
                ctx.moveTo(s.p[0], s.p[1]);
                ctx.quadraticCurveTo(s.p[2], s.p[3], s.p[4], s.p[5]);
                ctx.strokeStyle = s.c;
                ctx.lineWidth = s.w;
                ctx.lineCap = 'round';
                ctx.stroke();
            });
        }

        /* Eyes blink every few seconds — the little touch that makes her alive. */
        eyeOpenness() {
            const now = performance.now();
            const BLINK_MS = 220;

            if (this.blinkStart === null) {
                if (now < this.blinkAt) return 1;
                this.blinkStart = now;
            }

            const t = (now - this.blinkStart) / BLINK_MS;
            if (t >= 1) {
                this.blinkStart = null;
                this.blinkAt = now + 2600 + Math.random() * 3600;
                return 1;
            }
            return Math.abs(Math.cos(t * Math.PI));   // open → shut → open
        }

        drawEyes() {
            const { ctx, CX, CY } = this;
            const iris = this.applied.eyes || '#9C27B0';
            const open = this.eyeOpenness();

            [CX - 36, CX + 36].forEach(ex => {
                const ey = CY - 18;

                // Eyeshadow
                ctx.globalAlpha = 0.45;
                ctx.fillStyle = iris;
                ctx.beginPath();
                ctx.ellipse(ex, ey - 11, 23, 13, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;

                if (open < 0.25) {
                    ctx.strokeStyle = '#3B3355';
                    ctx.lineWidth = 3;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.arc(ex, ey - 4, 14, 0.25 * Math.PI, 0.75 * Math.PI);
                    ctx.stroke();
                } else {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.strokeStyle = '#555';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.ellipse(ex, ey, 20, 13 * open, 0, 0, Math.PI * 2);
                    ctx.fill(); ctx.stroke();

                    ctx.save();
                    ctx.beginPath();
                    ctx.ellipse(ex, ey, 20, 13 * open, 0, 0, Math.PI * 2);
                    ctx.clip();

                    ctx.fillStyle = iris;
                    ctx.beginPath();
                    ctx.arc(ex, ey, 9, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = '#1A1A2E';
                    ctx.beginPath();
                    ctx.arc(ex, ey, 5.5, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = '#FFFFFF';
                    ctx.beginPath();
                    ctx.arc(ex + 3, ey - 3, 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }

                // Lashes
                ctx.strokeStyle = '#3B3355';
                ctx.lineWidth = 1.6;
                ctx.lineCap = 'round';
                for (let j = -2; j <= 2; j++) {
                    const lx = ex + j * 5;
                    const off = j < 0 ? -3 : j > 0 ? 3 : 0;
                    ctx.beginPath();
                    ctx.moveTo(lx, ey - 13 * open);
                    ctx.lineTo(lx + off, ey - 20 - (j === 0 ? 2 : 0));
                    ctx.stroke();
                }
            });
        }

        drawCheeks() {
            const { ctx, CX, CY } = this;
            ctx.fillStyle = this.applied.cheeks || '#FFCDD2';
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.ellipse(CX - 60, CY + 22, 28, 16, -0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(CX + 60, CY + 22, 28, 16, 0.15, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        drawNose() {
            const { ctx, CX, CY } = this;
            ctx.fillStyle = '#E8A0B4';
            ctx.globalAlpha = 0.7;
            [-12, 12].forEach(dx => {
                ctx.beginPath();
                ctx.ellipse(CX + dx, CY + 48, 8, 5, 0, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
        }

        drawLips() {
            const { ctx, CX, CY } = this;
            ctx.fillStyle = this.applied.lips || '#F06292';
            ctx.beginPath();
            ctx.moveTo(CX - 26, CY + 68);
            ctx.quadraticCurveTo(CX - 12, CY + 60, CX, CY + 64);
            ctx.quadraticCurveTo(CX + 12, CY + 60, CX + 26, CY + 68);
            ctx.quadraticCurveTo(CX + 14, CY + 82, CX, CY + 84);
            ctx.quadraticCurveTo(CX - 14, CY + 82, CX - 26, CY + 68);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.beginPath();
            ctx.ellipse(CX - 9, CY + 66, 8, 4, -0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        drawBottles() {
            const { ctx, CX } = this;
            const base = this.applied.nails || '#FFCDD2';
            [CX - 96, CX - 32, CX + 32, CX + 96].forEach(x => {
                const cap = this.tint(base, 40);
                const neck = this.tint(base, 20);
                const line = this.tint(base, -50);

                ctx.fillStyle = base;
                ctx.strokeStyle = line;
                ctx.lineWidth = 1.5;
                this.rrect(x - 15, 400, 30, 52, 6);
                ctx.fill(); ctx.stroke();

                ctx.fillStyle = 'rgba(255,255,255,0.32)';
                ctx.beginPath();
                ctx.ellipse(x - 5, 418, 5, 14, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = neck;
                ctx.strokeStyle = line;
                this.rrect(x - 6, 387, 12, 14, 3);
                ctx.fill(); ctx.stroke();

                ctx.fillStyle = cap;
                ctx.strokeStyle = line;
                this.rrect(x - 9, 375, 18, 13, 5);
                ctx.fill(); ctx.stroke();

                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.beginPath();
                ctx.ellipse(x - 2, 379, 4, 2.5, 0, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        /* ── Sparkles ────────────────────────────────────────────────── */
        spawnSparkles(partId) {
            const { CX, CY, R } = this;
            const origins = {
                horn:   { x: CX, y: CY - R - 35 },
                mane:   { x: CX + R + 20, y: CY - 20 },
                eyes:   { x: CX, y: CY - 20 },
                cheeks: { x: CX, y: CY + 22 },
                lips:   { x: CX, y: CY + 70 },
                nails:  { x: CX, y: 428 }
            };
            const o = origins[partId];
            const palette = PALETTES[partId];

            for (let i = 0; i < 18; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1.5 + Math.random() * 3;
                this.sparkles.push({
                    x: o.x + (Math.random() - 0.5) * 70,
                    y: o.y + (Math.random() - 0.5) * 45,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 1.2,
                    life: 1,
                    decay: 0.018 + Math.random() * 0.024,
                    size: 4 + Math.random() * 9,
                    color: palette[Math.floor(Math.random() * palette.length)]
                });
            }
        }

        tickSparkles() {
            const ctx = this.ctx;
            this.sparkles = this.sparkles.filter(s => s.life > 0.02);
            this.sparkles.forEach(s => {
                s.x += s.vx;
                s.y += s.vy;
                s.vy += 0.07;
                s.life -= s.decay;

                ctx.save();
                ctx.globalAlpha = Math.max(0, s.life);
                ctx.translate(s.x, s.y);
                ctx.rotate(s.life * 9);
                ctx.fillStyle = s.color;
                ctx.beginPath();
                for (let i = 0; i < 4; i++) {
                    const a = (i / 4) * Math.PI * 2;
                    const b = a + Math.PI / 4;
                    if (i === 0) ctx.moveTo(Math.cos(a) * s.size, Math.sin(a) * s.size);
                    else ctx.lineTo(Math.cos(a) * s.size, Math.sin(a) * s.size);
                    ctx.lineTo(Math.cos(b) * s.size * 0.38, Math.sin(b) * s.size * 0.38);
                }
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            });
        }

        /* ── Helpers ─────────────────────────────────────────────────── */
        rrect(x, y, w, h, r) {
            const ctx = this.ctx;
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.arcTo(x + w, y, x + w, y + r, r);
            ctx.lineTo(x + w, y + h - r);
            ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
            ctx.lineTo(x + r, y + h);
            ctx.arcTo(x, y + h, x, y + h - r, r);
            ctx.lineTo(x, y + r);
            ctx.arcTo(x, y, x + r, y, r);
            ctx.closePath();
        }

        tint(hex, amount) {
            const n = parseInt(String(hex).replace('#', ''), 16);
            const clamp = v => Math.min(255, Math.max(0, v));
            return 'rgb(' + clamp((n >> 16) + amount) + ',' +
                clamp(((n >> 8) & 0xff) + amount) + ',' +
                clamp((n & 0xff) + amount) + ')';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => new Studio());
    } else {
        new Studio();
    }
})();
