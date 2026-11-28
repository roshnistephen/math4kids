/* Unicorn Trail — Rainbow Maze Adventure.
   30 hand-seeded mazes in 3 enchanted worlds. Draw a rainbow path, collect sparkles, dodge cute obstacles, earn stars. */
(function () {
    'use strict';
    const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
    const RK = window.RK || {};
    const A = RK.Audio || { state: { music: true, sfx: true }, play() {}, stop() {}, sfx() {}, unlock() {}, setMusic() {}, setSfx() {}, pause() {}, resume() {} };
    const app = $('#app');
    const IMGDIR = 'images/trail/';

    /* ── Worlds ── */
    const PER = 10;
    const WORLDS = [
        {
            id: 'meadow', name: 'Sunny Meadow', icon: '🌸', music: 'dawn', tint: '#FFB3D6',
            sizes: [5, 5, 5, 6, 6, 6, 6, 7, 7, 7], loops: [0.5, 0.45, 0.4, 0.38, 0.34, 0.3, 0.28, 0.25, 0.22, 0.2], obs: [2, 3, 3, 4, 4, 5, 5, 6, 6, 7], sparkles: [2, 2, 3, 3, 3, 4, 4, 4, 5, 5],
            things: ['tulip', 'snail', 'mushroom'],
            floor: ['#D8F7B8', '#C6EFA0'], wall: { dark: '#2F7F4B', base: '#4FB86C', hi: '#9BE6A8' }, decal: 'flowers',
            quote: 'Welcome to Sunny Meadow! 🌸'
        },
        {
            id: 'woods', name: 'Enchanted Woods', icon: '🍄', music: 'forest', tint: '#B8F0D8',
            sizes: [7, 7, 8, 8, 8, 8, 9, 9, 9, 9], loops: [0.2, 0.18, 0.16, 0.15, 0.14, 0.12, 0.12, 0.1, 0.09, 0.08], obs: [6, 6, 7, 8, 8, 9, 10, 11, 11, 12], sparkles: [3, 3, 4, 4, 4, 5, 5, 5, 6, 6],
            things: ['mushroom', 'frog', 'hedgehog', 'spider'],
            floor: ['#BDEBDD', '#A9DFCC'], wall: { dark: '#5B3A26', base: '#9A6A47', hi: '#D2A07A' }, decal: 'leaves',
            quote: 'Welcome to the Enchanted Woods! 🍄'
        },
        {
            id: 'crystal', name: 'Crystal Caves', icon: '💎', music: 'canyon', tint: '#C9D6FF',
            sizes: [8, 8, 9, 9, 9, 9, 9, 9, 10, 10], loops: [0.1, 0.09, 0.08, 0.08, 0.07, 0.07, 0.06, 0.06, 0.05, 0.05], obs: [9, 10, 11, 12, 12, 13, 14, 14, 15, 16], sparkles: [4, 4, 5, 5, 5, 6, 6, 6, 7, 7],
            things: ['raincloud', 'spider', 'hedgehog', 'frog'],
            floor: ['#E3DBFF', '#D2C7FA'], wall: { dark: '#3F57C4', base: '#7B98F2', hi: '#E1ECFF' }, decal: 'crystals',
            quote: 'Welcome to the Crystal Caves! 💎'
        }
    ];
    const NAMES = { tulip: 'tulip', snail: 'snail', mushroom: 'mushroom', frog: 'froggy', hedgehog: 'hedgehog', spider: 'spider', raincloud: 'rain cloud' };
    const TOTAL = WORLDS.length * PER;
    const SPARK = 10, PENALTY = 5, FINISH = 20;

    /* ── Saved progress and settings (safe even if storage is blocked) ── */
    const SAVE_KEY = 'lokakids.trail.v2';
    let save = { stars: new Array(TOTAL).fill(0), best: new Array(TOTAL).fill(0), s: { music: true, sfx: true, vibe: true, pad: false, unlockAll: false } };
    try { const d = JSON.parse(localStorage.getItem(SAVE_KEY)); if (d && Array.isArray(d.stars)) save = { stars: d.stars.concat(new Array(TOTAL).fill(0)).slice(0, TOTAL), best: (d.best || []).concat(new Array(TOTAL).fill(0)).slice(0, TOTAL), s: Object.assign(save.s, d.s || {}) }; } catch (e) { /* ignore */ }
    const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } };
    const unlocked = g => g === 0 || save.stars[g - 1] > 0 || save.s.unlockAll;
    const totalStars = () => save.stars.reduce((a, b) => a + b, 0);
    const vibrate = p => { try { if (save.s.vibe && navigator.vibrate) navigator.vibrate(p); } catch (e) { /* ignore */ } };
    if (RK.Audio) { A.setMusic(save.s.music); A.setSfx(save.s.sfx); }

    /* ── Artwork ── */
    const IMG = {};
    ['unicorn', 'castle', 'star', 'heart', 'mushroom', 'tulip', 'snail', 'frog', 'hedgehog', 'spider', 'raincloud', 'rainbow'].forEach(n => { const i = new Image(); i.src = IMGDIR + n + '.png'; IMG[n] = i; });

    /* ── Seeded random so every level is the same every time ── */
    const mulberry = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

    /* ── Maze maths ── */
    const N = 1, E = 2, S = 4, W = 8, DIRS = [N, E, S, W];
    const DX = { 1: 0, 2: 1, 4: 0, 8: -1 }, DY = { 1: -1, 2: 0, 4: 1, 8: 0 }, OPP = { 1: 4, 2: 8, 4: 1, 8: 2 };

    function makeWalls(n, loops, rng) {
        const pick = a => a[Math.floor(rng() * a.length)];
        const w = new Array(n * n).fill(15), seen = new Array(n * n).fill(false);
        const stack = [Math.floor(rng() * n * n)]; seen[stack[0]] = true;
        while (stack.length) {
            const c = stack[stack.length - 1], x = c % n, y = (c / n) | 0;
            const opts = DIRS.filter(d => { const nx = x + DX[d], ny = y + DY[d]; return nx >= 0 && ny >= 0 && nx < n && ny < n && !seen[ny * n + nx]; });
            if (!opts.length) { stack.pop(); continue; }
            const d = pick(opts), nc = (y + DY[d]) * n + x + DX[d];
            w[c] &= ~d; w[nc] &= ~OPP[d]; seen[nc] = true; stack.push(nc);
        }
        let k = Math.round(loops * n * n), guard = 0;
        while (k > 0 && guard++ < 800) {
            const c = Math.floor(rng() * n * n), x = c % n, y = (c / n) | 0, d = pick(DIRS), nx = x + DX[d], ny = y + DY[d];
            if (nx < 0 || ny < 0 || nx >= n || ny >= n || !(w[c] & d)) continue;
            w[c] &= ~d; w[ny * n + nx] &= ~OPP[d]; k--;
        }
        return w;
    }
    const neighbour = (n, c, d) => { const x = c % n + DX[d], y = ((c / n) | 0) + DY[d]; return x < 0 || y < 0 || x >= n || y >= n ? -1 : y * n + x; };

    function bfs(L, from, to, blocked, maxLen) {
        const prev = new Array(L.n * L.n).fill(-2), dist = new Array(L.n * L.n).fill(0); prev[from] = -1;
        const q = [from];
        while (q.length) {
            const c = q.shift();
            if (c === to) { const p = []; for (let k = c; k !== -1; k = prev[k]) p.unshift(k); return p; }
            if (maxLen !== undefined && dist[c] >= maxLen) continue;
            for (const d of DIRS) {
                if (L.walls[c] & d) continue;
                const nb = neighbour(L.n, c, d);
                if (nb < 0 || prev[nb] !== -2 || blocked[nb]) continue;
                prev[nb] = c; dist[nb] = dist[c] + 1; q.push(nb);
            }
        }
        return null;
    }
    function reachable(L) {
        const seen = new Set([L.start]), q = [L.start];
        while (q.length) { const c = q.shift(); for (const d of DIRS) { if (L.walls[c] & d) continue; const nb = neighbour(L.n, c, d); if (nb < 0 || seen.has(nb) || L.obs[nb]) continue; seen.add(nb); q.push(nb); } }
        return [...seen];
    }

    function buildLevel(g) {
        const wi = Math.floor(g / PER), li = g % PER, Wd = WORLDS[wi], rng = mulberry(g * 7919 + 101), n = Wd.sizes[li];
        const pick = a => a[Math.floor(rng() * a.length)];
        const sx = Math.floor(rng() * 2) * (n - 1), sy = Math.floor(rng() * 2) * (n - 1);
        const L = { g, wi, li, W: Wd, n, walls: makeWalls(n, Wd.loops[li], rng), obs: {}, sparkles: [], start: sy * n + sx, home: (n - 1 - sy) * n + (n - 1 - sx) };
        const blocked = new Array(n * n).fill(false);
        let placed = 0, tries = 0;
        while (placed < Wd.obs[li] && tries++ < 600) {
            const sol = bfs(L, L.start, L.home, blocked);
            const pool = rng() < 0.65 && sol.length > 2 ? sol.slice(1, -1) : null;
            const c = pool ? pick(pool) : Math.floor(rng() * n * n);
            if (c === L.start || c === L.home || blocked[c]) continue;
            blocked[c] = true;
            if (!bfs(L, L.start, L.home, blocked)) { blocked[c] = false; continue; }
            L.obs[c] = pick(Wd.things); placed++;
        }
        L.solution = bfs(L, L.start, L.home, blocked);
        const shortest = new Set(L.solution);
        const free = reachable(L).filter(c => c !== L.start && c !== L.home);
        const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
        const off = shuffle(free.filter(c => !shortest.has(c))), on = shuffle(free.filter(c => shortest.has(c)));
        const cnt = Wd.sparkles[li], half = Math.ceil(cnt / 2);
        L.sparkles = off.slice(0, half).concat(on, off.slice(half)).slice(0, cnt);
        L.max = L.sparkles.length * SPARK + FINISH;
        return L;
    }

    /* ── Tiny helpers for screens ── */
    let screen = 'title', mapWorld = 0, mazeG = 0;
    function setScreen(name) { screen = name; document.body.dataset.screen = name; }
    function modal(html, cls) {
        closeModal();
        const m = document.createElement('div'); m.className = 'modal ' + (cls || ''); m.innerHTML = '<div class="modal__card">' + html + '</div>';
        document.body.appendChild(m); requestAnimationFrame(() => m.classList.add('in'));
        return m;
    }
    function closeModal() { $$('.modal').forEach(m => m.remove()); }
    const starRow = (n, big) => '<div class="starsrow' + (big ? ' big' : '') + '">' + [0, 1, 2].map(i => '<i class="' + (i < n ? 'on' : '') + '" style="--i:' + i + '">★</i>').join('') + '</div>';

    /* ══ Title ══ */
    function showTitle() {
        stopGame(); closeModal(); setScreen('title'); document.body.dataset.world = 'meadow';
        app.innerHTML =
            '<section class="scr scr--title">' +
            '<div class="topline"><a class="ibtn" href="index.html" aria-label="Home">🏠</a><span class="sp"></span><span class="chip" title="Stars">⭐ <b>' + totalStars() + '</b><small>/' + TOTAL * 3 + '</small></span><button class="ibtn" data-act="settings" aria-label="Settings">⚙️</button></div>' +
            '<div class="hero"><div class="hero__glow"></div><img class="hero__rb" src="' + IMGDIR + 'rainbow.png" alt=""><img class="hero__uni" src="' + IMGDIR + 'unicorn.png" alt="">' +
            '<h1 class="logo"><span>Unicorn</span><b>Trail</b></h1><p class="tag">Guide the lost unicorn home!</p></div>' +
            '<div class="menu"><button class="btn-big" data-act="play">' + (totalStars() > 0 ? 'Continue' : 'Play') + ' ▶</button>' +
            '<div class="row"><button class="btn-sub" data-act="map">🗺️ Levels</button><button class="btn-sub" data-act="how">❓ How to play</button></div>' +
            '<button class="btn-sub" id="installBtn" data-act="install" hidden>📲 Install app</button></div>' +
            '<p class="foot">by LokaKids · <a href="privacy.html">Privacy</a></p></section>';
        A.play('title'); syncInstall();
    }
    function syncInstall() { const b = $('#installBtn'); if (b) b.hidden = !(RK.pwa && RK.pwa.canInstall); }
    document.addEventListener('pwa-can-install', syncInstall); document.addEventListener('pwa-installed', syncInstall);

    /* ══ Level map ══ */
    function showMap(w) {
        stopGame(); closeModal(); setScreen('map');
        mapWorld = w === undefined ? mapWorld : w; const Wd = WORLDS[mapWorld];
        document.body.dataset.world = Wd.id;
        const base = mapWorld * PER, done = save.stars.slice(base, base + PER).filter(s => s > 0).length;
        app.innerHTML =
            '<section class="scr scr--map">' +
            '<div class="topline"><button class="ibtn" data-act="title" aria-label="Back">◀</button><h2 class="h2">Choose a level</h2><span class="sp"></span><span class="chip">⭐ <b>' + totalStars() + '</b><small>/' + TOTAL * 3 + '</small></span></div>' +
            '<div class="tabs">' + WORLDS.map((x, i) => '<button class="tab' + (i === mapWorld ? ' on' : '') + '" data-world="' + i + '"' + (unlocked(i * PER) ? '' : ' disabled') + '><span>' + x.icon + '</span>' + x.name + (unlocked(i * PER) ? '' : ' 🔒') + '</button>').join('') + '</div>' +
            '<p class="wprog"><b>' + Wd.name + '</b> · ' + done + '/' + PER + ' mazes solved</p>' +
            '<div class="lvls">' + Array.from({ length: PER }, (_, i) => {
                const g = base + i, ok = unlocked(g), st = save.stars[g];
                return '<button class="lv' + (ok ? '' : ' lock') + (st ? ' done' : '') + '" data-level="' + g + '"' + (ok ? '' : ' disabled') + '><b>' + (i + 1) + '</b>' + (ok ? '<span class="lv__st">' + [0, 1, 2].map(k => '<i class="' + (k < st ? 'on' : '') + '">★</i>').join('') + '</span>' : '<span class="lv__lock">🔒</span>') + '</button>';
            }).join('') + '</div></section>';
        A.play('title');
    }

    /* ══ Dialogs ══ */
    function showHow() {
        modal('<h2>How to play</h2><ul class="how">' +
            '<li><img src="' + IMGDIR + 'unicorn.png" alt=""><span><b>Draw a path</b> with your finger from the unicorn to the castle. Dragging back rewinds it.</span></li>' +
            '<li><img src="' + IMGDIR + 'star.png" alt=""><span><b>Collect sparkles</b> along the way: <em class="good">+10</em> each.</span></li>' +
            '<li><img src="' + IMGDIR + 'mushroom.png" alt=""><span><b>Avoid obstacles.</b> Bumping into one costs <em class="bad">−5</em>.</span></li>' +
            '<li><img src="' + IMGDIR + 'castle.png" alt=""><span><b>Reach the castle</b> for <em class="good">+20</em> and up to three ⭐.</span></li>' +
            '<li class="how__tip">💡 Stuck? Tap Hint for glowing clues (−5). Prefer taps? Turn on the arrow pad in Settings.</li></ul>' +
            '<button class="btn-big" data-act="close">Got it!</button>');
    }
    function showSettings(fromPause) {
        const row = (k, label, icon) => '<button class="set' + (save.s[k] ? ' on' : '') + '" data-set="' + k + '"><i>' + icon + '</i><span>' + label + '</span><u><s></s></u></button>';
        modal('<h2>Settings</h2><div class="sets">' + row('music', 'Music', '🎵') + row('sfx', 'Sound effects', '🔊') + row('vibe', 'Vibration', '📳') + row('pad', 'Arrow pad', '🎮') + row('unlockAll', 'Unlock all levels', '🔓') + '</div>' +
            '<div class="row"><button class="btn-sub danger" data-act="reset">🗑️ Reset progress</button></div>' +
            '<p class="fine">Unicorn Trail v2 · <a href="privacy.html">Privacy policy</a></p>' +
            '<button class="btn-big" data-act="' + (fromPause ? 'pause' : 'close') + '">Done</button>');
    }
    function confirmReset() {
        modal('<h2>Reset progress?</h2><p class="muted">All stars and best scores will be erased.</p><div class="row"><button class="btn-sub" data-act="close">Keep it</button><button class="btn-sub danger" data-act="reset-yes">Reset</button></div>');
    }

    /* ══ Game ══ */
    let L, path, state, penalty, bumps, bumpCell, hinted, finished, hint, parts, shake, faceS, clock = 0, glints, ambient, running = false, curve;
    let canvas, ctx, baked, W0 = 320, m = 8, cs = 40, dragging = false, activeId = -1, lastPt = null, ro = null, run = null, wonAt = 0, msgEl, scoreEl, sparkEl, rafId = 0, lastTs = 0;

    const cx = c => m + (c % L.n + 0.5) * cs, cy = c => m + (((c / L.n) | 0) + 0.5) * cs;
    const sparkleCount = () => L.sparkles.filter(c => path.includes(c)).length;
    const adjacent = (a, b) => Math.abs((a % L.n) - (b % L.n)) + Math.abs(((a / L.n) | 0) - ((b / L.n) | 0)) === 1;
    const score = () => Math.max(0, sparkleCount() * SPARK - penalty) + (finished ? FINISH : 0);
    const say = t => { if (msgEl) msgEl.textContent = t; };
    const pickOf = a => a[Math.floor(Math.random() * a.length)];

    function startLevel(g) {
        closeModal(); stopGame(); mazeG = g; L = buildLevel(g); const Wd = L.W;
        setScreen('game'); document.body.dataset.world = Wd.id;
        const pad = save.s.pad;
        app.innerHTML =
            '<section class="scr scr--game">' +
            '<header class="hud"><button class="ibtn" data-act="pause" aria-label="Pause">⏸</button>' +
            '<div class="hud__t"><b>Level ' + (L.li + 1) + '</b><small>' + Wd.name + '</small></div>' +
            '<span class="sp"></span><span class="chip chip--score" title="Score">🏆 <b data-score>0</b></span><span class="chip" title="Sparkles">✨ <b data-spark>0/' + L.sparkles.length + '</b></span></header>' +
            '<div class="coach"><img src="' + IMGDIR + 'unicorn.png" alt=""><p data-msg></p></div>' +
            '<div class="boardwrap"><div class="board"><canvas tabindex="0" role="img" aria-label="Maze. Drag from the unicorn to the castle to draw a path, or use the arrow keys."></canvas></div></div>' +
            '<div class="controls' + (pad ? ' is-pad' : '') + '"><div class="tools">' +
            '<button class="tool" data-act="undo"><i>↩️</i><span>Undo</span></button><button class="tool" data-act="clear"><i>🧹</i><span>Restart</span></button>' +
            '<button class="tool" data-act="hint"><i>💡</i><span>Hint</span><em>−5</em></button><button class="tool' + (pad ? ' on' : '') + '" data-act="padtoggle"><i>🎮</i><span>Pad</span></button></div>' +
            '<div class="dpad" role="group" aria-label="Move the unicorn"><button class="dp n" data-dir="1" aria-label="Up">▲</button><button class="dp w" data-dir="8" aria-label="Left">◀</button><img class="dc" src="' + IMGDIR + 'unicorn.png" alt=""><button class="dp e" data-dir="2" aria-label="Right">▶</button><button class="dp s" data-dir="4" aria-label="Down">▼</button></div></div></section>';
        canvas = $('canvas'); ctx = canvas.getContext('2d'); msgEl = $('[data-msg]'); scoreEl = $('[data-score]'); sparkEl = $('[data-spark]');
        path = [L.start]; state = 'draw'; penalty = 0; bumps = 0; bumpCell = -1; hinted = false; finished = false; hint = null; parts = []; shake = {}; dragging = false; lastPt = null; run = null; curve = null;
        faceS = L.start % L.n > L.n / 2 ? -1 : 1;
        const rr0 = mulberry(g + 5);
        glints = Array.from({ length: 12 }, () => ({ x: rr0(), y: rr0(), r: 1.5 + rr0() * 2.5, p: rr0() * 6.3 }));
        ambient = Array.from({ length: Wd.decal === 'crystals' ? 16 : 10 }, () => ({ x: rr0(), y: rr0(), vx: (rr0() - 0.5) * 0.03, vy: 0.012 + rr0() * 0.025, r: 2 + rr0() * 3, p: rr0() * 6.3 }));
        bindCanvas(); bindPad(); observe();
        running = true; lastTs = 0; rafId = requestAnimationFrame(frame);
        A.play(Wd.music);
        say(L.li === 0 ? Wd.quote : pickOf(['Guide the unicorn to the castle 🏰', 'Draw a rainbow path home 🌈', 'Collect sparkles ✨ and dodge the obstacles!']));
        resize(); refresh();
    }

    function stopGame() { running = false; cancelAnimationFrame(rafId); if (ro) { ro.disconnect(); ro = null; } }

    function observe() {
        const box = $('.boardwrap'), fit = () => { if (running) resize(); };
        if (window.ResizeObserver) { ro = new ResizeObserver(fit); ro.observe(box); } else window.addEventListener('resize', fit);
    }

    function updateHUD() { scoreEl.textContent = score(); sparkEl.textContent = sparkleCount() + '/' + L.sparkles.length; }
    function refresh() { updateHUD(); curve = buildCurve(path); }

    function resize() {
        const box = $('.boardwrap'), board = $('.board'), avail = Math.floor(Math.min(box.clientWidth, box.clientHeight)), size = Math.max(230, avail);
        board.style.width = board.style.height = size + 'px';
        const cssb = getComputedStyle(board), w = Math.floor(size - parseFloat(cssb.paddingLeft) - parseFloat(cssb.paddingRight) - parseFloat(cssb.borderLeftWidth) * 2) || 300;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        W0 = w; canvas.width = Math.round(w * dpr); canvas.height = Math.round(w * dpr); canvas.style.width = canvas.style.height = w + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        m = Math.max(6, w * 0.022); cs = (w - 2 * m) / L.n;
        bake(); curve = buildCurve(path);
    }

    /* ── Smooth rainbow curve through the chosen cells ── */
    function buildCurve(cells) {
        const c = cells.map(id => ({ x: cx(id), y: cy(id) })), pts = [c[0]];
        if (c.length === 2) pts.push(c[1]);
        else if (c.length > 2) {
            let p = c[0];
            for (let i = 1; i < c.length - 1; i++) {
                const e = { x: (c[i].x + c[i + 1].x) / 2, y: (c[i].y + c[i + 1].y) / 2 };
                for (let s = 1; s <= 8; s++) { const t = s / 8, u = 1 - t; pts.push({ x: u * u * p.x + 2 * u * t * c[i].x + t * t * e.x, y: u * u * p.y + 2 * u * t * c[i].y + t * t * e.y }); }
                p = e;
            }
            pts.push(c[c.length - 1]);
        }
        const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
        return { pts, cum, total: cum[cum.length - 1] };
    }
    function pointAt(cv, d) {
        const { pts, cum } = cv;
        if (pts.length < 2 || d <= 0) return { x: pts[0].x, y: pts[0].y, dx: 1, dy: 0 };
        let i = 1; while (i < pts.length - 1 && cum[i] < d) i++;
        const seg = cum[i] - cum[i - 1] || 1, t = Math.min(1, (d - cum[i - 1]) / seg);
        return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t, dx: pts[i].x - pts[i - 1].x, dy: pts[i].y - pts[i - 1].y };
    }
    function partial(cv, d) { const out = []; for (let i = 0; i < cv.pts.length && cv.cum[i] <= d; i++) out.push(cv.pts[i]); const e = pointAt(cv, d); out.push({ x: e.x, y: e.y }); return out; }

    /* ── Drawing the path: forgiving touch controls ── */
    function cellAt(px, py, margin) {
        const fx = (px - m) / cs, fy = (py - m) / cs, x = Math.floor(fx), y = Math.floor(fy);
        if (x < 0 || y < 0 || x >= L.n || y >= L.n) return -1;
        if (margin && (fx - x < margin || fx - x > 1 - margin || fy - y < margin || fy - y > 1 - margin)) return -1;
        return y * L.n + x;
    }
    function step(c) {
        if (state !== 'draw' || c < 0) return false;
        const last = path[path.length - 1];
        if (c === last || !adjacent(last, c)) return false;
        if (path.length > 1 && c === path[path.length - 2]) { path.pop(); hint = null; A.sfx('undo'); refresh(); return true; }
        if (path.includes(c)) return false;
        const dx = (c % L.n) - (last % L.n), dy = ((c / L.n) | 0) - ((last / L.n) | 0), d = dx === 1 ? E : dx === -1 ? W : dy === 1 ? S : N;
        if (L.walls[last] & d) return false;
        if (L.obs[c]) {
            shake[c] = 0.5;
            if (bumpCell !== c) {
                bumpCell = c; bumps++; penalty += PENALTY; A.sfx('bump'); vibrate(40); updateHUD();
                popText(cx(c), cy(c) - cs * 0.3, '−' + PENALTY, '#E63C5A');
                say('Oops! The ' + NAMES[L.obs[c]] + ' is in the way: −' + PENALTY + '. Go around!');
            }
            return false;
        }
        path.push(c); bumpCell = -1; hint = null; refresh();
        A.sfx('step', { i: path.length });
        if (L.sparkles.includes(c)) { A.sfx('star', { combo: sparkleCount() - 1 }); vibrate(15); popText(cx(c), cy(c) - cs * 0.3, '+' + SPARK, '#0E9C81'); say(pickOf(['✨ Sparkle collected!', '✨ Ooh, shiny!', '✨ Magic dust!'])); burst(cx(c), cy(c), 12); }
        if (c === L.home) go();
        return true;
    }
    function steerTo(target) {
        if (state !== 'draw' || target < 0) return;
        if (target !== bumpCell) bumpCell = -1;
        for (let guard = 0; guard < 3 && state === 'draw'; guard++) {
            const head = path[path.length - 1];
            if (target === head) return;
            const idx = path.indexOf(target);
            if (idx >= 0) { if (path.length - 1 - idx <= 2) { path.length = idx + 1; hint = null; A.sfx('undo'); refresh(); } return; }
            if (adjacent(head, target)) { step(target); return; }
            const blocked = new Array(L.n * L.n).fill(false);
            Object.keys(L.obs).forEach(k => { blocked[k] = true; }); path.forEach(c => { blocked[c] = true; }); blocked[target] = false;
            const route = bfs(L, head, target, blocked, 2);
            if (!route || route.length < 3) return;
            if (!step(route[1])) return;
        }
    }
    function pointerPath(x, y) {
        const from = lastPt || { x, y }, dist = Math.hypot(x - from.x, y - from.y), n = Math.max(1, Math.ceil(dist / (cs * 0.15)));
        for (let i = 1; i <= n; i++) steerTo(cellAt(from.x + (x - from.x) * i / n, from.y + (y - from.y) * i / n, 0.12));
        lastPt = { x, y };
    }
    const local = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * W0 / r.width, y: (e.clientY - r.top) * W0 / r.width }; };

    function bindCanvas() {
        canvas.addEventListener('pointerdown', e => {
            A.unlock();
            if (state !== 'draw' || dragging) return;
            const p = local(e), c = cellAt(p.x, p.y), head = path[path.length - 1];
            const near = Math.hypot(p.x - cx(head), p.y - cy(head)) <= Math.max(cs * 1.9, 76), idx = c >= 0 ? path.indexOf(c) : -1;
            if (idx >= 0 && idx < path.length - 1) { path.length = idx + 1; hint = null; refresh(); }
            else if (!near) { say('Touch the glowing end of your rainbow, then drag 🌈'); vibrate(10); return; }
            dragging = true; activeId = e.pointerId; lastPt = { x: cx(path[path.length - 1]), y: cy(path[path.length - 1]) };
            try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
            pointerPath(p.x, p.y); e.preventDefault();
        });
        canvas.addEventListener('pointermove', e => { if (dragging && e.pointerId === activeId) { const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; (evs.length ? evs : [e]).forEach(ev => { const p = local(ev); pointerPath(p.x, p.y); }); e.preventDefault(); } });
        const end = e => { if (!dragging || (e && e.pointerId !== undefined && e.pointerId !== activeId)) return; dragging = false; lastPt = null; if (state === 'draw' && path.length > 1) say('Drag on from the glowing end to keep going 🌈'); };
        canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end); canvas.addEventListener('lostpointercapture', end);
        canvas.addEventListener('contextmenu', e => e.preventDefault());
        canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    }
    function bindPad() {
        const pad = $('.dpad'); let timer = 0, rep = 0; const stop = () => { clearTimeout(timer); clearInterval(rep); };
        const move = d => { if (state === 'draw') { const ok = step(neighbour(L.n, path[path.length - 1], +d)); if (!ok) vibrate(8); } };
        pad.addEventListener('pointerdown', e => { const b = e.target.closest('[data-dir]'); if (!b) return; A.unlock(); e.preventDefault(); stop(); move(b.dataset.dir); timer = setTimeout(() => { rep = setInterval(() => move(b.dataset.dir), 140); }, 320); });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => pad.addEventListener(t, stop));
        pad.addEventListener('contextmenu', e => e.preventDefault());
        pad.addEventListener('click', e => { const b = e.target.closest('[data-dir]'); if (b && e.detail === 0) move(b.dataset.dir); });
    }

    document.addEventListener('keydown', e => {
        if (screen !== 'game' || $('.modal')) return;
        const map = { ArrowUp: N, ArrowRight: E, ArrowDown: S, ArrowLeft: W, w: N, d: E, s: S, a: W };
        const d = map[e.key];
        if (d) { e.preventDefault(); if (state === 'draw') step(neighbour(L.n, path[path.length - 1], d)); }
        else if (e.key === 'Backspace' || e.key === 'z') { e.preventDefault(); act('undo'); }
        else if (e.key === 'Escape' || e.key === 'p') showPause();
        else if (e.key === 'h') act('hint');
    });

    /* ── Tools ── */
    function act(a) {
        if (state !== 'draw') return;
        A.unlock();
        if (a === 'undo') { if (path.length > 1) { path.pop(); A.sfx('undo'); } hint = null; refresh(); }
        else if (a === 'clear') { path = [L.start]; hint = null; A.sfx('undo'); refresh(); say('Fresh start! Draw a new path ✨'); }
        else if (a === 'hint') {
            const blocked = new Array(L.n * L.n).fill(false); Object.keys(L.obs).forEach(k => { blocked[k] = true; }); path.slice(0, -1).forEach(c => { blocked[c] = true; });
            const sol = bfs(L, path[path.length - 1], L.home, blocked);
            if (!sol) { say('Hmm, this way is stuck. Undo a few steps! ↩️'); return; }
            if (!(hint && clock < hint.until)) { hinted = true; penalty += PENALTY; updateHUD(); popText(cx(path[path.length - 1]), cy(path[path.length - 1]) - cs * 0.3, '−' + PENALTY, '#E63C5A'); }
            A.sfx('hint'); hint = { cells: sol.slice(1, 5), until: clock + 4 }; say('Follow the twinkling dots! 💫');
        }
    }

    /* ── Gallop and win ── */
    function go() {
        state = 'run'; dragging = false; lastPt = null; hint = null; curve = buildCurve(path);
        run = { d: 0, t: 0, passed: new Set(), emit: 0 }; A.sfx('whoosh');
        say(pickOf(['Off we gallop! 🌈', 'Wheee! Here we go! 💨', 'Home sweet home, here I come! 🏰']));
    }
    function win() {
        state = 'won'; wonAt = clock; finished = true;
        const got = sparkleCount(), final = score(), pct = final / L.max, stars = pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : 1;
        const prev = save.stars[mazeG], isBest = final > save.best[mazeG];
        save.stars[mazeG] = Math.max(prev, stars); if (isBest) save.best[mazeG] = final; persist(); updateHUD();
        if (stars > prev) { try { if (window.Kid && Kid.Stars) Kid.Stars.add('trail', stars - prev); } catch (e) { /* ignore */ } }
        popText(cx(L.home), cy(L.home) - cs * 0.5, '+' + FINISH, '#7A5AF8');
        A.sfx('win'); vibrate([30, 40, 60]); try { Kid.confetti(50); } catch (e) { /* ignore */ }
        for (let i = 0; i < 14; i++) burst(cx(L.home) + (Math.random() - 0.5) * cs, cy(L.home) - Math.random() * cs * 0.4, 1, 'heart');
        say('Hooray! The unicorn is home! 🏰💖');
        const my = mazeG; setTimeout(() => { if (screen === 'game' && mazeG === my && state === 'won') showResult(stars, got, final, isBest); }, 1500);
    }
    function showResult(stars, got, final, isBest) {
        const last = mazeG === TOTAL - 1, worldDone = L.li === PER - 1 && !last;
        const title = last ? 'All worlds complete!' : worldDone ? WORLDS[L.wi].name + ' complete!' : 'Unicorn is home!';
        const tip = stars === 3 ? 'A perfect magical journey!' : 'For 3 ⭐ collect every sparkle and avoid obstacles and hints.';
        modal('<img class="rimg" src="' + IMGDIR + (last ? 'castle' : 'unicorn') + '.png" alt="">' + '<h2>' + title + '</h2>' + starRow(stars, true) +
            '<div class="big"><span>Score</span><b>' + final + '</b>' + (isBest ? '<em>New best! 🎉</em>' : '<small>Best ' + save.best[mazeG] + '</small>') + '</div>' +
            '<div class="stats"><div><b>' + got + '/' + L.sparkles.length + '</b><span>Sparkles</span></div><div><b>' + bumps + '</b><span>Bumps</span></div><div><b>' + (hinted ? 'Yes' : 'No') + '</b><span>Hint used</span></div></div>' +
            '<p class="muted">' + tip + '</p>' +
            (last ? '<button class="btn-big" data-act="map">Choose a level</button>' : '<button class="btn-big" data-act="next">Next level ▶</button>') +
            '<div class="row"><button class="btn-sub" data-act="replay">🔁 Replay</button><button class="btn-sub" data-act="map">🗺️ Levels</button></div>', 'result');
    }
    function showPause() {
        if (screen !== 'game' || $('.modal') || state === 'run') return;
        dragging = false; A.sfx('click');
        modal('<h2>Paused</h2><button class="btn-big" data-act="close">Resume ▶</button><div class="row"><button class="btn-sub" data-act="clear-close">🔁 Restart level</button><button class="btn-sub" data-act="map">🗺️ Levels</button></div><div class="row"><button class="btn-sub" data-act="settings-pause">⚙️ Settings</button><button class="btn-sub" data-act="title">🏠 Menu</button></div>');
    }

    /* ── Particles and popups ── */
    const PASTELS = ['#FF9EC4', '#FFC48F', '#FFE680', '#A8F0D6', '#9ED8FF', '#C9B2FF'];
    function burst(x, y, n, type) {
        for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, sp = type === 'heart' ? 20 + Math.random() * 40 : 40 + Math.random() * 90; parts.push({ x, y, vx: Math.cos(a) * sp, vy: type === 'heart' ? -30 - Math.random() * 60 : Math.sin(a) * sp - 20, life: 0, max: 0.7 + Math.random() * 0.8, type: type || 'spark', color: PASTELS[i % 6], size: 3 + Math.random() * 5 }); }
        if (parts.length > 160) parts.splice(0, parts.length - 160);
    }
    function popText(x, y, text, color) { parts.push({ x, y, vx: 0, vy: -55, life: 0, max: 1.15, type: 'text', text, color, size: 0 }); }

    /* ── Frame loop ── */
    function frame(ts) {
        if (!running) return;
        rafId = requestAnimationFrame(frame);
        const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0); lastTs = ts; clock += dt;
        update(dt); draw();
    }
    function update(dt) {
        for (const k in shake) if ((shake[k] -= dt) <= 0) delete shake[k];
        parts = parts.filter(p => { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.type === 'spark' ? 90 : -10) * dt; return p.life < p.max; });
        ambient.forEach(a => { a.x += a.vx * dt * 6 + Math.sin(clock + a.p) * 0.0006; a.y += a.vy * dt; if (a.y > 1.05) { a.y = -0.05; a.x = Math.random(); } if (a.x < -0.05) a.x = 1.05; if (a.x > 1.05) a.x = -0.05; });
        if (state === 'run') {
            run.t += dt;
            const speed = cs * 5.4 * Math.min(1, 0.25 + run.t * 1.6);
            run.d = Math.min(curve.total, run.d + speed * dt);
            const pt = pointAt(curve, run.d);
            if (Math.abs(pt.dx) > 0.2) faceS += ((pt.dx > 0 ? 1 : -1) - faceS) * Math.min(1, dt * 14);
            run.emit -= dt; if (run.emit <= 0) { run.emit = 0.05; burst(pt.x - Math.sign(pt.dx || 1) * cs * 0.25, pt.y + cs * 0.1, 1); }
            const frac = run.d / (curve.total || 1);
            path.forEach((c, i) => { if (!run.passed.has(c) && frac >= i / Math.max(1, path.length - 1) - 0.01) { run.passed.add(c); if (L.sparkles.includes(c)) burst(cx(c), cy(c), 14); } });
            if (run.d >= curve.total) win();
        }
    }

    /* ── Rendering ── */
    function sprite(name, x, y, size) { const i = IMG[name]; if (!i || !i.complete || !i.naturalWidth) return false; ctx.drawImage(i, x - size / 2, y - size / 2, size, size); return true; }
    function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
    function star4(x, y, r) { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, q = i % 2 ? r * 0.35 : r; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * q, y + Math.sin(a) * q); } ctx.closePath(); ctx.fill(); }
    const glowCache = {};
    function glow(rgb) { if (glowCache[rgb]) return glowCache[rgb]; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(' + rgb + ',.95)'); r.addColorStop(0.45, 'rgba(' + rgb + ',.35)'); r.addColorStop(1, 'rgba(' + rgb + ',0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return (glowCache[rgb] = c); }
    function halo(x, y, r, rgb, a) { ctx.globalAlpha = a === undefined ? 1 : a; ctx.drawImage(glow(rgb), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1; }
    function shadow(x, y, rx, a) { ctx.fillStyle = 'rgba(70,40,120,' + (a || 0.2) + ')'; ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.3, 0, 0, 6.283); ctx.fill(); }

    /* The floor and walls are drawn once into an off-screen canvas and re-used every frame */
    function bake() {
        const dpr = canvas.width / W0, real = ctx, Wd = L.W, n = L.n, r = mulberry(L.g * 31 + 7);
        baked = document.createElement('canvas'); baked.width = canvas.width; baked.height = canvas.height;
        const b = baked.getContext('2d'); b.setTransform(dpr, 0, 0, dpr, 0, 0); ctx = b;
        const size = W0;
        const bg = ctx.createLinearGradient(0, 0, size, size); bg.addColorStop(0, Wd.floor[0]); bg.addColorStop(1, Wd.floor[1]); ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size);
        for (let c = 0; c < n * n; c++) {
            const x = c % n, y = (c / n) | 0, px = m + x * cs, py = m + y * cs;
            ctx.fillStyle = (x + y) % 2 ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.08)'; rr(px + 1.5, py + 1.5, cs - 3, cs - 3, cs * 0.16); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; rr(px + 2, py + 2, cs - 4, cs - 4, cs * 0.16); ctx.stroke();
            const k = Math.floor(r() * 3);
            for (let i = 0; i < k; i++) decal(Wd.decal, px + cs * (0.15 + r() * 0.7), py + cs * (0.15 + r() * 0.7), cs, r);
        }
        const segs = [];
        for (let c = 0; c < n * n; c++) {
            const x = c % n, y = (c / n) | 0, x0 = m + x * cs, y0 = m + y * cs, w = L.walls[c];
            if (w & N) segs.push([x0, y0, x0 + cs, y0]); if (w & W) segs.push([x0, y0, x0, y0 + cs]);
            if (x === n - 1 && w & E) segs.push([x0 + cs, y0, x0 + cs, y0 + cs]); if (y === n - 1 && w & S) segs.push([x0, y0 + cs, x0 + cs, y0 + cs]);
        }
        const wp = new Path2D(); segs.forEach(s => { wp.moveTo(s[0], s[1]); wp.lineTo(s[2], s[3]); });
        const lw = Math.min(14, Math.max(7, cs * 0.17)); ctx.lineCap = 'round';
        ctx.save(); ctx.translate(1.5, 3.5); ctx.strokeStyle = 'rgba(40,20,80,.22)'; ctx.lineWidth = lw + 3; ctx.stroke(wp); ctx.restore();
        ctx.strokeStyle = Wd.wall.dark; ctx.lineWidth = lw + 3; ctx.stroke(wp);
        ctx.strokeStyle = Wd.wall.base; ctx.lineWidth = lw; ctx.stroke(wp);
        ctx.save(); ctx.translate(-0.8, -1.2); ctx.strokeStyle = Wd.wall.hi; ctx.globalAlpha = 0.85; ctx.lineWidth = lw * 0.38; ctx.stroke(wp); ctx.restore();
        segs.forEach(s => {
            const len = Math.hypot(s[2] - s[0], s[3] - s[1]), cnt = Math.floor(len / (lw * 1.25));
            for (let i = 0; i <= cnt; i++) {
                const t = i / Math.max(1, cnt), x = s[0] + (s[2] - s[0]) * t + (r() - 0.5) * lw * 0.5, y = s[1] + (s[3] - s[1]) * t + (r() - 0.5) * lw * 0.5;
                if (Wd.decal === 'flowers') { ctx.fillStyle = r() < 0.5 ? Wd.wall.hi : Wd.wall.base; ctx.beginPath(); ctx.arc(x, y, lw * (0.22 + r() * 0.16), 0, 6.283); ctx.fill(); if (r() < 0.16) { ctx.fillStyle = ['#FF9EC4', '#FFE680', '#FFFFFF'][Math.floor(r() * 3)]; ctx.beginPath(); ctx.arc(x, y, lw * 0.15, 0, 6.283); ctx.fill(); } }
                else if (Wd.decal === 'leaves') { ctx.fillStyle = r() < 0.5 ? Wd.wall.hi : Wd.wall.dark; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.ellipse(x, y, lw * 0.28, lw * 0.1, r() * 3, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; }
                else { ctx.fillStyle = '#FFFFFF'; ctx.globalAlpha = 0.55 + r() * 0.3; ctx.beginPath(); ctx.moveTo(x, y - lw * 0.28); ctx.lineTo(x + lw * 0.2, y); ctx.lineTo(x, y + lw * 0.28); ctx.lineTo(x - lw * 0.2, y); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; }
            }
        });
        ctx = real;
    }
    function decal(kind, x, y, s, r) {
        if (kind === 'flowers') {
            if (r() < 0.5) { ctx.fillStyle = ['#FF9EC4', '#FFFFFF', '#FFE680', '#C9B2FF'][Math.floor(r() * 4)]; for (let i = 0; i < 5; i++) { const a = i * 1.2566; ctx.beginPath(); ctx.arc(x + Math.cos(a) * s * 0.05, y + Math.sin(a) * s * 0.05, s * 0.034, 0, 6.283); ctx.fill(); } ctx.fillStyle = '#FFD84A'; ctx.beginPath(); ctx.arc(x, y, s * 0.028, 0, 6.283); ctx.fill(); }
            else { ctx.strokeStyle = 'rgba(70,150,70,.45)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - s * 0.04, y); ctx.lineTo(x - s * 0.06, y - s * 0.08); ctx.moveTo(x, y); ctx.lineTo(x, y - s * 0.1); ctx.moveTo(x + s * 0.04, y); ctx.lineTo(x + s * 0.06, y - s * 0.08); ctx.stroke(); }
        } else if (kind === 'leaves') {
            ctx.fillStyle = ['rgba(90,170,120,.5)', 'rgba(255,190,110,.5)', 'rgba(150,210,170,.55)'][Math.floor(r() * 3)]; ctx.beginPath(); ctx.ellipse(x, y, s * 0.06, s * 0.03, r() * 3, 0, 6.283); ctx.fill();
        } else {
            ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.moveTo(x, y - s * 0.05); ctx.lineTo(x + s * 0.03, y); ctx.lineTo(x, y + s * 0.05); ctx.lineTo(x - s * 0.03, y); ctx.closePath(); ctx.fill();
        }
    }

    function ribbon(pts) {
        if (pts.length < 2) return;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.strokeStyle = 'rgba(255,150,210,.28)'; ctx.lineWidth = cs * 0.62; ctx.stroke();
        ctx.save(); ctx.translate(0, 2.5); ctx.strokeStyle = 'rgba(70,40,120,.2)'; ctx.lineWidth = cs * 0.44; ctx.stroke(); ctx.restore();
        [['#FF8FBA', 1], ['#FFB88A', 0.78], ['#FFEE9E', 0.58], ['#9EF0CC', 0.4], ['#9ED8FF', 0.22]].forEach(([col, k]) => { ctx.strokeStyle = col; ctx.lineWidth = cs * 0.4 * k; ctx.stroke(); });
    }

    function draw() {
        const t = clock, size = W0;
        ctx.clearRect(0, 0, size, size);
        ctx.save(); rr(0, 0, size, size, 22); ctx.clip();
        if (baked) ctx.drawImage(baked, 0, 0, size, size);
        ambient.forEach(a => {
            const x = a.x * size, y = a.y * size, d = L.W.decal;
            if (d === 'flowers') { ctx.fillStyle = 'rgba(255,170,205,.8)'; ctx.beginPath(); ctx.ellipse(x, y, a.r, a.r * 0.55, a.p + t, 0, 6.283); ctx.fill(); }
            else if (d === 'leaves') halo(x, y, a.r * 4, '255,240,150', 0.55 + 0.4 * Math.sin(t * 2 + a.p));
            else { ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.35 + 0.5 * Math.max(0, Math.sin(t * 1.8 + a.p)); star4(x, y, a.r * 1.6); ctx.globalAlpha = 1; }
        });
        ctx.fillStyle = '#fff'; glints.forEach(g => { ctx.globalAlpha = 0.2 + 0.5 * Math.max(0, Math.sin(t * 1.6 + g.p)); star4(g.x * size, g.y * size, g.r * (cs / 40 + 0.5)); }); ctx.globalAlpha = 1;

        ctx.fillStyle = 'rgba(190,150,255,.28)'; ctx.beginPath(); ctx.arc(cx(L.start), cy(L.start), cs * 0.44, 0, 6.283); ctx.fill();
        const hx = cx(L.home), hy = cy(L.home), pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
        halo(hx, hy, cs * (1.0 + pulse * 0.14), '255,226,120', 0.95);

        if (path.length > 1) ribbon(state === 'run' ? partial(curve, run.d) : curve.pts);
        if (state === 'draw' && path.length > 1) { const h = path[path.length - 1], k = 1 + Math.sin(t * 5) * 0.12; halo(cx(h), cy(h), cs * 0.58 * k, '255,120,190', 0.9); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#FF7FB5'; ctx.lineWidth = Math.max(3, cs * 0.07); ctx.beginPath(); ctx.arc(cx(h), cy(h), cs * 0.2 * k, 0, 6.283); ctx.fill(); ctx.stroke(); }

        L.sparkles.forEach((c, i) => {
            if (state === 'run' && run.passed.has(c)) return;
            const on = path.includes(c), k = 1 + Math.sin(t * 4 + i) * 0.1;
            halo(cx(c), cy(c), cs * (on ? 0.6 : 0.5), '255,205,70', on ? 1 : 0.85);
            if (!sprite('star', cx(c), cy(c), cs * 0.64 * k)) { ctx.fillStyle = '#FFD84D'; star4(cx(c), cy(c), cs * 0.27 * k); }
        });
        if (hint && clock < hint.until) hint.cells.forEach((c, i) => { const a = 0.5 + 0.5 * Math.sin(t * 7 - i * 1.2); halo(cx(c), cy(c), cs * (0.32 + a * 0.12), '179,140,255', 1); ctx.fillStyle = 'rgba(255,255,255,' + (0.6 + a * 0.4) + ')'; ctx.beginPath(); ctx.arc(cx(c), cy(c), cs * (0.09 + a * 0.05), 0, 6.283); ctx.fill(); });

        const cz = cs * (state === 'won' ? 0.98 + Math.abs(Math.sin((t - wonAt) * 5)) * 0.08 : 0.9);
        shadow(hx, hy + cs * 0.36, cs * 0.32, 0.22); sprite('castle', hx, hy + Math.sin(t * 2) * cs * 0.02, cz);

        for (const k in L.obs) {
            const c = +k; if (shake[c]) halo(cx(c), cy(c), cs * 0.62, '255,90,120', Math.min(1, shake[c] / 0.3));
            const sh = shake[c] ? Math.sin(shake[c] * 60) * cs * 0.07 * (shake[c] / 0.5) : 0;
            shadow(cx(c), cy(c) + cs * 0.3, cs * 0.26, 0.18);
            sprite(L.obs[c], cx(c) + sh, cy(c) + Math.sin(t * 2.3 + c) * cs * 0.03, cs * 0.74);
        }

        let ux, uy, moving = false, phase = 0, hop = 0;
        if (state === 'run') { const p = pointAt(curve, run.d); ux = p.x; uy = p.y; moving = true; phase = run.d / cs * 3.6; }
        else if (state === 'won') { ux = hx; uy = hy + cs * 0.12; hop = 1; }
        else { ux = cx(L.start); uy = cy(L.start); }
        drawUnicorn(ux, uy, t, moving, phase, hop);

        parts.forEach(p => {
            const a = 1 - p.life / p.max; ctx.globalAlpha = Math.max(0, a);
            if (p.type === 'text') { ctx.font = '700 ' + Math.max(16, cs * 0.42) + 'px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeStyle = '#fff'; ctx.strokeText(p.text, p.x, p.y); ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y); }
            else if (p.type === 'heart') sprite('heart', p.x, p.y, cs * 0.42);
            else { ctx.fillStyle = p.color; star4(p.x, p.y, p.size * (0.5 + a * 0.6)); }
            ctx.globalAlpha = 1;
        });
        ctx.restore();
    }
    function drawUnicorn(x, y, t, moving, phase, hop) {
        const size = cs * 1.08, bob = moving ? -Math.abs(Math.sin(phase)) * cs * 0.09 : hop ? -Math.abs(Math.sin((t - wonAt) * 6)) * cs * 0.24 : Math.sin(t * 3) * cs * 0.025, lift = Math.min(1, Math.abs(bob) / (cs * 0.2));
        shadow(x, y + cs * 0.4, cs * (0.3 - lift * 0.08), 0.26 - lift * 0.1);
        ctx.save(); ctx.translate(x, y + cs * 0.04 + bob); ctx.rotate((moving ? Math.sin(phase) * 0.1 - 0.04 : Math.sin(t * 2) * 0.03) * faceS);
        const sq = moving ? 1 + Math.sin(phase * 2) * 0.05 : 1 + Math.sin(t * 3) * 0.015; ctx.scale(-faceS * sq, 1 / sq);
        sprite('unicorn', 0, 0, size); ctx.restore();
    }

    /* ── Buttons and navigation ── */
    const ACTIONS = {
        play() { const next = save.stars.findIndex((s, g) => s === 0 && unlocked(g)); startLevel(next < 0 ? TOTAL - 1 : next); },
        map() { closeModal(); showMap(screen === 'game' ? L.wi : undefined); },
        title() { closeModal(); showTitle(); },
        install() { if (RK.pwa) RK.pwa.install().then(syncInstall); },
        how() { showHow(); }, settings() { showSettings(false); }, 'settings-pause'() { showSettings(true); }, pause() { closeModal(); showPause(); },
        close() { closeModal(); },
        'clear-close'() { closeModal(); startLevel(mazeG); },
        next() { closeModal(); startLevel(Math.min(TOTAL - 1, mazeG + 1)); },
        replay() { closeModal(); startLevel(mazeG); },
        reset() { confirmReset(); },
        'reset-yes'() { save.stars.fill(0); save.best.fill(0); persist(); closeModal(); showTitle(); },
        undo() { act('undo'); }, clear() { act('clear'); }, hint() { act('hint'); },
        padtoggle() { save.s.pad = !save.s.pad; persist(); const c = $('.controls'), b = $('[data-act="padtoggle"]'); if (c) c.classList.toggle('is-pad', save.s.pad); if (b) b.classList.toggle('on', save.s.pad); setTimeout(() => { if (running) resize(); }, 30); }
    };
    document.addEventListener('click', e => {
        const b = e.target.closest('[data-act]');
        if (b && ACTIONS[b.dataset.act]) { A.unlock(); A.sfx('click'); ACTIONS[b.dataset.act](); return; }
        const lv = e.target.closest('[data-level]'); if (lv && !lv.disabled) { A.unlock(); A.sfx('click'); startLevel(+lv.dataset.level); return; }
        const tab = e.target.closest('[data-world]'); if (tab && !tab.disabled) { A.sfx('click'); showMap(+tab.dataset.world); return; }
        const st = e.target.closest('[data-set]');
        if (st) {
            const k = st.dataset.set; save.s[k] = !save.s[k]; persist(); st.classList.toggle('on', save.s[k]);
            if (k === 'music') A.setMusic(save.s.music);
            if (k === 'sfx') A.setSfx(save.s.sfx);
            if (k === 'pad') { const c = $('.controls'); if (c) c.classList.toggle('is-pad', save.s.pad); setTimeout(() => { if (running) resize(); }, 30); }
            A.sfx('click');
        }
    });
    // Android back button / browser back: step back through the app instead of leaving it
    function pushState() { try { history.pushState({ ut: 1 }, ''); } catch (e) { /* ignore */ } }
    window.addEventListener('popstate', () => { if ($('.modal')) { closeModal(); pushState(); } else if (screen === 'game') { showPause(); pushState(); } else if (screen === 'map') { showTitle(); pushState(); } });
    pushState();
    document.addEventListener('visibilitychange', () => { if (document.hidden) { A.pause(); if (screen === 'game') showPause(); } else A.resume(); });

    const tw = $('.twinkles');
    if (tw) for (let i = 0; i < 16; i++) { const e = document.createElement('i'); e.style.cssText = '--x:' + Math.floor(Math.random() * 100) + '%;--y:' + Math.floor(Math.random() * 100) + '%;--z:' + (3 + Math.floor(Math.random() * 5)) + 'px;--t:' + (3 + Math.random() * 4).toFixed(1) + 's;--dl:' + (Math.random() * 5).toFixed(1) + 's'; tw.appendChild(e); }

    showTitle();
    RK.trail = { buildLevel, WORLDS, PER, TOTAL, startLevel, save: () => save, update, step, ACTIONS, bfs, get state() { return state; }, get run() { return run; }, get path() { return path; }, get L() { return L; }, score };
    window.RK = RK;
})();
