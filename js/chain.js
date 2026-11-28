/* Chain Reaction — neon orbs on a 9 × 6 grid. 2–4 players, pass-and-play or vs a simple AI.
   Rules: a cell explodes at critical mass (corner 2, edge 3, interior 4): it empties and sends 1 orb into each orthogonal
   neighbour, which converts that neighbour to the exploding colour and may explode in turn. Once every player has played at
   least once, anyone with no orbs is eliminated; the last player standing wins. */
(function () {
    'use strict';
    const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
    const RK = window.RK = window.RK || {};
    const A = RK.Audio || { state: { music: true, sfx: true }, play() {}, stop() {}, sfx() {}, unlock() {}, setMusic() {}, setSfx() {}, pause() {}, resume() {} };
    const app = $('#app');

    /* ═══════════════ Pure game rules (no DOM) ═══════════════ */
    const ROWS = 9, COLS = 6;
    const COLORS = [
        { id: 'red', name: 'Red', hex: '#FF3B6B', rgb: '255,59,107' },
        { id: 'blue', name: 'Blue', hex: '#2EA8FF', rgb: '46,168,255' },
        { id: 'green', name: 'Green', hex: '#27F59A', rgb: '39,245,154' },
        { id: 'yellow', name: 'Yellow', hex: '#FFD93B', rgb: '255,217,59' }
    ];
    const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const inside = (r, c) => r >= 0 && c >= 0 && r < ROWS && c < COLS;
    const neighbours = (r, c) => DIRS.map(d => [r + d[0], c + d[1]]).filter(p => inside(p[0], p[1]));
    const capOf = (r, c) => neighbours(r, c).length;          // 2 for corners, 3 for edges, 4 for the inside
    const newGrid = () => Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ({ n: 0, o: -1 })));
    const cloneGrid = g => g.map(row => row.map(c => ({ n: c.n, o: c.o })));
    const orbCounts = (g, np) => { const k = new Array(np).fill(0); g.forEach(row => row.forEach(c => { if (c.o >= 0) k[c.o] += c.n; })); return k; };
    const ownersPresent = g => { const s = new Set(); g.forEach(row => row.forEach(c => { if (c.o >= 0 && c.n > 0) s.add(c.o); })); return s; };
    const canPlay = (g, r, c, p) => g[r][c].o === -1 || g[r][c].o === p;

    /* One chain-reaction wave. Returns the cells that exploded (empty list = the board is stable).
       All unstable cells explode together; each sends one orb to every orthogonal neighbour. */
    function explodeWave(g, mover) {
        const boom = [];
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (g[r][c].n >= capOf(r, c) && g[r][c].n > 0) boom.push([r, c]);
        boom.forEach(([r, c]) => { g[r][c].n = 0; g[r][c].o = -1; });
        const arrivals = [];
        boom.forEach(([r, c]) => neighbours(r, c).forEach(([nr, nc]) => arrivals.push({ from: [r, c], to: [nr, nc] })));
        return { boom, arrivals };
    }
    function applyArrivals(g, arrivals, mover) { arrivals.forEach(a => { const cell = g[a.to[0]][a.to[1]]; cell.n += 1; cell.o = mover; }); }

    /* Is the game decided right now? (everyone has had a turn and only one colour has orbs left) */
    const decided = (g, tookAll) => tookAll && ownersPresent(g).size <= 1;

    /* Synchronous full resolution — used by the AI to look ahead. */
    function resolveSync(g, mover, tookAll, maxWaves) {
        let waves = 0, limit = maxWaves || 120;
        while (waves < limit) {
            const w = explodeWave(g, mover);
            if (!w.boom.length) break;
            applyArrivals(g, w.arrivals, mover); waves++;
            if (decided(g, tookAll)) break;
        }
        return waves;
    }
    function simulate(g, r, c, p, tookAll) { const s = cloneGrid(g); s[r][c].n += 1; s[r][c].o = p; resolveSync(s, p, tookAll); return s; }

    /* ═══════════════ Simple AI ═══════════════ */
    function aiChoose(g, me, players, tookAll) {
        const np = players.length, alive = players.map(p => p.alive);
        let best = null, bestScore = -1e9;
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
            if (!canPlay(g, r, c, me)) continue;
            const s = simulate(g, r, c, me, tookAll), k = orbCounts(s, np);
            let enemy = 0, killed = 0;
            for (let i = 0; i < np; i++) if (i !== me && alive[i]) { enemy += k[i]; if (k[i] === 0 && tookAll) killed++; }
            let score = k[me] - 1.15 * enemy + killed * 30;
            // be careful: my cells next to an enemy cell that is one orb from exploding would be captured
            for (let rr = 0; rr < ROWS; rr++) for (let cc = 0; cc < COLS; cc++) {
                const cell = s[rr][cc]; if (cell.o !== me || cell.n === 0) continue;
                neighbours(rr, cc).forEach(([nr, nc]) => { const e = s[nr][nc]; if (e.o >= 0 && e.o !== me && e.n >= capOf(nr, nc) - 1) score -= 1.6 + cell.n * 0.5; });
            }
            // safe growth: prefer building where the cell is near critical but nobody threatens it, and corners early
            if (capOf(r, c) === 2) score += 0.8;
            if (g[r][c].n === capOf(r, c) - 1) score += 0.6;
            score += Math.random() * 0.9;
            if (score > bestScore) { bestScore = score; best = [r, c]; }
        }
        return best;
    }

    /* ═══════════════ Settings and game state ═══════════════ */
    const SAVE_KEY = 'lokakids.chain.v1';
    let cfg = { mode: 'local', players: 2, music: true, sfx: true, vibe: true, wins: [0, 0, 0, 0], played: 0 };
    try { Object.assign(cfg, JSON.parse(localStorage.getItem(SAVE_KEY)) || {}); } catch (e) { /* ignore */ }
    const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(cfg)); } catch (e) { /* ignore */ } };
    const vibrate = p => { try { if (cfg.vibe && navigator.vibrate) navigator.vibrate(p); } catch (e) { /* ignore */ } };
    if (RK.Audio) { A.setMusic(cfg.music); A.setSfx(cfg.sfx); }

    let G = null;            // the current game
    function newGame() {
        const np = cfg.players, players = Array.from({ length: np }, (_, i) => ({ id: i, color: COLORS[i], alive: true, ai: cfg.mode === 'ai' && i > 0, took: false }));
        G = { grid: newGrid(), players, cur: 0, turns: 0, over: false, winner: -1, busy: false, maxChain: 0, chains: 0 };
    }
    const tookAll = () => G.players.every(p => p.took);

    /* ═══════════════ Screens ═══════════════ */
    let screen = 'setup';
    function setScreen(s) { screen = s; document.body.dataset.screen = s; }
    function modal(html, cls) {
        closeModal();
        const m = document.createElement('div'); m.className = 'modal ' + (cls || ''); m.innerHTML = '<div class="modal__card">' + html + '</div>';
        document.body.appendChild(m); requestAnimationFrame(() => m.classList.add('in')); return m;
    }
    function closeModal() { $$('.modal').forEach(m => m.remove()); }

    function showSetup() {
        stopLoop(); closeModal(); setScreen('setup'); G = null;
        const dots = n => COLORS.slice(0, n).map(c => '<i style="--c:' + c.hex + '"></i>').join('');
        app.innerHTML =
            '<section class="scr scr--setup">' +
            '<div class="topline"><a class="ibtn" href="index.html" aria-label="Home">🏠</a><span class="sp"></span>' + toggles() + '</div>' +
            '<div class="hero"><div class="demo" aria-hidden="true"><i style="--c:#FF3B6B"></i><i style="--c:#2EA8FF"></i><i style="--c:#27F59A"></i><i style="--c:#FFD93B"></i></div>' +
            '<h1 class="logo"><span>Chain</span><b>Reaction</b></h1><p class="tag">Neon orbs · 9 × 6 grid · last player standing wins</p></div>' +
            '<div class="panel"><h3>Game mode</h3><div class="seg" data-seg="mode">' +
            '<button data-mode="local" class="' + (cfg.mode === 'local' ? 'on' : '') + '"><i>👥</i><b>Pass &amp; Play</b><small>Friends share one device</small></button>' +
            '<button data-mode="ai" class="' + (cfg.mode === 'ai' ? 'on' : '') + '"><i>🤖</i><b>vs Computer</b><small>You are Red, the AI plays the rest</small></button></div>' +
            '<h3>Players</h3><div class="seg seg--n">' + [2, 3, 4].map(n => '<button data-n="' + n + '" class="' + (cfg.players === n ? 'on' : '') + '"><span class="dots">' + dots(n) + '</span><b>' + n + ' players</b></button>').join('') + '</div></div>' +
            '<div class="menu"><button class="btn-big" data-act="start">Start game ▶</button><button class="btn-sub" data-act="how">❓ How to play</button></div></section>';
        A.play('neon');
    }
    const toggles = () => '<button class="ibtn' + (cfg.music ? '' : ' off') + '" data-act="music" aria-label="Music">🎵</button><button class="ibtn' + (cfg.sfx ? '' : ' off') + '" data-act="sfx" aria-label="Sound effects">🔊</button>';

    function showHow() {
        modal('<h2>How to play</h2><ul class="how">' +
            '<li><i style="--c:#FF3B6B" class="o"></i><span><b>Tap an empty cell</b> or one of your own to add an orb.</span></li>' +
            '<li><i class="num">2·3·4</i><span><b>Critical mass:</b> corners explode at 2 orbs, edges at 3, the middle at 4.</span></li>' +
            '<li><i class="num">💥</i><span><b>Chain reaction:</b> an exploding cell empties and sends an orb to each neighbour, turning them your colour — and they may explode too!</span></li>' +
            '<li><i class="num">🏆</i><span><b>Win:</b> once everyone has played, a player with no orbs is out. Be the last one standing!</span></li></ul>' +
            '<button class="btn-big" data-act="close">Got it!</button>');
    }

    /* ═══════════════ Game screen ═══════════════ */
    let canvas, ctx, cs = 40, W0 = 240, H0 = 360, running = false, rafId = 0, lastTs = 0, clock = 0, ro = null, gridCache = null, gridColor = '', hoverCell = null;
    let flights = [], rings = [], sparks = [], pops = {}, shakes = {}, floaters = [];

    function startGame() {
        newGame(); closeModal(); stopLoop(); setScreen('game'); A.unlock();
        app.innerHTML =
            '<section class="scr scr--game">' +
            '<header class="hud"><button class="ibtn" data-act="pause" aria-label="Menu">☰</button><div class="turn" id="turn"></div><span class="sp"></span>' + toggles() + '</header>' +
            '<div class="players" id="players" data-n="' + G.players.length + '"></div>' +
            '<div class="boardwrap"><div class="board"><canvas tabindex="0" role="application" aria-label="Game board, 9 rows by 6 columns. Tap a cell to add an orb."></canvas></div></div>' +
            '<p class="hint" id="hint"></p></section>';
        canvas = $('canvas'); ctx = canvas.getContext('2d');
        bindCanvas(); observe();
        flights = []; rings = []; sparks = []; pops = {}; shakes = {}; floaters = [];
        running = true; lastTs = 0; rafId = requestAnimationFrame(frame);
        resize(); renderPlayers(); A.play('neon');
        beginTurn();
    }
    function stopLoop() { running = false; cancelAnimationFrame(rafId); if (ro) { ro.disconnect(); ro = null; } }
    function observe() { const box = $('.boardwrap'); if (window.ResizeObserver) { ro = new ResizeObserver(() => { if (running) resize(); }); ro.observe(box); } else window.addEventListener('resize', () => { if (running) resize(); }); }

    function resize() {
        const box = $('.boardwrap'), bw = box.clientWidth - 8, bh = box.clientHeight - 8;
        cs = Math.max(28, Math.floor(Math.min(bw / COLS, bh / ROWS)));
        W0 = cs * COLS; H0 = cs * ROWS;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(W0 * dpr); canvas.height = Math.round(H0 * dpr); canvas.style.width = W0 + 'px'; canvas.style.height = H0 + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); gridCache = null;
    }

    /* ── players bar ── */
    function renderPlayers() {
        const orbs = orbCounts(G.grid, G.players.length);
        $('#players').innerHTML = G.players.map(p => '<div class="pl' + (p.id === G.cur && !G.over ? ' on' : '') + (p.alive ? '' : ' out') + '" style="--c:' + p.color.hex + ';--rgb:' + p.color.rgb + '"><i class="pl__orb"></i><b>' + p.color.name + (p.ai ? ' <small>AI</small>' : '') + '</b><span>' + orbs[p.id] + '</span>' + (p.alive ? '' : '<em>OUT</em>') + '</div>').join('');
        const cur = G.players[G.cur];
        $('#turn').innerHTML = G.over ? '<b>Game over</b>' : '<i class="dotc" style="--c:' + cur.color.hex + '"></i><b style="color:' + cur.color.hex + '">' + cur.color.name + (cur.ai ? ' is thinking…' : "'s turn") + '</b>';
        document.documentElement.style.setProperty('--turn', cur.color.hex); document.documentElement.style.setProperty('--turn-rgb', cur.color.rgb);
        const h = $('#hint'); if (h) h.textContent = G.over ? '' : cur.ai ? 'The computer is choosing a cell…' : G.players.length > 1 && cfg.mode === 'local' ? 'Pass the device to ' + cur.color.name + ' · tap an empty cell or one of yours' : 'Tap an empty cell or one of your own';
    }

    /* ── turn flow ── */
    const wait = ms => new Promise(r => setTimeout(r, ms));
    function nextAlive(from) { let i = from; for (let k = 0; k < G.players.length; k++) { i = (i + 1) % G.players.length; if (G.players[i].alive) return i; } return from; }
    function beginTurn() {
        if (G.over) return;
        G.busy = false; renderPlayers();
        const p = G.players[G.cur];
        if (p.ai) { G.busy = true; wait(650 + Math.random() * 500).then(() => { if (!running || G.over || G.players[G.cur] !== p) return; const mv = aiChoose(G.grid, p.id, G.players, tookAll()); if (mv) play(mv[0], mv[1]); else endTurn(); }); }
    }

    async function play(r, c) {
        const p = G.players[G.cur];
        if (G.over || (G.busy && !p.ai) || !canPlay(G.grid, r, c, p.id)) return false;
        G.busy = true; p.took = true; G.turns++;
        const cell = G.grid[r][c]; cell.n += 1; cell.o = p.id; pops[r + ',' + c] = clock;
        A.sfx('place', { i: p.id }); vibrate(10); renderPlayers();
        await wait(140);
        // chain reaction, one wave at a time so every step can be seen
        let waves = 0;
        while (running && waves < 300) {
            const w = explodeWave(G.grid, p.id);
            if (!w.boom.length) break;
            waves++;
            A.sfx('boom', { i: Math.min(waves, 8) }); vibrate(waves > 2 ? 25 : 12);
            w.boom.forEach(([br, bc]) => { rings.push({ x: (bc + 0.5) * cs, y: (br + 0.5) * cs, t: clock, c: p.color }); for (let k = 0; k < 8; k++) sparks.push({ x: (bc + 0.5) * cs, y: (br + 0.5) * cs, a: Math.random() * 6.283, s: 40 + Math.random() * 110, t: clock, l: 0.5 + Math.random() * 0.4, c: p.color }); });
            w.arrivals.forEach(a => flights.push({ x0: (a.from[1] + 0.5) * cs, y0: (a.from[0] + 0.5) * cs, x1: (a.to[1] + 0.5) * cs, y1: (a.to[0] + 0.5) * cs, t: clock, d: 0.26, c: p.color }));
            renderPlayers();
            await wait(290);
            applyArrivals(G.grid, w.arrivals, p.id);
            w.arrivals.forEach(a => { pops[a.to[0] + ',' + a.to[1]] = clock; });
            renderPlayers();
            if (decided(G.grid, tookAll())) break;
            await wait(50);
        }
        G.chains++; G.maxChain = Math.max(G.maxChain, waves);
        endTurn(waves);
        return true;
    }

    function endTurn(waves) {
        if (!running) return;
        const np = G.players.length, orbs = orbCounts(G.grid, np);
        if (tookAll()) G.players.forEach(pl => { if (pl.alive && orbs[pl.id] === 0) { pl.alive = false; A.sfx('elim'); vibrate([30, 40, 30]); floaters.push({ text: pl.color.name + ' is out!', t: clock, c: pl.color }); } });
        const alive = G.players.filter(pl => pl.alive);
        if (alive.length <= 1 && tookAll()) { finish(alive[0] ? alive[0].id : G.cur); return; }
        G.cur = nextAlive(G.cur); gridCache = null; beginTurn();
    }

    function finish(w) {
        G.over = true; G.winner = w; G.busy = false; renderPlayers();
        cfg.wins[w] = (cfg.wins[w] || 0) + 1; cfg.played++; persist();
        const p = G.players[w];
        A.sfx('win'); vibrate([40, 40, 80]); try { Kid.confetti(60); } catch (e) { /* ignore */ }
        setTimeout(() => { if (!G || !G.over) return; modal('<div class="trophy" style="--c:' + p.color.hex + '">🏆</div><h2 style="color:' + p.color.hex + '">' + p.color.name + (p.ai ? ' (AI)' : '') + ' wins!</h2>' +
            '<p class="muted">' + (G.players.length - 1) + ' ' + (G.players.length - 1 === 1 ? 'opponent' : 'opponents') + ' defeated in ' + G.turns + ' moves · biggest chain ' + G.maxChain + ' 💥</p>' +
            '<div class="row"><button class="btn-big" data-act="again">Play again ▶</button></div><div class="row"><button class="btn-sub" data-act="setup">⚙️ Change setup</button></div>', 'result'); }, 900);
    }

    /* ── input ── */
    const cellFromEvent = e => { const r = canvas.getBoundingClientRect(); const x = (e.clientX - r.left) * W0 / r.width, y = (e.clientY - r.top) * H0 / r.height, c = Math.floor(x / cs), rr = Math.floor(y / cs); return inside(rr, c) ? [rr, c] : null; };
    function bindCanvas() {
        canvas.addEventListener('pointerdown', e => {
            A.unlock(); if (!G || G.over || G.busy || G.players[G.cur].ai) return;
            const cl = cellFromEvent(e); if (!cl) return; e.preventDefault();
            if (!canPlay(G.grid, cl[0], cl[1], G.cur)) { shakes[cl[0] + ',' + cl[1]] = clock; A.sfx('no'); vibrate(15); return; }
            play(cl[0], cl[1]);
        });
        canvas.addEventListener('pointermove', e => { hoverCell = (G && !G.busy && !G.over && !G.players[G.cur].ai && e.pointerType === 'mouse') ? cellFromEvent(e) : null; });
        canvas.addEventListener('pointerleave', () => { hoverCell = null; });
        canvas.addEventListener('contextmenu', e => e.preventDefault());
        canvas.addEventListener('keydown', e => { /* keyboard: arrows move a cursor, Enter plays */
            if (!G || G.over || G.busy || G.players[G.cur].ai) return;
            const k = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
            if (k) { e.preventDefault(); hoverCell = hoverCell ? [clampN(hoverCell[0] + k[0], 0, ROWS - 1), clampN(hoverCell[1] + k[1], 0, COLS - 1)] : [4, 2]; }
            else if ((e.key === 'Enter' || e.key === ' ') && hoverCell) { e.preventDefault(); if (canPlay(G.grid, hoverCell[0], hoverCell[1], G.cur)) play(hoverCell[0], hoverCell[1]); }
        });
    }
    const clampN = (v, a, b) => Math.max(a, Math.min(b, v));

    /* ═══════════════ Rendering ═══════════════ */
    const spriteCache = {};
    function orbSprite(color) {
        if (spriteCache[color.id]) return spriteCache[color.id];
        const s = 96, c = document.createElement('canvas'); c.width = c.height = s; const g = c.getContext('2d');
        const halo = g.createRadialGradient(s / 2, s / 2, s * 0.18, s / 2, s / 2, s / 2); halo.addColorStop(0, 'rgba(' + color.rgb + ',.55)'); halo.addColorStop(1, 'rgba(' + color.rgb + ',0)'); g.fillStyle = halo; g.fillRect(0, 0, s, s);
        const r = s * 0.26, body = g.createRadialGradient(s / 2 - r * 0.35, s / 2 - r * 0.4, r * 0.1, s / 2, s / 2, r);
        body.addColorStop(0, '#FFFFFF'); body.addColorStop(0.35, color.hex); body.addColorStop(1, 'rgba(' + color.rgb + ',.82)');
        g.fillStyle = body; g.beginPath(); g.arc(s / 2, s / 2, r, 0, 6.283); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5; g.stroke();
        return (spriteCache[color.id] = c);
    }
    function bakeGrid() {
        const dpr = canvas.width / W0, c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height;
        const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const col = G.players[G.cur].color;
        g.fillStyle = '#0B0B22'; g.fillRect(0, 0, W0, H0);
        const bg = g.createRadialGradient(W0 / 2, H0 / 2, 10, W0 / 2, H0 / 2, Math.max(W0, H0) * 0.7); bg.addColorStop(0, 'rgba(' + col.rgb + ',.12)'); bg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = bg; g.fillRect(0, 0, W0, H0);
        g.lineWidth = 2; g.lineCap = 'round';
        for (let pass = 0; pass < 2; pass++) {
            g.strokeStyle = pass ? 'rgba(' + col.rgb + ',.95)' : 'rgba(' + col.rgb + ',.35)'; g.lineWidth = pass ? 1.6 : 5;
            g.beginPath();
            for (let i = 0; i <= COLS; i++) { g.moveTo(i * cs, 0); g.lineTo(i * cs, H0); }
            for (let j = 0; j <= ROWS; j++) { g.moveTo(0, j * cs); g.lineTo(W0, j * cs); }
            g.stroke();
        }
        gridColor = col.id; return c;
    }
    const easeOut = t => 1 - Math.pow(1 - t, 3);
    function frame(ts) {
        if (!running) return;
        rafId = requestAnimationFrame(frame);
        const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0); lastTs = ts; clock += dt;
        draw();
    }
    function draw() {
        if (!G) return;
        const cur = G.players[G.cur];
        if (!gridCache || gridColor !== cur.color.id) gridCache = bakeGrid();
        ctx.clearRect(0, 0, W0, H0); ctx.drawImage(gridCache, 0, 0, W0, H0);
        // cells: ownership tint, hover, orbs
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
            const cell = G.grid[r][c], x = c * cs, y = r * cs, key = r + ',' + c;
            if (cell.o >= 0 && cell.n > 0) { ctx.fillStyle = 'rgba(' + G.players[cell.o].color.rgb + ',.07)'; ctx.fillRect(x + 2, y + 2, cs - 4, cs - 4); }
            if (hoverCell && hoverCell[0] === r && hoverCell[1] === c) { ctx.fillStyle = 'rgba(' + cur.color.rgb + (canPlay(G.grid, r, c, G.cur) ? ',.18)' : ',.04)'); ctx.fillRect(x + 2, y + 2, cs - 4, cs - 4); }
            if (shakes[key] && clock - shakes[key] < 0.35) { ctx.fillStyle = 'rgba(255,60,60,' + (0.3 * (1 - (clock - shakes[key]) / 0.35)) + ')'; ctx.fillRect(x + 2, y + 2, cs - 4, cs - 4); }
            if (cell.n > 0) drawOrbs(cell, r, c, key);
            else if (hoverCell && hoverCell[0] === r && hoverCell[1] === c && canPlay(G.grid, r, c, G.cur)) { ctx.globalAlpha = 0.4; drawOne(cur.color, x + cs / 2, y + cs / 2, cs * 0.34); ctx.globalAlpha = 1; }
        }
        // orbs in flight, shock rings and sparks
        flights = flights.filter(f => clock - f.t < f.d + 0.02);
        flights.forEach(f => { const k = easeOut(clamp01((clock - f.t) / f.d)); drawOne(f.c, f.x0 + (f.x1 - f.x0) * k, f.y0 + (f.y1 - f.y0) * k, cs * 0.3); });
        rings = rings.filter(r => clock - r.t < 0.45);
        rings.forEach(r => { const k = (clock - r.t) / 0.45; ctx.strokeStyle = 'rgba(' + r.c.rgb + ',' + (0.9 * (1 - k)) + ')'; ctx.lineWidth = 3 * (1 - k) + 1; ctx.beginPath(); ctx.arc(r.x, r.y, cs * (0.2 + 0.7 * easeOut(k)), 0, 6.283); ctx.stroke(); });
        sparks = sparks.filter(s => clock - s.t < s.l);
        sparks.forEach(s => { const k = (clock - s.t) / s.l; ctx.globalAlpha = 1 - k; ctx.fillStyle = s.c.hex; ctx.beginPath(); ctx.arc(s.x + Math.cos(s.a) * s.s * k * 0.9, s.y + Math.sin(s.a) * s.s * k * 0.9, 2.2 * (1 - k) + 0.6, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; });
        floaters = floaters.filter(f => clock - f.t < 1.6);
        floaters.forEach(f => { const k = (clock - f.t) / 1.6; ctx.globalAlpha = 1 - k * k; ctx.font = '700 ' + Math.floor(cs * 0.55) + 'px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = '#0B0B22'; ctx.strokeText(f.text, W0 / 2, H0 / 2 - k * cs); ctx.fillStyle = f.c.hex; ctx.fillText(f.text, W0 / 2, H0 / 2 - k * cs); ctx.globalAlpha = 1; });
    }
    const clamp01 = v => Math.max(0, Math.min(1, v));
    function drawOne(color, x, y, d) { ctx.drawImage(orbSprite(color), x - d * 1.75, y - d * 1.75, d * 3.5, d * 3.5); }
    function drawOrbs(cell, r, c, key) {
        const color = G.players[cell.o].color, cap = capOf(r, c), n = cell.n, cx = (c + 0.5) * cs, cy = (r + 0.5) * cs;
        const danger = n / cap, pop = pops[key] !== undefined ? clamp01((clock - pops[key]) / 0.25) : 1;
        const scale = pop < 1 ? 0.6 + 0.55 * Math.sin(pop * Math.PI / 2) + (pop > 0.7 ? 0.0 : 0) : 1;
        const orbit = n === 1 ? 0 : cs * (n === 2 ? 0.17 : 0.2), speed = 0.7 + 2.4 * danger * danger, jitter = n >= cap - 1 ? cs * 0.018 : cs * 0.006;
        const size = cs * (n >= 3 ? 0.2 : 0.24) * scale;
        for (let i = 0; i < n; i++) {
            const a = clock * speed + i * 6.283 / n + (r * 1.3 + c * 0.7);
            const x = cx + Math.cos(a) * orbit + Math.sin(clock * 22 + i + r) * jitter, y = cy + Math.sin(a) * orbit + Math.cos(clock * 19 + i + c) * jitter;
            drawOne(color, x, y, size);
        }
    }

    /* ═══════════════ Buttons ═══════════════ */
    const ACTIONS = {
        start() { startGame(); }, again() { closeModal(); startGame(); }, setup() { closeModal(); showSetup(); },
        how() { showHow(); }, close() { closeModal(); },
        pause() { if (screen !== 'game' || $('.modal')) return; modal('<h2>Paused</h2><button class="btn-big" data-act="close">Resume ▶</button><div class="row"><button class="btn-sub" data-act="again">🔁 Restart</button><button class="btn-sub" data-act="how">❓ Rules</button></div><div class="row"><button class="btn-sub" data-act="setup">⚙️ Change setup</button></div>'); },
        music() { cfg.music = !cfg.music; A.setMusic(cfg.music); persist(); $$('[data-act="music"]').forEach(b => b.classList.toggle('off', !cfg.music)); },
        sfx() { cfg.sfx = !cfg.sfx; A.setSfx(cfg.sfx); persist(); $$('[data-act="sfx"]').forEach(b => b.classList.toggle('off', !cfg.sfx)); }
    };
    document.addEventListener('click', e => {
        const b = e.target.closest('[data-act]'); if (b && ACTIONS[b.dataset.act]) { A.unlock(); A.sfx('click'); ACTIONS[b.dataset.act](); return; }
        const m = e.target.closest('[data-mode]'); if (m) { cfg.mode = m.dataset.mode; persist(); A.sfx('click'); $$('[data-mode]').forEach(x => x.classList.toggle('on', x === m)); return; }
        const n = e.target.closest('[data-n]'); if (n) { cfg.players = +n.dataset.n; persist(); A.sfx('click'); $$('[data-n]').forEach(x => x.classList.toggle('on', x === n)); }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) A.pause(); else A.resume(); });
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && screen === 'game') ACTIONS.pause(); });

    showSetup();
    window.RK = RK;
    RK.chain = { ROWS, COLS, capOf, neighbours, newGrid, cloneGrid, explodeWave, applyArrivals, resolveSync, simulate, aiChoose, orbCounts, ownersPresent, canPlay, decided, get G() { return G; }, play, startGame, cfg, ACTIONS };
})();
