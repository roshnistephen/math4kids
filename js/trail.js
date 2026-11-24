/* Unicorn Trail — draw a rainbow path through a pastel maze to guide the unicorn home. */
(function () {
    'use strict';
    const $ = (s, r) => (r || document).querySelector(s);
    const rnd = n => Math.floor(Math.random() * n);
    const pick = a => a[rnd(a.length)];
    const KEY = 'trail', SAVE_KEY = 'lokakids.trail.progress';
    const app = $('#app');

    const LEVELS = [
        { name: 'Easy',         emoji: '🌸', n: 5, loops: 0.40, obstacles: 3,  sparkles: 2, c1: '#FFD3E7', c2: '#FFB3D4', blurb: 'Wide open meadow', things: ['🍄', '🌷', '🐌'] },
        { name: 'Intermediate', emoji: '🌈', n: 7, loops: 0.18, obstacles: 6,  sparkles: 3, c1: '#E3D6FF', c2: '#C7B0FF', blurb: 'Twisty rainbow woods', things: ['🍄', '🌧️', '🐌', '🐸'] },
        { name: 'Hard',         emoji: '🔮', n: 9, loops: 0.07, obstacles: 11, sparkles: 4, c1: '#CFE9FF', c2: '#A9D3FF', blurb: 'Tricky crystal maze', things: ['🍄', '🌧️', '🐌', '🐸', '🦔', '🕷️'] }
    ];
    const NAMES = { '🍄': 'mushroom', '🌷': 'tulip', '🐌': 'snail', '🌧️': 'rain cloud', '🐸': 'froggy', '🦔': 'hedgehog', '🕷️': 'spider' };

    /* ── Artwork: Microsoft Fluent Emoji 3D (MIT) in images/trail ── */
    const SPRITE = { '🍄': 'mushroom', '🌷': 'tulip', '🐌': 'snail', '🌧️': 'raincloud', '🐸': 'frog', '🦔': 'hedgehog', '🕷️': 'spider' };
    const IMG = {};
    ['unicorn', 'castle', 'mushroom', 'tulip', 'snail', 'raincloud', 'frog', 'hedgehog', 'spider', 'star', 'heart'].forEach(n => { const i = new Image(); i.src = 'images/trail/' + n + '.png'; IMG[n] = i; });

    /* ── Saved progress (never breaks if storage is blocked) ── */
    function loadSave() { try { const d = JSON.parse(localStorage.getItem(SAVE_KEY)); if (d && Array.isArray(d.solved)) { if (!Array.isArray(d.best)) d.best = [0, 0, 0]; return d; } } catch (e) { /* ignore */ } return { solved: [0, 0, 0], best: [0, 0, 0] }; }
    function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* ignore */ } }
    const save = loadSave();
    const vibrate = ms => { try { if (navigator.vibrate && !Kid.Sound.muted) navigator.vibrate(ms); } catch (e) { /* ignore */ } };

    /* ── Twinkles in the page background ── */
    const tw = $('.twinkles');
    if (tw) for (let i = 0; i < 16; i++) {
        const s = document.createElement('i');
        s.style.cssText = '--x:' + rnd(100) + '%;--y:' + rnd(100) + '%;--s:' + (3 + rnd(5)) + 'px;--d:' + (3 + Math.random() * 4).toFixed(1) + 's;--dl:' + (Math.random() * 5).toFixed(1) + 's';
        tw.appendChild(s);
    }

    const decor = $('.decor');
    if (decor) for (let i = 0; i < 4; i++) {
        const c = document.createElement('i');
        c.className = 'cloud';
        c.style.cssText = '--y:' + (6 + i * 22 + rnd(8)) + '%;--s:' + (0.7 + Math.random() * 0.7).toFixed(2) + ';--d:' + (46 + rnd(40)) + 's;--dl:-' + rnd(60) + 's';
        decor.appendChild(c);
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
        L.solution = bfs(L, L.start, L.home, blocked);
        const shortest = new Set(L.solution);
        const free = reachable(L).filter(c => c !== L.start && c !== L.home);
        const off = free.filter(c => !shortest.has(c)).sort(() => Math.random() - 0.5);
        const on = free.filter(c => shortest.has(c)).sort(() => Math.random() - 0.5);
        const half = Math.ceil(cfg.sparkles / 2);
        L.sparkles = off.slice(0, half).concat(on, off.slice(half)).slice(0, cfg.sparkles);
        return L;
    }

    /* ── State ── */
    let levelIdx = 0, L, cfg, path, state, mazeNo = 0, hinted = false, penalty = 0, bumps = 0, bumpCell = -1, finished = false, scoreEl, playing = false, token = 0;
    let activeId = -1, canvas, ctx, msgEl, sparkEl, lvlEl;
    let W0 = 320, m = 8, cs = 40, curve = null, dragging = false, lastPt = null, ro = null;
    let run = null, wonAt = 0, hint = null, parts = [], shake = {}, faceS = 1, lastOops = 0, clock = 0, glints = [];
    const reduced = !!(window.Kid && Kid.reduced);
    const SPARK = 10, PENALTY = 5, FINISH = 20;
    const NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];

    const say = t => { if (msgEl) msgEl.textContent = t; };
    const cx = c => m + (c % L.n + 0.5) * cs;
    const cy = c => m + (((c / L.n) | 0) + 0.5) * cs;
    const sparkleCount = () => L.sparkles.filter(c => path.includes(c)).length;
    const adjacent = (a, b) => Math.abs((a % L.n) - (b % L.n)) + Math.abs(((a / L.n) | 0) - ((b / L.n) | 0)) === 1;
    const score = () => Math.max(0, sparkleCount() * SPARK - penalty) + (finished ? FINISH : 0);
    function updateScore(pulse) {
        if (!scoreEl) return;
        scoreEl.textContent = score();
        if (pulse) { const pill = scoreEl.parentElement; pill.classList.remove('is-up', 'is-down'); void pill.offsetWidth; pill.classList.add(pulse > 0 ? 'is-up' : 'is-down'); }
    }
    function popText(x, y, text, color) { parts.push({ x, y, vx: 0, vy: -55, life: 0, max: 1.15, type: 'text', text, color, size: 0 }); }

    /* ── Level select screen ── */
    function showMenu() {
        playing = false; token++; document.body.classList.remove('is-playing');
        if (ro) { ro.disconnect(); ro = null; }
        document.querySelectorAll('.modal').forEach(x => x.remove());
        app.innerHTML =
            '<section class="tmenu">' +
            '<div class="tmenu__hero"><img class="tmenu__unicorn" src="images/trail/unicorn.png" alt="">' +
            '<h1 class="tmenu__title">Unicorn Trail</h1><p class="tmenu__sub">A little unicorn is lost! Draw a rainbow path through the maze to bring it home. 🏰</p></div>' +
            '<div class="tlevels">' + LEVELS.map((l, i) =>
                '<button class="tlevel" type="button" data-level="' + i + '" style="--c1:' + l.c1 + ';--c2:' + l.c2 + '">' +
                '<span class="tlevel__emoji">' + l.emoji + '<small>' + (save.solved[i] >= 6 ? '🥇' : save.solved[i] >= 3 ? '🥈' : save.solved[i] >= 1 ? '🥉' : '') + '</small></span>' +
                '<span class="tlevel__body"><b class="tlevel__name">' + l.name + '</b><span class="tlevel__blurb">' + l.blurb + ' · ' + l.n + '×' + l.n + '</span>' +
                '<span class="tlevel__bar" title="' + save.solved[i] + ' solved"><i style="width:' + Math.min(100, save.solved[i] / 6 * 100) + '%"></i></span></span>' +
                '<span class="tlevel__side"><span class="tlevel__count">' + save.best[i] + '</span><span class="tlevel__lbl">best</span></span>' +
                '<span class="tlevel__go">▶</span></button>').join('') + '</div>' +
            '<div class="thow"><div><span>👆</span>Draw a path to the castle</div><div class="is-good"><span>✨</span>Sparkle<b>+10</b></div><div class="is-bad"><span>🍄</span>Obstacle<b>−5</b></div><div class="is-bad"><span>💡</span>Hint<b>−5</b></div></div>' +
            '</section>';
        app.querySelectorAll('.tlevel').forEach(b => b.addEventListener('click', () => { Kid.Sound.tap(); levelIdx = +b.dataset.level; startPlay(); }));
    }

    /* ── Play screen ── */
    function startPlay() {
        const pad = loadPad();
        app.innerHTML =
            '<section class="trail">' +
            '<div class="tbar"><button class="tbar__back" type="button" data-act="menu" aria-label="Back to levels">◀ <span>Levels</span></button>' +
            '<span class="chipbox tbar__lvl" data-lvl></span><span class="chipbox chipbox--score" title="Score">🏆 <b data-score>0</b></span><span class="chipbox" title="Sparkles">✨ <b data-spark>0/0</b></span>' +
            '<button class="tbar__pad" type="button" data-act="pad" aria-label="Show on-screen arrow pad" aria-pressed="' + pad + '">🎮</button></div>' +
            '<div class="tcoach"><img class="tcoach__av" src="images/trail/unicorn.png" alt=""><p class="trail__msg" aria-live="polite"></p></div>' +
            '<div class="tlegend" aria-label="How scoring works"><span class="tlegend__item tlegend__item--good">✨ Sparkle <b>+10</b></span><span class="tlegend__item tlegend__item--bad">🍄 Obstacle <b>−5</b></span><span class="tlegend__item tlegend__item--bad">💡 Hint <b>−5</b></span></div>' +
            '<div class="trail__board"><canvas tabindex="0" role="img" aria-label="Maze. Drag from the unicorn to the castle, or use the arrow keys, to draw a path."></canvas></div>' +
            '<div class="tcontrols' + (pad ? ' is-pad' : '') + '">' +
            '<div class="ttools">' +
            '<button class="tool" type="button" data-act="undo"><span class="tool__ic">↩️</span><span class="tool__tx">Undo</span></button>' +
            '<button class="tool" type="button" data-act="clear"><span class="tool__ic">🧹</span><span class="tool__tx">Restart</span></button>' +
            '<button class="tool" type="button" data-act="hint"><span class="tool__ic">💡</span><span class="tool__tx">Hint</span></button>' +
            '<button class="tool" type="button" data-act="new"><span class="tool__ic">🔀</span><span class="tool__tx">New maze</span></button></div>' +
            '<div class="dpad" role="group" aria-label="Move the unicorn">' +
            '<button class="dpad__b dpad__n" type="button" data-dir="1" aria-label="Up">▲</button>' +
            '<button class="dpad__b dpad__w" type="button" data-dir="8" aria-label="Left">◀</button>' +
            '<img class="dpad__c" src="images/trail/unicorn.png" alt="">' +
            '<button class="dpad__b dpad__e" type="button" data-dir="2" aria-label="Right">▶</button>' +
            '<button class="dpad__b dpad__s" type="button" data-dir="4" aria-label="Down">▼</button></div>' +
            '</div></section>';
        const root = $('.trail', app);
        canvas = $('canvas', root); ctx = canvas.getContext('2d');
        msgEl = $('.trail__msg', root); sparkEl = $('[data-spark]', root); scoreEl = $('[data-score]', root); lvlEl = $('[data-lvl]', root);
        root.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) act(b.dataset.act); });
        bindCanvas(); bindPad(root);
        if (window.ResizeObserver) { ro = new ResizeObserver(() => { if (L && playing) resize(); }); ro.observe(canvas.parentElement); }
        mazeNo = 0; playing = true;
        document.body.classList.add('is-playing');
        window.scrollTo(0, 0);
        fitBoard();
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(onViewport);
        newMaze();
    }

    /* ── Fit the board to the real screen (portrait phone, landscape phone, tablet) ── */
    function fitBoard() {
        const board = $('.trail__board'), root = $('.trail');
        if (!board || !root) return;
        const vv = window.visualViewport, vh = vv ? vv.height : window.innerHeight;
        const landscape = window.matchMedia('(orientation: landscape) and (max-height: 560px)').matches;
        const rootW = root.clientWidth;
        let size;
        if (landscape) {
            size = Math.min(vh - root.getBoundingClientRect().top - 12, rootW - 280);
        } else {
            const rr0 = root.getBoundingClientRect(), br = board.getBoundingClientRect(), ctl = $('.tcontrols', root);
            const above = br.top - rr0.top, below = (ctl ? ctl.offsetHeight : 0) + 24;
            size = vh - rr0.top - above - below - 6;
        }
        size = Math.round(Math.max(250, Math.min(size, rootW, 700)));
        if (Math.abs(board.offsetWidth - size) > 1) board.style.width = size + 'px';
    }
    let fitTimer = 0;
    function onViewport() { if (!playing) return; clearTimeout(fitTimer); fitTimer = setTimeout(() => { fitBoard(); if (L) resize(); }, 60); }
    window.addEventListener('resize', onViewport);
    window.addEventListener('orientationchange', onViewport);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onViewport);

    /* ── On-screen arrow pad (a precise alternative to dragging) ── */
    function loadPad() { try { return localStorage.getItem('lokakids.trail.pad') === '1'; } catch (e) { return false; } }
    function setPad(on) {
        try { localStorage.setItem('lokakids.trail.pad', on ? '1' : '0'); } catch (e) { /* ignore */ }
        const c = $('.tcontrols'), b = $('.tbar__pad'); if (c) c.classList.toggle('is-pad', on); if (b) b.setAttribute('aria-pressed', String(on));
        fitBoard(); if (L) resize();
        say(on ? 'Tap the arrows to move the unicorn 🎮' : 'Drag your finger along the maze 👆');
    }
    function bindPad(root) {
        let timer = 0, rep = 0;
        const stop = () => { clearTimeout(timer); clearInterval(rep); };
        const move = d => { if (state === 'draw') { const ok = step(neighbour(L.n, path[path.length - 1], +d)); if (!ok) vibrate(8); } };
        $('.dpad', root).addEventListener('pointerdown', e => {
            const b = e.target.closest('[data-dir]'); if (!b) return;
            e.preventDefault(); stop(); move(b.dataset.dir);
            timer = setTimeout(() => { rep = setInterval(() => move(b.dataset.dir), 140); }, 320);
        });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => $('.dpad', root).addEventListener(t, stop));
        $('.dpad', root).addEventListener('contextmenu', e => e.preventDefault());
        $('.dpad', root).addEventListener('click', e => { const b = e.target.closest('[data-dir]'); if (b && e.detail === 0) move(b.dataset.dir); });   // keyboard / screen-reader activation
    }

    function newMaze() {
        token++;
        cfg = LEVELS[levelIdx]; L = buildLevel(cfg);
        path = [L.start]; state = 'draw'; run = null; hint = null; hinted = false; penalty = 0; bumps = 0; bumpCell = -1; finished = false; parts = []; shake = {}; dragging = false; lastPt = null;
        faceS = L.start % L.n > L.n / 2 ? -1 : 1;
        glints = Array.from({ length: 12 }, () => ({ x: Math.random(), y: Math.random(), r: 1.5 + Math.random() * 2.5, p: Math.random() * 6.3 }));
        mazeNo++;
        lvlEl.innerHTML = cfg.emoji + ' <span class="lvl-name">' + cfg.name + ' · </span>Maze <b>' + mazeNo + '</b>';
        document.querySelectorAll('.modal').forEach(x => x.remove());
        resize();
        say(pick(['Guide the unicorn to the castle 🏰', 'Draw a rainbow path home 🌈', 'Collect sparkles ✨ and avoid the obstacles!']));
        refresh();
    }

    function refresh() {
        sparkEl.textContent = sparkleCount() + '/' + L.sparkles.length;
        updateScore();
        curve = buildCurve(path);
    }

    function resize() {
        const box = canvas.parentElement, cssb = getComputedStyle(box);
        const w = Math.floor(box.clientWidth - parseFloat(cssb.paddingLeft) - parseFloat(cssb.paddingRight)) || 320;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        W0 = w; canvas.width = Math.round(w * dpr); canvas.height = Math.round(w * dpr); canvas.style.height = w + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        m = Math.max(6, w * 0.02); cs = (w - 2 * m) / L.n;
        curve = buildCurve(path);
        bake();
    }

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
        if (pts.length < 2 || d <= 0) return { x: pts[0].x, y: pts[0].y, dx: 1, dy: 0 };
        let i = 1; while (i < pts.length - 1 && cum[i] < d) i++;
        const seg = cum[i] - cum[i - 1] || 1, t = Math.min(1, (d - cum[i - 1]) / seg);
        return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t, dx: pts[i].x - pts[i - 1].x, dy: pts[i].y - pts[i - 1].y };
    }

    function partial(cv, d) {
        const out = [];
        for (let i = 0; i < cv.pts.length && cv.cum[i] <= d; i++) out.push(cv.pts[i]);
        const e = pointAt(cv, d); out.push({ x: e.x, y: e.y });
        return out;
    }

    /* ── Drawing the path: forgiving touch controls ── */
    function cellAt(px, py, margin) {
        const fx = (px - m) / cs, fy = (py - m) / cs, x = Math.floor(fx), y = Math.floor(fy);
        if (x < 0 || y < 0 || x >= L.n || y >= L.n) return -1;
        // Ignore the thin edge of each square so a wobbly finger doesn't flick between cells
        if (margin && (fx - x < margin || fx - x > 1 - margin || fy - y < margin || fy - y > 1 - margin)) return -1;
        return y * L.n + x;
    }

    function step(c) {
        if (state !== 'draw' || c < 0) return false;
        const last = path[path.length - 1];
        if (c === last || !adjacent(last, c)) return false;
        if (path.length > 1 && c === path[path.length - 2]) { path.pop(); hint = null; refresh(); return true; }
        if (path.includes(c)) return false;
        const dx = (c % L.n) - (last % L.n), dy = ((c / L.n) | 0) - ((last / L.n) | 0);
        const d = dx === 1 ? E : dx === -1 ? W : dy === 1 ? S : N;
        if (L.walls[last] & d) return false;
        if (L.obs[c]) {
            shake[c] = 0.45;
            if (bumpCell !== c) {
                bumpCell = c; bumps++; penalty += PENALTY;
                Kid.Sound.oops(); vibrate(40); updateScore(-1);
                popText(cx(c), cy(c) - cs * 0.3, '−' + PENALTY, '#E63C5A');
                say('Oops! The ' + NAMES[L.obs[c]] + ' ' + L.obs[c] + ' is in the way: −' + PENALTY + ' points. Go around!');
            }
            return false;
        }
        path.push(c); bumpCell = -1; hint = null; refresh();
        Kid.Sound.tone([NOTES[path.length % NOTES.length]], { dur: 0.1, vol: 0.035, type: 'sine' });
        if (L.sparkles.includes(c)) { Kid.Sound.pop(); vibrate(15); updateScore(1); popText(cx(c), cy(c) - cs * 0.3, '+' + SPARK, '#0E9C81'); say(pick(['✨ Sparkle collected! +' + SPARK, '✨ Ooh, shiny! +' + SPARK, '✨ Magic dust! +' + SPARK])); burst(cx(c), cy(c), 10); }
        if (c === L.home) go();
        return true;
    }

    // Steer the rainbow towards the finger: handles fast drags and cut corners
    function steerTo(target) {
        if (state !== 'draw' || target < 0) return;
        if (target !== bumpCell) bumpCell = -1;
        for (let guard = 0; guard < 3 && state === 'draw'; guard++) {
            const head = path[path.length - 1];
            if (target === head) return;
            const idx = path.indexOf(target);
            if (idx >= 0) {                       // finger went back along the rainbow → rewind
                if (path.length - 1 - idx <= 2) { path.length = idx + 1; hint = null; refresh(); }
                return;
            }
            if (adjacent(head, target)) { step(target); return; }
            const blocked = new Array(L.n * L.n).fill(false);
            Object.keys(L.obs).forEach(k => { blocked[k] = true; });
            path.forEach(c => { blocked[c] = true; });
            blocked[target] = false;
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
            if (state !== 'draw' || dragging) return;
            const p = local(e), c = cellAt(p.x, p.y), head = path[path.length - 1];
            const near = Math.hypot(p.x - cx(head), p.y - cy(head)) <= Math.max(cs * 1.9, 76);
            const idx = c >= 0 ? path.indexOf(c) : -1;
            if (idx >= 0 && idx < path.length - 1) { path.length = idx + 1; hint = null; refresh(); }
            else if (!near) { say('Touch the glowing end of your rainbow, then drag 🌈'); vibrate(10); return; }
            dragging = true; activeId = e.pointerId; lastPt = { x: cx(path[path.length - 1]), y: cy(path[path.length - 1]) };
            try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
            pointerPath(p.x, p.y); e.preventDefault();
        });
        canvas.addEventListener('pointermove', e => { if (dragging && e.pointerId === activeId) { const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; (evs.length ? evs : [e]).forEach(ev => { const p = local(ev); pointerPath(p.x, p.y); }); e.preventDefault(); } });
        const endDrag = e => { if (!dragging || (e && e.pointerId !== undefined && e.pointerId !== activeId)) return; dragging = false; lastPt = null; if (state === 'draw' && path.length > 1) say('Drag on from the glowing end to keep going 🌈'); };
        canvas.addEventListener('pointerup', endDrag);
        canvas.addEventListener('pointercancel', endDrag);
        canvas.addEventListener('lostpointercapture', endDrag);
        canvas.addEventListener('contextmenu', e => e.preventDefault());
        canvas.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    }

    // Arrow keys work anywhere on the page (no need to click the maze first)
    document.addEventListener('keydown', e => {
        if (!playing || document.querySelector('.modal') || e.ctrlKey || e.metaKey || e.altKey) return;
        const map = { ArrowUp: N, ArrowRight: E, ArrowDown: S, ArrowLeft: W, w: N, d: E, s: S, a: W };
        const d = map[e.key];
        if (d) { e.preventDefault(); if (state === 'draw') step(neighbour(L.n, path[path.length - 1], d)); }
        else if (e.key === 'Backspace' || e.key === 'z') { e.preventDefault(); act('undo'); }
        else if (e.key === 'Escape') act('clear');
    });

    /* ── Buttons ── */
    function act(a) {
        if (a === 'menu') { Kid.Sound.tap(); showMenu(); return; }
        if (a === 'pad') { Kid.Sound.tap(); setPad(!loadPad()); return; }
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
            if (!(hint && clock < hint.until)) {
                hinted = true; penalty += PENALTY; updateScore(-1);
                popText(cx(path[path.length - 1]), cy(path[path.length - 1]) - cs * 0.3, '−' + PENALTY, '#E63C5A');
            }
            hint = { cells: sol.slice(1, 5), until: clock + 4 };
            say('Follow the twinkling dots! 💫 (−' + PENALTY + ')');
        }
    }

    /* ── Gallop & win ── */
    function go() {
        state = 'run'; dragging = false; lastPt = null; hint = null;
        curve = buildCurve(path);
        run = { d: 0, t: 0, passed: new Set(), emit: 0 };
        say(pick(['Off we gallop! 🌈', 'Wheee! Here we go! 💨', 'Home sweet home, here I come! 🏰']));
    }

    function win() {
        state = 'won'; wonAt = clock; finished = true;
        const got = sparkleCount(), all = got === L.sparkles.length;
        const earned = 1 + (all ? 1 : 0) + (bumps === 0 && !hinted ? 1 : 0);
        const final = score(), isBest = final > save.best[levelIdx];
        save.solved[levelIdx]++; if (isBest) save.best[levelIdx] = final; writeSave(); updateScore(1);
        popText(cx(L.home), cy(L.home) - cs * 0.5, '+' + FINISH, '#7A5AF8');
        Kid.Stars.add(KEY, earned); Kid.Sound.play('correct'); Kid.confetti(50); vibrate([30, 40, 60]);
        for (let i = 0; i < 14; i++) burst(cx(L.home) + (Math.random() - 0.5) * cs, cy(L.home) - Math.random() * cs * 0.4, 1, 'heart');
        say(pick(['Hooray! The unicorn is home! 🏰💖', 'Safe and sound! 🦄💖', 'You did it! What a magical path! ✨']));
        const my = token;
        setTimeout(() => { if (my === token && playing) showModal(earned, got, final, isBest); }, reduced ? 700 : 1700);
    }

    function showModal(earned, got, final, isBest) {
        const mo = document.createElement('div'); mo.className = 'modal';
        const tip = earned === 3 ? 'A perfect magical journey!' : 'For 3 ⭐ collect every sparkle, dodge every obstacle and skip the hints.';
        mo.innerHTML = '<div class="modal__card"><img class="modal__unicorn" src="images/trail/unicorn.png" alt=""><h2 class="modal__title">Unicorn is home!</h2>' +
            '<div class="result__stars" aria-label="' + earned + ' of 3 stars">' + [0, 1, 2].map(i => '<span class="' + (i < earned ? 'lit' : 'dim') + '" style="--i:' + i + '">⭐</span>').join('') + '</div>' +
            '<p class="modal__text">' + tip + '</p>' +
            '<div class="result__big"><span>Score</span><b>' + final + '</b>' + (isBest ? '<em>New best! 🎉</em>' : '<small>Best ' + save.best[levelIdx] + '</small>') + '</div>' +
            '<div class="result__score"><div class="result__stat"><b>' + got + '/' + L.sparkles.length + '</b><span>Sparkles</span></div>' +
            '<div class="result__stat"><b>' + bumps + '</b><span>Bumps</span></div>' +
            '<div class="result__stat"><b>' + save.solved[levelIdx] + '</b><span>Solved</span></div></div>' +
            '<div class="modal__actions"><button class="btn btn--primary" type="button" data-m="next">Next maze 🌈</button>' +
            '<button class="btn btn--ghost" type="button" data-m="menu">Choose level 🗺️</button></div></div>';
        document.body.appendChild(mo);
        $('[data-m="next"]', mo).onclick = () => { Kid.Sound.tap(); newMaze(); };
        $('[data-m="menu"]', mo).onclick = () => { Kid.Sound.tap(); showMenu(); };
        $('[data-m="next"]', mo).focus();
    }

    /* ── Particles ── */
    const PASTELS = ['#FF9EC4', '#FFC48F', '#FFE680', '#A8F0D6', '#9ED8FF', '#C9B2FF'];
    function burst(x, y, n, type) {
        if (reduced) n = Math.ceil(n / 3);
        if (parts.length > 140) return;
        for (let i = 0; i < n; i++) {
            const a = Math.random() * 6.283, sp = type === 'heart' ? 20 + Math.random() * 40 : 40 + Math.random() * 90;
            parts.push({ x, y, vx: Math.cos(a) * sp, vy: type === 'heart' ? -30 - Math.random() * 60 : Math.sin(a) * sp - 20, life: 0, max: 0.7 + Math.random() * 0.8, type: type || 'spark', color: pick(PASTELS), size: 3 + Math.random() * 5 });
        }
    }

    /* ── Frame ── */
    let lastTs = 0;
    function frame(ts) {
        const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0); lastTs = ts; clock += dt;
        if (playing && L && ctx) { update(dt); draw(); }
        requestAnimationFrame(frame);
    }

    function update(dt) {
        for (const k in shake) if ((shake[k] -= dt) <= 0) delete shake[k];
        parts = parts.filter(p => { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.type === 'spark' ? 90 : -10) * dt; return p.life < p.max; });
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
    function sprite(name, x, y, size) {
        const i = IMG[name];
        if (!i || !i.complete || !i.naturalWidth) return false;
        ctx.drawImage(i, x - size / 2, y - size / 2, size, size); return true;
    }
    function emoji(ch, x, y, size) { ctx.font = size + 'px ' + EMOJI; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ch, x, y); }
    function star4(x, y, r) {
        ctx.beginPath();
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, rr2 = i % 2 ? r * 0.35 : r; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
        ctx.closePath(); ctx.fill();
    }
    function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }

    function ribbon(pts) {
        if (pts.length < 2) return;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const bands = [['#FF9EC4', 1], ['#FFC48F', 0.78], ['#FFEE9E', 0.58], ['#A8F0D6', 0.4], ['#9ED8FF', 0.22]];
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        for (const [col, k] of bands) { ctx.strokeStyle = col; ctx.lineWidth = cs * 0.38 * k; ctx.stroke(); }
    }

    /* Soft glows are rendered once and re-used (shadowBlur every frame is slow on phones) */
    const GLOWS = {};
    function glow(rgb) {
        if (GLOWS[rgb]) return GLOWS[rgb];
        const c = document.createElement('canvas'); c.width = c.height = 64;
        const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        r.addColorStop(0, 'rgba(' + rgb + ',.95)'); r.addColorStop(0.45, 'rgba(' + rgb + ',.35)'); r.addColorStop(1, 'rgba(' + rgb + ',0)');
        g.fillStyle = r; g.fillRect(0, 0, 64, 64);
        return (GLOWS[rgb] = c);
    }
    function halo(x, y, r, rgb, a) { ctx.globalAlpha = a === undefined ? 1 : a; ctx.drawImage(glow(rgb), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1; }
    function groundShadow(x, y, rx, a) { ctx.fillStyle = 'rgba(100,70,180,' + (a || 0.18) + ')'; ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.26, 0, 0, 6.283); ctx.fill(); }

    /* The floor and walls never change during a maze, so draw them once into an off-screen canvas */
    let baked = null;
    function bake() {
        if (!L || !ctx) return;
        const dpr = canvas.width / W0, real = ctx;
        baked = document.createElement('canvas'); baked.width = canvas.width; baked.height = canvas.height;
        const bctx = baked.getContext('2d'); bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx = bctx;
        const size = W0, n = L.n;
        const bg = ctx.createLinearGradient(0, 0, size, size); bg.addColorStop(0, '#FFF1F8'); bg.addColorStop(0.5, '#F4EEFF'); bg.addColorStop(1, '#E6F4FF');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size);
        for (let c = 0; c < n * n; c++) {
            const x = c % n, y = (c / n) | 0;
            ctx.fillStyle = (x + y) % 2 ? 'rgba(255,214,236,.36)' : 'rgba(214,200,255,.30)';
            ctx.fillRect(m + x * cs, m + y * cs, cs, cs);
        }
        const wp = new Path2D();
        for (let c = 0; c < n * n; c++) {
            const x = c % n, y = (c / n) | 0, x0 = m + x * cs, y0 = m + y * cs, w = L.walls[c];
            if (w & N) { wp.moveTo(x0, y0); wp.lineTo(x0 + cs, y0); }
            if (w & W) { wp.moveTo(x0, y0); wp.lineTo(x0, y0 + cs); }
            if (x === n - 1 && w & E) { wp.moveTo(x0 + cs, y0); wp.lineTo(x0 + cs, y0 + cs); }
            if (y === n - 1 && w & S) { wp.moveTo(x0, y0 + cs); wp.lineTo(x0 + cs, y0 + cs); }
        }
        const lw = Math.min(13, cs * 0.15);
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(120,90,200,.18)'; ctx.lineWidth = lw + 3; ctx.save(); ctx.translate(0, 2); ctx.stroke(wp); ctx.restore();
        ctx.strokeStyle = '#B9A2F5'; ctx.lineWidth = lw; ctx.stroke(wp);
        ctx.strokeStyle = '#F6EEFF'; ctx.lineWidth = lw * 0.4; ctx.stroke(wp);
        ctx = real;
    }

    function draw() {
        const t = clock, size = W0;
        ctx.clearRect(0, 0, size, size);
        ctx.save(); rr(0, 0, size, size, 22); ctx.clip();
        if (baked) ctx.drawImage(baked, 0, 0, size, size);
        ctx.fillStyle = '#fff';
        glints.forEach(g => { ctx.globalAlpha = 0.25 + 0.55 * Math.max(0, Math.sin(t * 1.6 + g.p)); star4(g.x * size, g.y * size, g.r * (cs / 40 + 0.6)); });
        ctx.globalAlpha = 1;

        // Home glow + start pad
        const hx = cx(L.home), hy = cy(L.home), pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
        halo(hx, hy, cs * (0.95 + pulse * 0.12), '255,226,120', 0.9);
        ctx.fillStyle = 'rgba(190,160,255,.25)'; ctx.beginPath(); ctx.arc(cx(L.start), cy(L.start), cs * 0.42, 0, 6.283); ctx.fill();

        // Rainbow path
        if (path.length > 1) ribbon(state === 'run' ? partial(curve, run.d) : curve.pts);

        // Glowing end of the rainbow — where the finger should go
        if (state === 'draw' && path.length > 1) {
            const h = path[path.length - 1], k = 1 + Math.sin(t * 5) * 0.12;
            halo(cx(h), cy(h), cs * 0.55 * k, '255,120,190', 0.85);
            ctx.fillStyle = '#fff'; ctx.strokeStyle = '#FF7FB5'; ctx.lineWidth = Math.max(3, cs * 0.07);
            ctx.beginPath(); ctx.arc(cx(h), cy(h), cs * 0.2 * k, 0, 6.283); ctx.fill(); ctx.stroke();
        }

        // Sparkles
        L.sparkles.forEach((c, i) => {
            if (state === 'run' && run.passed.has(c)) return;
            const on = path.includes(c), k = 1 + Math.sin(t * 4 + i) * 0.1;
            halo(cx(c), cy(c), cs * (on ? 0.55 : 0.46), '255,205,70', on ? 1 : 0.8);
            if (!sprite('star', cx(c), cy(c), cs * 0.62 * k)) { ctx.fillStyle = '#FFD84D'; star4(cx(c), cy(c), cs * 0.27 * k); }
        });

        // Hint dots
        if (hint && clock < hint.until) hint.cells.forEach((c, i) => {
            const a = 0.5 + 0.5 * Math.sin(t * 7 - i * 1.2);
            halo(cx(c), cy(c), cs * (0.3 + a * 0.12), '179,140,255', 1);
            ctx.fillStyle = 'rgba(255,255,255,' + (0.6 + a * 0.4) + ')';
            ctx.beginPath(); ctx.arc(cx(c), cy(c), cs * (0.09 + a * 0.05), 0, 6.283); ctx.fill();
        });

        // Home castle
        const bob = Math.sin(t * 2) * cs * 0.02;
        const cz = cs * (state === 'won' ? 0.92 + Math.abs(Math.sin((t - wonAt) * 5)) * 0.07 : 0.86);
        groundShadow(hx, hy + cs * 0.34, cs * 0.3);
        if (!sprite('castle', hx, hy + bob, cz)) { ctx.fillStyle = '#000'; emoji('🏰', hx, hy + bob, cz * 0.8); }

        // Cute obstacles
        for (const k in L.obs) {
            const c = +k;
            if (shake[c]) halo(cx(c), cy(c), cs * 0.6, '255,90,120', Math.min(1, shake[c] / 0.3));
            const sh = shake[c] ? Math.sin(shake[c] * 60) * cs * 0.06 * (shake[c] / 0.45) : 0;
            groundShadow(cx(c), cy(c) + cs * 0.3, cs * 0.24, 0.16);
            const oy = cy(c) + Math.sin(t * 2.3 + c) * cs * 0.025, oz = cs * 0.72;
            if (!sprite(SPRITE[L.obs[c]], cx(c) + sh, oy, oz)) { ctx.fillStyle = '#000'; emoji(L.obs[c], cx(c) + sh, oy, cs * 0.58); }
        }

        // Unicorn
        let ux, uy, moving = false, phase = 0, hop = 0;
        if (state === 'run') { const p = pointAt(curve, run.d); ux = p.x; uy = p.y; moving = true; phase = run.d / cs * 3.4; }
        else if (state === 'won') { ux = hx; uy = hy + cs * 0.1; hop = 1; }
        else { ux = cx(L.start); uy = cy(L.start); }
        drawUnicorn(ux, uy, t, moving, phase, hop);

        // Particles
        parts.forEach(p => {
            const a = 1 - p.life / p.max; ctx.globalAlpha = Math.max(0, a);
            if (p.type === 'text') { ctx.font = '700 ' + Math.max(16, cs * 0.42) + 'px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.strokeStyle = '#fff'; ctx.strokeText(p.text, p.x, p.y); ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y); }
            else if (p.type === 'heart') { if (!sprite('heart', p.x, p.y, cs * 0.4)) { ctx.fillStyle = '#000'; emoji('💖', p.x, p.y, cs * 0.3); } }
            else { ctx.fillStyle = p.color; star4(p.x, p.y, p.size * (0.5 + a * 0.6)); }
            ctx.globalAlpha = 1;
        });
        ctx.restore();
    }

    function drawUnicorn(x, y, t, moving, phase, hop) {
        const size = cs * 1.02;
        const bob = moving ? -Math.abs(Math.sin(phase)) * cs * 0.09 : hop ? -Math.abs(Math.sin((t - wonAt) * 6)) * cs * 0.24 : Math.sin(t * 3) * cs * 0.025;
        const lift = Math.min(1, Math.abs(bob) / (cs * 0.2));
        groundShadow(x, y + cs * 0.4, cs * (0.3 - lift * 0.08), 0.24 - lift * 0.1);
        ctx.save();
        ctx.translate(x, y + cs * 0.06 + bob);
        ctx.rotate((moving ? Math.sin(phase) * 0.1 - 0.05 : Math.sin(t * 2) * 0.03) * faceS);
        const sq = moving ? 1 + Math.sin(phase * 2) * 0.05 : 1 + Math.sin(t * 3) * 0.015;
        ctx.scale(-faceS * sq, 1 / sq);               // the artwork faces left, so flip it for "right"
        if (!sprite('unicorn', 0, 0, size)) { ctx.fillStyle = '#000'; emoji('🦄', 0, 0, size * 0.8); }
        ctx.restore();
    }

    requestAnimationFrame(frame);
    const wanted = new URLSearchParams(location.search).get('level');
    if (wanted !== null && LEVELS[+wanted]) { levelIdx = +wanted; startPlay(); } else showMenu();
})();
