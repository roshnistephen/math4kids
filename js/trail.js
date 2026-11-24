/* Unicorn Trail — draw a rainbow path through a pastel maze to guide the unicorn home. */
(function () {
    'use strict';
    const $ = (s, r) => (r || document).querySelector(s);
    const rnd = n => Math.floor(Math.random() * n);
    const pick = a => a[rnd(a.length)];
    const app = $('#app');
    const KEY = 'trail';

    const LEVELS = [
        { label: '🌸 Easy',         n: 5,  loops: 0.40, obstacles: 3,  sparkles: 2, things: ['🍄', '🌷', '🐌'] },
        { label: '🌈 Intermediate', n: 7,  loops: 0.18, obstacles: 7,  sparkles: 3, things: ['🍄', '🌧️', '🐌', '🐸'] },
        { label: '🔮 Hard',         n: 10, loops: 0.07, obstacles: 13, sparkles: 4, things: ['🍄', '🌧️', '🐌', '🐸', '🦔', '🕷️'] }
    ];
    const NAMES = { '🍄': 'mushroom', '🌷': 'tulip', '🐌': 'snail', '🌧️': 'rain cloud', '🐸': 'froggy', '🦔': 'hedgehog', '🕷️': 'spider' };

    /* ── Twinkles in the background ── */
    const tw = $('.twinkles');
    if (tw) for (let i = 0; i < 16; i++) {
        const s = document.createElement('i');
        s.style.cssText = '--x:' + rnd(100) + '%;--y:' + rnd(100) + '%;--s:' + (3 + rnd(5)) + 'px;--d:' + (3 + Math.random() * 4).toFixed(1) + 's;--dl:' + (Math.random() * 5).toFixed(1) + 's';
        tw.appendChild(s);
    }

    /* ── Maze maths ── */
    const N = 1, E = 2, S = 4, W = 8, DIRS = [N, E, S, W];
    const DX = { 1: 0, 2: 1, 4: 0, 8: -1 }, DY = { 1: -1, 2: 0, 4: 1, 8: 0 }, OPP = { 1: 4, 2: 8, 4: 1, 8: 2 };

    function makeWalls(n, loops) {
        const w = new Array(n * n).fill(15), seen = new Array(n * n).fill(false);
        const stack = [rnd(n * n)]; seen[stack[0]] = true;
        while (stack.length) {
            const c = stack[stack.length - 1], x = c % n, y = (c / n) | 0;
            const opts = DIRS.filter(d => { const nx = x + DX[d], ny = y + DY[d]; return nx >= 0 && ny >= 0 && nx < n && ny < n && !seen[ny * n + nx]; });
            if (!opts.length) { stack.pop(); continue; }
            const d = pick(opts), nc = (y + DY[d]) * n + x + DX[d];
            w[c] &= ~d; w[nc] &= ~OPP[d]; seen[nc] = true; stack.push(nc);
        }
        let k = Math.round(loops * n * n), guard = 0;
        while (k > 0 && guard++ < 600) {
            const c = rnd(n * n), x = c % n, y = (c / n) | 0, d = pick(DIRS), nx = x + DX[d], ny = y + DY[d];
            if (nx < 0 || ny < 0 || nx >= n || ny >= n || !(w[c] & d)) continue;
            w[c] &= ~d; w[ny * n + nx] &= ~OPP[d]; k--;
        }
        return w;
    }

    const neighbour = (n, c, d) => { const x = c % n + DX[d], y = ((c / n) | 0) + DY[d]; return x < 0 || y < 0 || x >= n || y >= n ? -1 : y * n + x; };

    function bfs(L, from, to, blocked) {
        const prev = new Array(L.n * L.n).fill(-2); prev[from] = -1;
        const q = [from];
        while (q.length) {
            const c = q.shift();
            if (c === to) { const p = []; for (let k = c; k !== -1; k = prev[k]) p.unshift(k); return p; }
            for (const d of DIRS) {
                if (L.walls[c] & d) continue;
                const nb = neighbour(L.n, c, d);
                if (nb < 0 || prev[nb] !== -2 || blocked[nb]) continue;
                prev[nb] = c; q.push(nb);
            }
        }
        return null;
    }

    function reachable(L) {
        const seen = new Set([L.start]), q = [L.start];
        while (q.length) {
            const c = q.shift();
            for (const d of DIRS) {
                if (L.walls[c] & d) continue;
                const nb = neighbour(L.n, c, d);
                if (nb < 0 || seen.has(nb) || L.obs[nb]) continue;
                seen.add(nb); q.push(nb);
            }
        }
        return [...seen];
    }

    function buildLevel(cfg) {
        const n = cfg.n, sx = rnd(2) * (n - 1), sy = rnd(2) * (n - 1);
        const L = { n, walls: makeWalls(n, cfg.loops), obs: {}, sparkles: [], start: sy * n + sx, home: (n - 1 - sy) * n + (n - 1 - sx) };
        const blocked = new Array(n * n).fill(false);
        let placed = 0, tries = 0;
        while (placed < cfg.obstacles && tries++ < 500) {
            const sol = bfs(L, L.start, L.home, blocked);
            const pool = Math.random() < 0.65 && sol.length > 2 ? sol.slice(1, -1) : null;
            const c = pool ? pick(pool) : rnd(n * n);
            if (c === L.start || c === L.home || blocked[c]) continue;
            blocked[c] = true;
            if (!bfs(L, L.start, L.home, blocked)) { blocked[c] = false; continue; }
            L.obs[c] = pick(cfg.things); placed++;
        }
        const shortest = new Set(bfs(L, L.start, L.home, blocked));
        const free = reachable(L).filter(c => c !== L.start && c !== L.home);
        const off = free.filter(c => !shortest.has(c)).sort(() => Math.random() - 0.5);
        const on = free.filter(c => shortest.has(c)).sort(() => Math.random() - 0.5);
        const pool = off.slice(0, Math.ceil(cfg.sparkles / 2)).concat(on, off.slice(Math.ceil(cfg.sparkles / 2)));
        L.sparkles = pool.slice(0, cfg.sparkles);
        return L;
    }

    /* ── UI scaffold ── */
    app.innerHTML = '';
    const setup = document.createElement('section'); setup.className = 'setup';
    const sw = document.createElement('div'); sw.className = 'switcher'; sw.setAttribute('role', 'radiogroup');
    LEVELS.forEach((l, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'switcher__btn'; b.textContent = l.label;
        b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(i === 0));
        b.onclick = () => { Kid.Sound.tap(); sw.querySelectorAll('button').forEach((x, k) => x.setAttribute('aria-checked', String(k === i))); levelIdx = i; newMaze(); };
        sw.appendChild(b);
    });
    setup.appendChild(sw);

    const trail = document.createElement('section'); trail.className = 'trail';
    trail.innerHTML =
        '<div class="trail__hud"><span class="chipbox">🦄 Maze <b data-maze>1</b></span><span class="chipbox">✨ Sparkles <b data-spark>0/0</b></span><span class="chipbox">🏰 Home <b data-solved>0</b> reached</span></div>' +
        '<p class="trail__msg" aria-live="polite"></p>' +
        '<div class="trail__board"><canvas tabindex="0" role="img" aria-label="Maze. Use the arrow keys, or drag from the unicorn to the castle, to draw a path."></canvas></div>' +
        '<div class="trail__tools">' +
        '<button class="btn btn--ghost" type="button" data-act="undo">↩️ Undo</button>' +
        '<button class="btn btn--ghost" type="button" data-act="clear">🧹 Start over</button>' +
        '<button class="btn btn--ghost" type="button" data-act="hint">💡 Hint</button>' +
        '<button class="btn btn--ghost" type="button" data-act="new">🔀 New maze</button></div>';
    app.append(setup, trail);

    const canvas = $('canvas', trail), ctx = canvas.getContext('2d');
    const msgEl = $('.trail__msg', trail), mazeEl = $('[data-maze]', trail), sparkEl = $('[data-spark]', trail), solvedEl = $('[data-solved]', trail);
    const reduced = !!(window.Kid && Kid.reduced);

    /* ── State ── */
    let levelIdx = 0, L, cfg, path, state, mazeNo = 0, solved = 0, hinted = false;
    let W0 = 320, m = 8, cs = 40, curve = null, dragging = false, lastPt = null;
    let run = null, wonAt = 0, hint = null, parts = [], shake = {}, faceS = 1, lastOops = 0, clock = 0;

    const say = t => { msgEl.textContent = t; };
    const cx = c => m + (c % L.n + 0.5) * cs;
    const cy = c => m + (((c / L.n) | 0) + 0.5) * cs;
    const sparkleCount = () => L.sparkles.filter(c => path.includes(c)).length;

    function newMaze() {
        cfg = LEVELS[levelIdx]; L = buildLevel(cfg);
        path = [L.start]; state = 'draw'; run = null; hint = null; hinted = false; parts = []; shake = {}; faceS = L.start % L.n > L.n / 2 ? -1 : 1;
        mazeNo++; mazeEl.textContent = mazeNo;
        say('Use the arrow keys ⬆️⬇️⬅️➡️ or drag to guide the unicorn to the castle 🏰');
        resize(); refresh();
    }

    function refresh() {
        sparkEl.textContent = sparkleCount() + '/' + L.sparkles.length;
        solvedEl.textContent = solved;
        curve = buildCurve(path);
    }

    function resize() {
        const w = Math.floor(canvas.parentElement.clientWidth - parseFloat(getComputedStyle(canvas.parentElement).paddingLeft) * 2) || 320;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        W0 = w; canvas.width = w * dpr; canvas.height = w * dpr; canvas.style.height = w + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        m = Math.max(6, w * 0.02); cs = (w - 2 * m) / L.n;
        curve = buildCurve(path);
    }
    if (window.ResizeObserver) new ResizeObserver(() => { if (L) resize(); }).observe(canvas.parentElement);
    else window.addEventListener('resize', () => { if (L) resize(); });

    /* ── Smooth rainbow curve through the chosen cells ── */
    function buildCurve(cells) {
        const c = cells.map(id => ({ x: cx(id), y: cy(id) }));
        const pts = [c[0]];
        if (c.length === 2) pts.push(c[1]);
        else if (c.length > 2) {
            let p = c[0];
            for (let i = 1; i < c.length - 1; i++) {
                const e = { x: (c[i].x + c[i + 1].x) / 2, y: (c[i].y + c[i + 1].y) / 2 };
                for (let s = 1; s <= 8; s++) {
                    const t = s / 8, u = 1 - t;
                    pts.push({ x: u * u * p.x + 2 * u * t * c[i].x + t * t * e.x, y: u * u * p.y + 2 * u * t * c[i].y + t * t * e.y });
                }
                p = e;
            }
            pts.push(c[c.length - 1]);
        }
        const cum = [0];
        for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
        return { pts, cum, total: cum[cum.length - 1] };
    }

    function pointAt(cv, d) {
        const { pts, cum } = cv;
        if (pts.length < 2 || d <= 0) return { x: pts[0].x, y: pts[0].y, dx: 1, dy: 0, i: 0 };
        let i = 1; while (i < pts.length - 1 && cum[i] < d) i++;
        const seg = cum[i] - cum[i - 1] || 1, t = Math.min(1, (d - cum[i - 1]) / seg);
        return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t, dx: pts[i].x - pts[i - 1].x, dy: pts[i].y - pts[i - 1].y, i: i - 1 + t };
    }

    function partial(cv, d) {
        const out = [];
        for (let i = 0; i < cv.pts.length && cv.cum[i] <= d; i++) out.push(cv.pts[i]);
        const e = pointAt(cv, d); out.push({ x: e.x, y: e.y });
        return out;
    }

    /* ── Drawing the path ── */
    function cellAt(px, py) {
        const x = Math.floor((px - m) / cs), y = Math.floor((py - m) / cs);
        return x < 0 || y < 0 || x >= L.n || y >= L.n ? -1 : y * L.n + x;
    }

    function step(c) {
        if (state !== 'draw' || c < 0) return;
        const last = path[path.length - 1];
        if (c === last) return;
        const dx = (c % L.n) - (last % L.n), dy = ((c / L.n) | 0) - ((last / L.n) | 0);
        if (Math.abs(dx) + Math.abs(dy) !== 1) return;
        if (path.length > 1 && c === path[path.length - 2]) { path.pop(); hint = null; refresh(); return; }
        if (path.includes(c)) return;
        const d = dx === 1 ? E : dx === -1 ? W : dy === 1 ? S : N;
        if (L.walls[last] & d) return;
        if (L.obs[c]) {
            shake[c] = 0.45;
            const now = performance.now();
            if (now - lastOops > 700) { lastOops = now; Kid.Sound.oops(); say('Oops! A ' + NAMES[L.obs[c]] + ' ' + L.obs[c] + ' is in the way — try another way round!'); }
            return;
        }
        path.push(c); hint = null; refresh();
        if (L.sparkles.includes(c)) { Kid.Sound.pop(); say(pick(['✨ Sparkle collected!', '✨ Ooh, shiny!', '✨ Magic dust!'])); burst(cx(c), cy(c), 10); }
        if (c === L.home) go();
    }

    function pointerPath(x, y) {
        if (lastPt) {
            const dist = Math.hypot(x - lastPt.x, y - lastPt.y), n = Math.max(1, Math.ceil(dist / (cs * 0.2)));
            for (let i = 1; i <= n; i++) step(cellAt(lastPt.x + (x - lastPt.x) * i / n, lastPt.y + (y - lastPt.y) * i / n));
        } else step(cellAt(x, y));
        lastPt = { x, y };
    }

    const local = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * W0 / r.width, y: (e.clientY - r.top) * W0 / r.width }; };

    canvas.addEventListener('pointerdown', e => {
        if (state !== 'draw') return;
        const p = local(e), c = cellAt(p.x, p.y), idx = path.indexOf(c);
        const last = path[path.length - 1];
        if (idx >= 0) { path.length = idx + 1; hint = null; refresh(); }
        else if (Math.abs((c % L.n) - (last % L.n)) + Math.abs(((c / L.n) | 0) - ((last / L.n) | 0)) !== 1) { say('Start at the unicorn 🦄 or the end of your rainbow 🌈'); return; }
        dragging = true; lastPt = { x: cx(path[path.length - 1]), y: cy(path[path.length - 1]) };
        canvas.setPointerCapture(e.pointerId); Kid.Sound.tap();
        pointerPath(p.x, p.y); e.preventDefault();
    });
    canvas.addEventListener('pointermove', e => { if (dragging) { const p = local(e); pointerPath(p.x, p.y); } });
    const endDrag = () => { dragging = false; lastPt = null; if (state === 'draw' && path.length > 1) say('Keep going — you can drag from the end of the rainbow! 🌈'); };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    // Arrow keys work anywhere on the page (no need to click the maze first)
    document.addEventListener('keydown', e => {
        if (document.querySelector('.modal') || e.ctrlKey || e.metaKey || e.altKey) return;
        const map = { ArrowUp: N, ArrowRight: E, ArrowDown: S, ArrowLeft: W, w: N, d: E, s: S, a: W };
        const d = map[e.key];
        if (d) { e.preventDefault(); step(neighbour(L.n, path[path.length - 1], d)); }
        else if (e.key === 'Backspace' || e.key === 'z') { e.preventDefault(); act('undo'); }
        else if (e.key === 'Escape') act('clear');
    });

    /* ── Buttons ── */
    function act(a) {
        if (a === 'new') { Kid.Sound.tap(); newMaze(); return; }
        if (state !== 'draw') return;
        Kid.Sound.tap();
        if (a === 'undo') { if (path.length > 1) path.pop(); hint = null; refresh(); }
        else if (a === 'clear') { path = [L.start]; hint = null; refresh(); say('Fresh start! Draw a new path ✨'); }
        else if (a === 'hint') {
            const blocked = new Array(L.n * L.n).fill(false);
            Object.keys(L.obs).forEach(k => { blocked[k] = true; });
            path.slice(0, -1).forEach(c => { blocked[c] = true; });
            const sol = bfs(L, path[path.length - 1], L.home, blocked);
            if (!sol) { say('Hmm, this way is stuck. Undo a few steps! ↩️'); return; }
            hinted = true; hint = { cells: sol.slice(1, 5), until: clock + 4 };
            say('Follow the twinkling dots! 💫');
        }
    }
    trail.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) act(b.dataset.act); });

    /* ── Gallop & win ── */
    function go() {
        state = 'run'; dragging = false; lastPt = null; hint = null;
        curve = buildCurve(path);
        run = { d: 0, t: 0, passed: new Set(), emit: 0 };
        say(pick(['Off we gallop! 🌈', 'Wheee! Here we go! 💨', 'Home sweet home, here I come! 🏰']));
    }

    function win() {
        state = 'won'; wonAt = clock;
        const got = sparkleCount(), all = got === L.sparkles.length;
        const earned = 1 + (hinted ? 0 : 1) + (all ? 1 : 0);
        solved++; refresh();
        Kid.Stars.add(KEY, earned); Kid.Sound.play('correct'); Kid.confetti(50);
        for (let i = 0; i < 14; i++) burst(cx(L.home) + (Math.random() - 0.5) * cs, cy(L.home) - Math.random() * cs * 0.4, 1, 'heart');
        say(pick(['Hooray! The unicorn is home! 🏰💖', 'Safe and sound! 🦄💖', 'You did it! What a magical path! ✨']));
        setTimeout(() => showModal(earned, got), reduced ? 700 : 1700);
    }

    function showModal(earned, got) {
        const mo = document.createElement('div'); mo.className = 'modal';
        mo.innerHTML = '<div class="modal__card"><p class="modal__emoji">🦄🏰</p><h2 class="modal__title">Unicorn is home!</h2>' +
            '<p class="modal__text">' + (earned === 3 ? 'A perfect magical journey!' : 'Beautiful path! Collect every sparkle without hints for 3 stars.') + '</p>' +
            '<div class="result__score"><div class="result__stat"><b>' + '⭐'.repeat(earned) + '</b><span>Stars</span></div>' +
            '<div class="result__stat"><b>' + got + '/' + L.sparkles.length + '</b><span>Sparkles</span></div>' +
            '<div class="result__stat"><b>' + solved + '</b><span>Mazes solved</span></div></div>' +
            '<div class="modal__actions"><button class="btn btn--primary" type="button">Next maze 🌈</button>' +
            '<a class="btn btn--ghost" href="index.html">Back to menu 🏠</a></div></div>';
        document.body.appendChild(mo);
        $('button', mo).onclick = () => { mo.remove(); Kid.Sound.tap(); newMaze(); };
    }

    /* ── Particles ── */
    const PASTELS = ['#FF9EC4', '#FFC48F', '#FFE680', '#A8F0D6', '#9ED8FF', '#C9B2FF'];
    function burst(x, y, n, type) {
        if (reduced) n = Math.ceil(n / 3);
        for (let i = 0; i < n; i++) {
            const a = Math.random() * 6.283, sp = type === 'heart' ? 20 + Math.random() * 40 : 40 + Math.random() * 90;
            parts.push({ x, y, vx: Math.cos(a) * sp, vy: type === 'heart' ? -30 - Math.random() * 60 : Math.sin(a) * sp - 20, life: 0, max: 0.7 + Math.random() * 0.8, type: type || 'spark', color: pick(PASTELS), size: 3 + Math.random() * 5 });
        }
    }

    /* ── Frame ── */
    let lastTs = 0;
    function frame(ts) {
        const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0); lastTs = ts; clock += dt;
        if (L) { update(dt); draw(); }
        requestAnimationFrame(frame);
    }

    function update(dt) {
        for (const k in shake) if ((shake[k] -= dt) <= 0) delete shake[k];
        parts = parts.filter(p => { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.type === 'heart' ? -10 : 90) * dt; return p.life < p.max; });
        if (state === 'run') {
            run.t += dt;
            const speed = cs * 5.2 * Math.min(1, 0.25 + run.t * 1.6);
            run.d = Math.min(curve.total, run.d + speed * dt);
            const pt = pointAt(curve, run.d);
            if (Math.abs(pt.dx) > 0.2) faceS += ((pt.dx > 0 ? 1 : -1) - faceS) * Math.min(1, dt * 14);
            run.emit -= dt;
            if (run.emit <= 0) { run.emit = reduced ? 0.12 : 0.04; burst(pt.x - Math.sign(pt.dx || 1) * cs * 0.25, pt.y + cs * 0.1, 1); }
            const frac = run.d / (curve.total || 1);
            path.forEach((c, i) => { if (!run.passed.has(c) && frac >= i / Math.max(1, path.length - 1) - 0.01) { run.passed.add(c); if (L.sparkles.includes(c)) { Kid.Sound.pop(); burst(cx(c), cy(c), 14); } } });
            if (run.d >= curve.total) win();
        }
    }

    /* ── Rendering ── */
    const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    function emoji(ch, x, y, size) { ctx.font = size + 'px ' + EMOJI; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ch, x, y); }
    function star4(x, y, r) {
        ctx.beginPath();
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, rr = i % 2 ? r * 0.35 : r; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
        ctx.closePath(); ctx.fill();
    }
    function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }

    function ribbon(pts, wMul) {
        if (pts.length < 2) return;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const bands = [['#FF9EC4', 1], ['#FFC48F', 0.78], ['#FFEE9E', 0.58], ['#A8F0D6', 0.4], ['#9ED8FF', 0.22]];
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        for (const [col, k] of bands) { ctx.strokeStyle = col; ctx.lineWidth = cs * 0.38 * k * (wMul || 1); ctx.stroke(); }
    }

    function draw() {
        const t = clock, size = W0, n = L.n;
        ctx.clearRect(0, 0, size, size);
        ctx.save(); rr(0, 0, size, size, 22); ctx.clip();
        const bg = ctx.createLinearGradient(0, 0, size, size); bg.addColorStop(0, '#FFF1F8'); bg.addColorStop(0.5, '#F4EEFF'); bg.addColorStop(1, '#E9F5FF');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size);
        for (let c = 0; c < n * n; c++) {
            const x = c % n, y = (c / n) | 0;
            ctx.fillStyle = (x + y) % 2 ? 'rgba(255,214,236,.34)' : 'rgba(214,200,255,.30)';
            ctx.fillRect(m + x * cs, m + y * cs, cs, cs);
        }

        // Home glow + start pad
        const hx = cx(L.home), hy = cy(L.home), pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
        const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, cs * (0.8 + pulse * 0.12));
        g.addColorStop(0, 'rgba(255,236,150,.95)'); g.addColorStop(1, 'rgba(255,200,230,0)');
        ctx.fillStyle = g; ctx.fillRect(hx - cs, hy - cs, cs * 2, cs * 2);
        ctx.fillStyle = 'rgba(190,160,255,.25)'; ctx.beginPath(); ctx.arc(cx(L.start), cy(L.start), cs * 0.42, 0, 6.283); ctx.fill();

        // Rainbow path
        const showD = state === 'run' ? run.d : curve.total;
        if (path.length > 1) ribbon(state === 'run' ? partial(curve, showD) : curve.pts);

        // Sparkles
        L.sparkles.forEach((c, i) => {
            const passed = state === 'run' ? run.passed.has(c) : false;
            if (passed) return;
            const on = path.includes(c), k = 1 + Math.sin(t * 4 + i) * 0.1;
            if (on) { ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(cx(c), cy(c), cs * 0.3, 0, 6.283); ctx.fill(); }
            ctx.fillStyle = '#FFD84D'; ctx.save(); ctx.shadowColor = 'rgba(255,200,60,.9)'; ctx.shadowBlur = 12;
            star4(cx(c), cy(c), cs * 0.27 * k); ctx.restore();
            ctx.fillStyle = '#fff'; star4(cx(c) + cs * 0.12, cy(c) - cs * 0.14, cs * 0.07);
        });

        // Walls
        const wp = new Path2D();
        for (let c = 0; c < n * n; c++) {
            const x = c % n, y = (c / n) | 0, x0 = m + x * cs, y0 = m + y * cs, w = L.walls[c];
            if (w & N) { wp.moveTo(x0, y0); wp.lineTo(x0 + cs, y0); }
            if (w & W) { wp.moveTo(x0, y0); wp.lineTo(x0, y0 + cs); }
            if (x === n - 1 && w & E) { wp.moveTo(x0 + cs, y0); wp.lineTo(x0 + cs, y0 + cs); }
            if (y === n - 1 && w & S) { wp.moveTo(x0, y0 + cs); wp.lineTo(x0 + cs, y0 + cs); }
        }
        const lw = Math.min(13, cs * 0.15);
        ctx.lineCap = 'round'; ctx.strokeStyle = '#C3AEF7'; ctx.lineWidth = lw; ctx.stroke(wp);
        ctx.strokeStyle = '#F3EAFF'; ctx.lineWidth = lw * 0.4; ctx.stroke(wp);

        // Hint dots
        if (hint && clock < hint.until) hint.cells.forEach((c, i) => {
            const a = 0.5 + 0.5 * Math.sin(t * 7 - i * 1.2);
            ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + a * 0.5) + ')'; ctx.save(); ctx.shadowColor = '#B38CFF'; ctx.shadowBlur = 14;
            ctx.beginPath(); ctx.arc(cx(c), cy(c), cs * (0.11 + a * 0.06), 0, 6.283); ctx.fill(); ctx.restore();
        });

        // Home castle
        const bob = Math.sin(t * 2) * cs * 0.02;
        ctx.fillStyle = '#000'; emoji('🏰', hx, hy + bob - cs * 0.02, cs * (state === 'won' ? 0.78 + Math.abs(Math.sin((t - wonAt) * 5)) * 0.06 : 0.72));

        // Cute obstacles
        for (const k in L.obs) {
            const c = +k, sh = shake[c] ? Math.sin(shake[c] * 60) * cs * 0.06 * (shake[c] / 0.45) : 0;
            ctx.fillStyle = 'rgba(120,90,200,.16)'; ctx.beginPath(); ctx.ellipse(cx(c), cy(c) + cs * 0.27, cs * 0.24, cs * 0.07, 0, 0, 6.283); ctx.fill();
            ctx.fillStyle = '#000'; emoji(L.obs[c], cx(c) + sh, cy(c) + Math.sin(t * 2.3 + c) * cs * 0.025, cs * 0.58);
        }

        // Unicorn
        let ux, uy, moving = false, phase = 0, hop = 0;
        if (state === 'run') { const p = pointAt(curve, run.d); ux = p.x; uy = p.y; moving = true; phase = run.d / cs * 3.4; }
        else if (state === 'won') { ux = hx; uy = hy + cs * 0.1; hop = 1; }
        else { ux = cx(L.start); uy = cy(L.start); }
        drawUnicorn(ux, uy, t, moving, phase, hop);

        // Lost bubble
        if (state === 'draw') {
            const bx = cx(L.start), by = cy(L.start) - cs * 0.62 + Math.sin(t * 2.5) * 2, fs = Math.max(11, cs * 0.2);
            ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.strokeStyle = '#D9C8FF'; ctx.lineWidth = 2;
            const bw = fs * 3.4, bh = fs * 1.7, bxx = Math.min(Math.max(bx - bw / 2, 4), size - bw - 4);
            rr(bxx, by - bh, bw, bh, bh / 2); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#574B87'; ctx.font = '600 ' + fs + 'px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('Help! 🏰?', bxx + bw / 2, by - bh / 2 + 1);
        }

        // Particles
        parts.forEach(p => {
            const a = 1 - p.life / p.max; ctx.globalAlpha = Math.max(0, a);
            if (p.type === 'heart') { ctx.fillStyle = '#000'; emoji('💖', p.x, p.y, cs * 0.3); }
            else { ctx.fillStyle = p.color; star4(p.x, p.y, p.size * (0.5 + a * 0.6)); }
            ctx.globalAlpha = 1;
        });
        ctx.restore();
    }

    function drawUnicorn(x, y, t, moving, phase, hop) {
        const u = cs / 135;
        ctx.save();
        ctx.fillStyle = 'rgba(120,90,200,.18)'; ctx.beginPath(); ctx.ellipse(x, y + cs * 0.36, cs * 0.3, cs * 0.06, 0, 0, 6.283); ctx.fill();
        const by = moving ? -Math.abs(Math.sin(phase)) * 9 : hop ? -Math.abs(Math.sin((t - wonAt) * 6)) * 20 : Math.sin(t * 3) * 1.8;
        ctx.translate(x, y + cs * 0.34 + by * u); ctx.scale(u * faceS, u);
        const outline = '#E0CCFF';
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';

        // tail
        const sway = Math.sin(t * (moving ? 12 : 4)) * (moving ? 9 : 4);
        [0, 1, 2, 3, 4].forEach(i => {
            ctx.strokeStyle = PASTELS[i]; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(-28, -42);
            ctx.bezierCurveTo(-48, -62 + i * 3 + sway, -62 + i * 2, -38 + i * 4 + sway, -50 + i * 2, -14 + i * 4);
            ctx.stroke();
        });

        const leg = (lx, ang) => {
            ctx.save(); ctx.translate(lx, -20); ctx.rotate(ang);
            ctx.fillStyle = '#fff'; ctx.strokeStyle = outline; ctx.lineWidth = 2; rr(-6, 0, 12, 20, 6); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#FFC94D'; rr(-6, 14, 12, 6, 3); ctx.fill();
            ctx.restore();
        };
        const sw = moving ? 0.8 : 0;
        leg(-20, Math.sin(phase + Math.PI) * sw); leg(-6, Math.sin(phase) * sw);

        // body
        const bg = ctx.createLinearGradient(0, -58, 0, -10); bg.addColorStop(0, '#FFFFFF'); bg.addColorStop(1, '#FFE0F0');
        ctx.fillStyle = bg; ctx.strokeStyle = outline; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(0, -34, 35, 24, 0, 0, 6.283); ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,170,210,.35)'; ctx.beginPath(); ctx.arc(-14, -34, 7, 0, 6.283); ctx.fill();

        leg(12, Math.sin(phase + Math.PI * 0.5) * sw); leg(26, Math.sin(phase + Math.PI * 1.5) * sw);

        // mane peeking out behind the head
        [[8, -86], [2, -74], [0, -62], [3, -50], [9, -40]].forEach(([mx, my], i) => {
            ctx.fillStyle = PASTELS[i]; ctx.beginPath(); ctx.arc(mx + Math.sin(t * 5 + i) * (moving ? 3 : 1), my, 10, 0, 6.283); ctx.fill();
        });

        // ear (behind head)
        ctx.fillStyle = '#fff'; ctx.strokeStyle = outline; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(12, -78); ctx.lineTo(13, -100); ctx.lineTo(27, -85); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#FFB5D5'; ctx.beginPath(); ctx.moveTo(16, -82); ctx.lineTo(16, -94); ctx.lineTo(23, -86); ctx.closePath(); ctx.fill();

        // head + snout
        ctx.fillStyle = '#fff'; ctx.strokeStyle = outline; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(30, -62, 23, 0, 6.283); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#FFD3E6'; ctx.beginPath(); ctx.ellipse(46, -54, 10, 8, 0, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#E58BB4'; ctx.beginPath(); ctx.arc(49, -56, 1.8, 0, 6.283); ctx.fill();

        // horn
        const hg = ctx.createLinearGradient(34, -84, 46, -118); hg.addColorStop(0, '#FFE27A'); hg.addColorStop(1, '#FFB627');
        ctx.fillStyle = hg; ctx.strokeStyle = '#F2A21A'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(29, -83); ctx.lineTo(42, -80); ctx.lineTo(41, -118); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(32, -93); ctx.lineTo(41, -97); ctx.moveTo(34, -103); ctx.lineTo(41, -107); ctx.stroke();

        // forelock
        ctx.fillStyle = '#FF9EC4'; ctx.beginPath(); ctx.arc(22, -82, 8, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#FFE680'; ctx.beginPath(); ctx.arc(15, -76, 6, 0, 6.283); ctx.fill();

        // face
        const blink = (t % 3.2) > 3.05 ? 0.15 : 1;
        ctx.fillStyle = '#3B2B6B'; ctx.beginPath(); ctx.ellipse(37, -64, 4.2, 5.4 * blink, 0, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(38.4, -66, 1.6, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(255,130,175,.6)'; ctx.beginPath(); ctx.ellipse(33, -50, 5.5, 3.6, 0, 0, 6.283); ctx.fill();
        ctx.strokeStyle = '#B5679A'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(45, -50, 4, 0.3, 1.9); ctx.stroke();
        ctx.restore();
    }

    requestAnimationFrame(frame);
    newMaze();
})();
