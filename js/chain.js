/* Chain Reaction — neon orbs on a 9 × 6 grid.
   CLASSIC rules: critical mass = number of orthogonal neighbours (corner 2, edge 3, inside 4). A cell at critical mass explodes:
   it empties and sends 1 orb into each neighbour, converting it to the exploding colour; that may set off more explosions.
   Once every player has played, anyone with no orbs is out. Last player standing wins.
   EXTRAS: Chain Puzzles, Surge power-ups (Shield + Nova), Blitz turn timer, 3 AI levels, hints, undo, awards, orb styles & themes. */
(function () {
    'use strict';
    const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
    const RK = window.RK = window.RK || {};
    const A = RK.Audio || { state: {}, play() {}, stop() {}, sfx() {}, unlock() {}, setMusic() {}, setSfx() {}, pause() {}, resume() {} };
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
    const newGrid = () => Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ({ n: 0, o: -1, sh: false })));
    const cloneGrid = g => g.map(row => row.map(c => ({ n: c.n, o: c.o, sh: c.sh })));
    const orbCounts = (g, np) => { const k = new Array(np).fill(0); g.forEach(row => row.forEach(c => { if (c.o >= 0) k[c.o] += c.n; })); return k; };
    const ownersPresent = g => { const s = new Set(); g.forEach(row => row.forEach(c => { if (c.o >= 0 && c.n > 0) s.add(c.o); })); return s; };
    const canPlay = (g, r, c, p) => g[r][c].o === -1 || g[r][c].o === p;

    /* One chain-reaction wave. All unstable cells explode together; each sends 1 orb to every orthogonal neighbour.
       `forced` cells (the Nova power-up) explode even below critical mass. */
    function explodeWave(g, mover, forced) {
        const boom = [], seen = new Set();
        if (forced) forced.forEach(([r, c]) => { if (g[r][c].n > 0) { boom.push([r, c]); seen.add(r * COLS + c); } });
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (g[r][c].n >= capOf(r, c) && g[r][c].n > 0 && !seen.has(r * COLS + c)) boom.push([r, c]);
        boom.forEach(([r, c]) => { g[r][c].n = 0; g[r][c].o = -1; g[r][c].sh = false; });
        const arrivals = [];
        boom.forEach(([r, c]) => neighbours(r, c).forEach(([nr, nc]) => arrivals.push({ from: [r, c], to: [nr, nc] })));
        return { boom, arrivals };
    }
    /* Incoming orbs convert the cell and add one orb — unless the cell is shielded (Surge mode). */
    function applyArrivals(g, arrivals, mover) {
        const blocked = [];
        arrivals.forEach(a => { const cell = g[a.to[0]][a.to[1]]; if (cell.sh && cell.o !== mover) { blocked.push(a); return; } cell.n += 1; cell.o = mover; });
        return blocked;
    }
    const decided = (g, tookAll) => tookAll && ownersPresent(g).size <= 1;
    function resolveSync(g, mover, tookAll, forced, maxWaves) {
        let waves = 0; const limit = maxWaves || 120; let f = forced;
        while (waves < limit) { const w = explodeWave(g, mover, f); f = null; if (!w.boom.length) break; applyArrivals(g, w.arrivals, mover); waves++; if (decided(g, tookAll)) break; }
        return waves;
    }
    function simulate(g, r, c, p, tookAll) { const s = cloneGrid(g); s[r][c].n += 1; s[r][c].o = p; const waves = resolveSync(s, p, tookAll); s.waves = waves; return s; }
    function simulateNova(g, r, c, p, tookAll) { const s = cloneGrid(g); const waves = resolveSync(s, p, tookAll, [[r, c]]); s.waves = waves; return s; }

    /* ═══════════════ AI (three levels) ═══════════════ */
    function evaluate(s, me, players, tookAll) {
        const k = orbCounts(s, players.length); let enemy = 0, killed = 0;
        for (let i = 0; i < players.length; i++) if (i !== me && players[i].alive) { enemy += k[i]; if (k[i] === 0 && tookAll) killed++; }
        let score = k[me] - 1.15 * enemy + killed * 30;
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {     // my cells beside an enemy cell one orb from exploding are about to be captured
            const cell = s[r][c]; if (cell.o !== me || cell.n === 0 || cell.sh) continue;
            neighbours(r, c).forEach(([nr, nc]) => { const e = s[nr][nc]; if (e.o >= 0 && e.o !== me && e.n >= capOf(nr, nc) - 1) score -= 1.6 + cell.n * 0.5; });
        }
        return score;
    }
    function candidates(g, me) { const out = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (canPlay(g, r, c, me)) out.push([r, c]); return out; }
    function rankMoves(g, me, players, tookAll, jitter) {
        return candidates(g, me).map(([r, c]) => {
            const s = simulate(g, r, c, me, tookAll);
            let score = evaluate(s, me, players, tookAll);
            if (capOf(r, c) === 2) score += 0.8; if (g[r][c].n === capOf(r, c) - 1) score += 0.6;
            return { r, c, s, score: score + Math.random() * jitter };
        }).sort((a, b) => b.score - a.score);
    }
    /* level: 'easy' | 'normal' | 'hard'. Returns {type:'place'|'nova'|'shield', r, c} */
    function aiChoose(g, me, players, tookAll, level, abil) {
        level = level || 'normal';
        let moves = rankMoves(g, me, players, tookAll, level === 'easy' ? 6 : level === 'hard' ? 0.2 : 0.9);
        if (!moves.length) return null;
        let best = moves[0];
        if (level === 'easy' && Math.random() < 0.45) best = moves[Math.floor(Math.random() * moves.length)];
        if (level === 'hard') {      // two-ply look-ahead: assume the next opponent replies with their best capture
            const np = players.length; let nxt = (me + 1) % np, guard = 0; while (!players[nxt].alive && guard++ < np) nxt = (nxt + 1) % np;
            let bestVal = -1e9;
            moves.slice(0, 7).forEach(m => {
                let worst = m.score;
                if (nxt !== me) { const rep = rankMoves(m.s, nxt, players, tookAll, 0); if (rep.length) { const r0 = rep[0]; worst = evaluate(r0.s, me, players, tookAll); } }
                const val = 0.45 * m.score + 0.55 * worst;
                if (val > bestVal) { bestVal = val; best = m; }
            });
        }
        let choice = { type: 'place', r: best.r, c: best.c, score: best.score };
        if (abil && level !== 'easy') {     // Surge: spend a power-up when it clearly pays off
            const base = evaluate(g, me, players, tookAll);
            if (abil.nova) { let bn = null, bs = -1e9; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (g[r][c].o === me && g[r][c].n > 0) { const s = simulateNova(g, r, c, me, tookAll), v = evaluate(s, me, players, tookAll); if (v > bs) { bs = v; bn = [r, c]; } } if (bn && bs > Math.max(base, best.score) + 7) choice = { type: 'nova', r: bn[0], c: bn[1] }; }
            if (choice.type === 'place' && abil.shield) { let target = null, tn = 0; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const cell = g[r][c]; if (cell.o !== me || cell.sh || cell.n < 2) continue; if (neighbours(r, c).some(([nr, nc]) => g[nr][nc].o >= 0 && g[nr][nc].o !== me && g[nr][nc].n >= capOf(nr, nc) - 1) && cell.n > tn) { tn = cell.n; target = [r, c]; } } if (target && best.score < base + 2) choice = { type: 'shield', r: target[0], c: target[1] }; }
        }
        return choice;
    }

    /* ═══════════════ Puzzles (pre-generated and solver-verified, see js/chain-puzzles.js) ═══════════════ */
    const PACKS = [{ name: 'Spark', icon: '✨', goal: 'Wipe out Blue in ONE move' }, { name: 'Surge', icon: '⚡', goal: 'Wipe out Blue AND Green in ONE move' }, { name: 'Overload', icon: '🌋', goal: 'Wipe out Blue in ONE move' }];
    const PER = 10;
    function puzzleOf(g) {
        const d = (RK.puzzles || [])[g]; if (!d) return null;
        const grid = newGrid();
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const i = (r * COLS + c) * 2, o = d.g[i], n = +d.g[i + 1]; if (o !== '.' && n > 0) grid[r][c] = { n, o: +o, sh: false }; }
        return { pack: d.p, idx: d.i, enemies: d.e, grid, sols: d.s };
    }
    const enemyOrbs = (g, enemies) => g.reduce((a, row) => a + row.reduce((b, c) => b + (enemies.includes(c.o) ? c.n : 0), 0), 0);

    /* ═══════════════ Save data, awards, unlocks ═══════════════ */
    const SAVE_KEY = 'lokakids.chain.v2';
    let cfg = { mode: 'local', players: 2, ai: 'normal', surge: false, blitz: false, skin: 'neon', theme: 'night', music: true, sfx: true, vibe: true, ach: {}, puz: new Array(30).fill(0),
        stats: { games: 0, wins: [0, 0, 0, 0], streak: 0, bestStreak: 0, bestChain: 0, captures: 0, elims: 0, puzzles: 0, usedBoth: 0, moves: 0 } };
    try { const d = JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; Object.assign(cfg, d, { stats: Object.assign(cfg.stats, d.stats || {}), ach: d.ach || {}, puz: (d.puz || []).concat(new Array(30).fill(0)).slice(0, 30) }); } catch (e) { /* ignore */ }
    const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(cfg)); } catch (e) { /* ignore */ } };
    const vibrate = p => { try { if (cfg.vibe && navigator.vibrate) navigator.vibrate(p); } catch (e) { /* ignore */ } };
    if (RK.Audio) { A.setMusic(cfg.music); A.setSfx(cfg.sfx); }
    const totalWins = () => cfg.stats.wins.reduce((a, b) => a + b, 0), puzSolved = () => cfg.puz.filter(x => x > 0).length, puzStars = () => cfg.puz.reduce((a, b) => a + b, 0);

    const ACH = [
        { id: 'win1', icon: '🏆', name: 'First Victory', desc: 'Win a match', ok: () => totalWins() >= 1 },
        { id: 'win5', icon: '👑', name: 'Champion', desc: 'Win 5 matches', ok: () => totalWins() >= 5 },
        { id: 'streak3', icon: '🔥', name: 'On Fire', desc: 'Win 3 matches in a row', ok: () => cfg.stats.bestStreak >= 3 },
        { id: 'chain5', icon: '💥', name: 'Chain ×5', desc: 'Set off a 5-wave chain', ok: () => cfg.stats.bestChain >= 5 },
        { id: 'chain10', icon: '🌋', name: 'Mega Chain', desc: 'Set off a 10-wave chain', ok: () => cfg.stats.bestChain >= 10 },
        { id: 'puz1', icon: '🧩', name: 'Puzzler', desc: 'Solve a chain puzzle', ok: () => puzSolved() >= 1 },
        { id: 'puz10', icon: '🧠', name: 'Puzzle Master', desc: 'Solve 10 chain puzzles', ok: () => puzSolved() >= 10 },
        { id: 'perfect', icon: '⭐', name: 'Perfectionist', desc: 'Earn 3 stars on a puzzle', ok: () => cfg.puz.some(x => x === 3) },
        { id: 'power', icon: '⚡', name: 'Power Play', desc: 'Use Shield and Nova in one match', ok: () => cfg.stats.usedBoth >= 1 }
    ];
    const SKINS = [{ id: 'neon', name: 'Neon Orbs', need: '', ok: () => true }, { id: 'planet', name: 'Planets', need: 'Win 1 match', ok: () => totalWins() >= 1 }, { id: 'gem', name: 'Gems', need: 'Solve 5 puzzles', ok: () => puzSolved() >= 5 }, { id: 'candy', name: 'Candy', need: 'Win 5 matches', ok: () => totalWins() >= 5 }];
    const THEMES = [{ id: 'night', name: 'Neon Night', need: '', ok: () => true }, { id: 'aurora', name: 'Aurora', need: 'Chain ×5', ok: () => cfg.stats.bestChain >= 5 }, { id: 'sunset', name: 'Synth Sunset', need: 'Solve 10 puzzles', ok: () => puzSolved() >= 10 }];
    function checkAch() { ACH.forEach(a => { if (!cfg.ach[a.id] && a.ok()) { cfg.ach[a.id] = Date.now(); persist(); A.sfx('unlock'); toast('🏅 Award unlocked: ' + a.name); } }); }
    let toastTimer = 0;
    function toast(text) { let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); } t.textContent = text; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2800); }
    function applyTheme() { document.body.dataset.theme = cfg.theme; }

    /* ═══════════════ Screens ═══════════════ */
    let G = null, screen = 'home';
    function setScreen(s) { screen = s; document.body.dataset.screen = s; }
    function modal(html, cls) { closeModal(); const m = document.createElement('div'); m.className = 'modal ' + (cls || ''); m.innerHTML = '<div class="modal__card">' + html + '</div>'; document.body.appendChild(m); requestAnimationFrame(() => m.classList.add('in')); return m; }
    function closeModal() { $$('.modal').forEach(m => m.remove()); }
    const toggles = () => '<button class="ibtn' + (cfg.music ? '' : ' off') + '" data-act="music" aria-label="Music">🎵</button><button class="ibtn' + (cfg.sfx ? '' : ' off') + '" data-act="sfx" aria-label="Sound effects">🔊</button>';

    function showHome() {
        stopLoop(); closeModal(); setScreen('home'); G = null; applyTheme();
        app.innerHTML =
            '<section class="scr scr--home">' +
            '<div class="topline"><a class="ibtn" href="index.html" aria-label="All games">🏠</a><span class="sp"></span>' + toggles() + '</div>' +
            '<div class="hero"><div class="demo" aria-hidden="true"><i style="--c:#FF3B6B"></i><i style="--c:#2EA8FF"></i><i style="--c:#27F59A"></i><i style="--c:#FFD93B"></i></div>' +
            '<h1 class="logo"><span>Chain</span><b>Reaction</b></h1><p class="tag">Neon orbs · 9 × 6 · last one standing wins</p></div>' +
            '<div class="menu"><button class="card card--play" data-act="setup"><i>⚔️</i><span><b>Quick Match</b><small>2–4 players · pass &amp; play or vs computer</small></span></button>' +
            '<button class="card card--puz" data-act="puzzles"><i>🧩</i><span><b>Chain Puzzles</b><small>30 brain-teasers · ' + puzSolved() + '/30 solved · ' + puzStars() + '/90 ⭐</small></span></button>' +
            '<div class="row row--tiles"><button class="tile" data-act="stats"><i>🏅</i><span>Awards</span></button><button class="tile" data-act="style"><i>🎨</i><span>Style</span></button><button class="tile" data-act="how"><i>❓</i><span>Rules</span></button></div></div></section>';
        A.play('neon');
    }

    function showSetup() {
        stopLoop(); closeModal(); setScreen('setup');
        const dots = n => COLORS.slice(0, n).map(c => '<i style="--c:' + c.hex + '"></i>').join('');
        const seg = (items, key, cur) => '<div class="seg" data-key="' + key + '">' + items.map(i => '<button data-key="' + key + '" data-val="' + i[0] + '" class="' + (String(cur) === String(i[0]) ? 'on' : '') + '">' + i[1] + '</button>').join('') + '</div>';
        app.innerHTML =
            '<section class="scr scr--setup">' +
            '<div class="topline"><button class="ibtn" data-act="home" aria-label="Back">◀</button><h2 class="h2">Quick Match</h2><span class="sp"></span>' + toggles() + '</div>' +
            '<div class="panel"><h3>Who plays?</h3>' + seg([['local', '<i>👥</i><b>Pass &amp; Play</b><small>Share one device</small>'], ['ai', '<i>🤖</i><b>vs Computer</b><small>You are Red</small>']], 'mode', cfg.mode) +
            '<h3>Players</h3><div class="seg seg--n">' + [2, 3, 4].map(n => '<button data-key="players" data-val="' + n + '" class="' + (cfg.players === n ? 'on' : '') + '"><span class="dots">' + dots(n) + '</span><b>' + n + ' players</b></button>').join('') + '</div>' +
            '<div id="aiRow" ' + (cfg.mode === 'ai' ? '' : 'hidden') + '><h3>Computer level</h3><div class="seg seg--n">' + [['easy', 'Easy'], ['normal', 'Normal'], ['hard', 'Hard']].map(i => '<button data-key="ai" data-val="' + i[0] + '" class="' + (cfg.ai === i[0] ? 'on' : '') + '"><b>' + i[1] + '</b></button>').join('') + '</div></div>' +
            '<h3>Special rules</h3><div class="chips"><button class="chip' + (cfg.surge ? ' on' : '') + '" data-flag="surge"><i>⚡</i><span><b>Surge</b><small>Shield + Nova power-ups</small></span></button><button class="chip' + (cfg.blitz ? ' on' : '') + '" data-flag="blitz"><i>⏱️</i><span><b>Blitz</b><small>10 seconds per turn</small></span></button></div>' +
            '<p class="muted small">Classic rules are always on. Surge and Blitz are optional extras.</p></div>' +
            '<div class="menu"><button class="btn-big" data-act="start">Start match ▶</button></div></section>';
    }

    function showHow() {
        modal('<h2>How to play</h2><ul class="how">' +
            '<li><i class="o" style="--c:#FF3B6B"></i><span><b>Tap an empty cell</b> or one of yours to add an orb.</span></li>' +
            '<li><i class="num">2·3·4</i><span><b>Critical mass:</b> corners explode at 2 orbs, edges at 3, the middle at 4.</span></li>' +
            '<li><i class="num">💥</i><span><b>Chain reaction:</b> an exploding cell sends an orb to every neighbour, turning them your colour. They may explode too!</span></li>' +
            '<li><i class="num">🏆</i><span><b>Win:</b> once everyone has played, a player with no orbs is out. Last one standing wins.</span></li>' +
            '<li><i class="num">⚡</i><span><b>Surge:</b> once per match <b>🛡️ Shield</b> a cell of yours, or <b>☄️ Nova</b> to detonate it on the spot.</span></li>' +
            '<li><i class="num">🧩</i><span><b>Puzzles:</b> find the one move that wipes out the enemy!</span></li></ul><button class="btn-big" data-act="close">Got it!</button>');
    }

    function showPuzzleMap(pack) {
        stopLoop(); closeModal(); setScreen('puzzles'); applyTheme();
        pack = pack === undefined ? (showPuzzleMap.pack || 0) : pack; showPuzzleMap.pack = pack;
        const base = pack * PER, done = cfg.puz.slice(base, base + PER).filter(x => x > 0).length, unlockedP = g => g === 0 || cfg.puz[g - 1] > 0 || cfg.puz[Math.max(0, g - 2)] > 0 && g % PER === 0;
        app.innerHTML =
            '<section class="scr scr--puzzles"><div class="topline"><button class="ibtn" data-act="home" aria-label="Back">◀</button><h2 class="h2">Chain Puzzles</h2><span class="sp"></span><span class="chipx">⭐ <b>' + puzStars() + '</b>/90</span></div>' +
            '<div class="tabs">' + PACKS.map((p, i) => '<button class="tab' + (i === pack ? ' on' : '') + '" data-pack="' + i + '"><span>' + p.icon + '</span>' + p.name + '</button>').join('') + '</div>' +
            '<p class="wprog"><b>' + PACKS[pack].goal + '</b><br><small>' + done + '/' + PER + ' solved</small></p>' +
            '<div class="lvls">' + Array.from({ length: PER }, (_, i) => { const g = base + i, ok = unlockedP(g) || i === 0 || cfg.puz[g - 1] > 0, st = cfg.puz[g]; return '<button class="lv' + (ok ? '' : ' lock') + (st ? ' done' : '') + '" data-puz="' + g + '"' + (ok ? '' : ' disabled') + '><b>' + (i + 1) + '</b>' + (ok ? '<span class="lv__st">' + [0, 1, 2].map(k => '<i class="' + (k < st ? 'on' : '') + '">★</i>').join('') + '</span>' : '<span>🔒</span>') + '</button>'; }).join('') + '</div></section>';
        A.play('neon');
    }

    function showStats() {
        const s = cfg.stats, tw = totalWins();
        modal('<h2>Awards &amp; stats</h2><div class="statgrid"><div><b>' + s.games + '</b><span>Matches</span></div><div><b>' + tw + '</b><span>Wins</span></div><div><b>' + s.bestStreak + '</b><span>Best streak</span></div><div><b>' + s.bestChain + '</b><span>Best chain</span></div><div><b>' + puzSolved() + '</b><span>Puzzles</span></div><div><b>' + s.elims + '</b><span>Players out</span></div></div>' +
            '<div class="awards">' + ACH.map(a => '<div class="aw' + (cfg.ach[a.id] ? ' got' : '') + '"><i>' + (cfg.ach[a.id] ? a.icon : '🔒') + '</i><span><b>' + a.name + '</b><small>' + a.desc + '</small></span></div>').join('') + '</div><button class="btn-big" data-act="close">Close</button>', 'tall');
    }

    function showStyle() {
        const prev = (id) => { const c = spriteFor(id, COLORS[1]); return c.toDataURL('image/png'); };
        modal('<h2>Style</h2><h3 class="sh">Orbs</h3><div class="opts">' + SKINS.map(k => { const ok = k.ok(); return '<button class="opt' + (cfg.skin === k.id ? ' on' : '') + (ok ? '' : ' lock') + '" data-skin="' + k.id + '"' + (ok ? '' : ' disabled') + '><img src="' + prev(k.id) + '" alt=""><b>' + k.name + '</b><small>' + (ok ? (cfg.skin === k.id ? 'Selected' : 'Tap to use') : '🔒 ' + k.need) + '</small></button>'; }).join('') + '</div>' +
            '<h3 class="sh">Board</h3><div class="opts opts--t">' + THEMES.map(k => { const ok = k.ok(); return '<button class="opt opt--theme' + (cfg.theme === k.id ? ' on' : '') + (ok ? '' : ' lock') + '" data-theme="' + k.id + '"' + (ok ? '' : ' disabled') + '><span class="sw sw--' + k.id + '"></span><b>' + k.name + '</b><small>' + (ok ? (cfg.theme === k.id ? 'Selected' : 'Tap to use') : '🔒 ' + k.need) + '</small></button>'; }).join('') + '</div><button class="btn-big" data-act="close">Done</button>', 'tall');
    }

    /* ═══════════════ Game: set-up ═══════════════ */
    let canvas, ctx, cs = 40, W0 = 240, H0 = 360, running = false, rafId = 0, lastTs = 0, clock = 0, ro = null, gridCache = null, gridKey = '', hoverCell = null;
    let flights = [], rings = [], sparks = [], flashes = [], pops = {}, shakes = {}, floaters = [], shake = { t: -9, a: 0 }, hintCell = null, hintUntil = 0, fireworks = false;

    function resetFx() { flights = []; rings = []; sparks = []; flashes = []; pops = {}; shakes = {}; floaters = []; shake = { t: -9, a: 0 }; hintCell = null; fireworks = false; }
    const newPlayers = np => Array.from({ length: np }, (_, i) => ({ id: i, color: COLORS[i], alive: true, ai: cfg.mode === 'ai' && i > 0, took: false, abil: { shield: cfg.surge, nova: cfg.surge }, used: { shield: false, nova: false } }));

    function startMatch() {
        closeModal(); stopLoop(); setScreen('game'); A.unlock(); applyTheme();
        const players = newPlayers(cfg.players);
        G = { kind: 'match', grid: newGrid(), players, cur: 0, turns: 0, over: false, winner: -1, busy: false, maxChain: 0, snap: null, armed: null, deadline: 0, minOrbs: players.map(() => 99) };
        buildGameDOM(); beginTurn();
    }
    function startPuzzle(g) {
        const pz = puzzleOf(g); if (!pz) return;
        closeModal(); stopLoop(); setScreen('game'); A.unlock(); applyTheme();
        const players = Array.from({ length: pz.enemies.length + 1 }, (_, i) => ({ id: i, color: COLORS[i], alive: true, ai: false, took: true, abil: { shield: false, nova: false }, used: {} }));
        G = { kind: 'puzzle', pz, g, grid: cloneGrid(pz.grid), players, cur: 0, turns: 0, over: false, winner: -1, busy: false, maxChain: 0, tries: 0, hinted: false, armed: null, start: cloneGrid(pz.grid), deadline: 0 };
        buildGameDOM(); beginTurn();
    }

    function buildGameDOM() {
        const puz = G.kind === 'puzzle';
        app.innerHTML =
            '<section class="scr scr--game">' +
            '<header class="hud"><button class="ibtn" data-act="pause" aria-label="Menu">☰</button><div class="turn" id="turn"></div><span class="sp"></span>' + toggles() + '</header>' +
            '<div class="timer" id="timer" hidden><i></i></div>' +
            '<div class="players" id="players" data-n="' + G.players.length + '"></div>' +
            '<div class="boardwrap"><div class="board"><canvas tabindex="0" role="application" aria-label="Game board, 9 rows by 6 columns. Tap a cell to add an orb."></canvas></div><div class="banner" id="banner"></div></div>' +
            '<div class="actions" id="actions"></div><p class="hint" id="hint"></p></section>';
        canvas = $('canvas'); ctx = canvas.getContext('2d'); resetFx();
        bindCanvas(); observe();
        running = true; lastTs = 0; rafId = requestAnimationFrame(frame);
        resize(); renderUI(); A.play('neon');
        if (puz) { const t = $('#players'); t.dataset.n = 1; }
    }
    function stopLoop() { running = false; cancelAnimationFrame(rafId); if (ro) { ro.disconnect(); ro = null; } }
    function observe() { const box = $('.boardwrap'); if (window.ResizeObserver) { ro = new ResizeObserver(() => { if (running) resize(); }); ro.observe(box); } else window.addEventListener('resize', () => { if (running) resize(); }); }
    function resize() {
        const box = $('.boardwrap'), bw = box.clientWidth - 10, bh = box.clientHeight - 10;
        cs = Math.max(28, Math.floor(Math.min(bw / COLS, bh / ROWS))); W0 = cs * COLS; H0 = cs * ROWS;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(W0 * dpr); canvas.height = Math.round(H0 * dpr); canvas.style.width = W0 + 'px'; canvas.style.height = H0 + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); gridCache = null;
    }

    /* ── UI that depends on the game state ── */
    function renderUI() {
        if (!G) return;
        const cur = G.players[G.cur], puz = G.kind === 'puzzle';
        document.documentElement.style.setProperty('--turn', cur.color.hex); document.documentElement.style.setProperty('--turn-rgb', cur.color.rgb);
        if (puz) {
            $('#turn').innerHTML = '<b>Puzzle ' + (G.pz.idx + 1) + '</b><small>' + PACKS[G.pz.pack].name + '</small>';
            $('#players').innerHTML = '<div class="goal">🎯 ' + PACKS[G.pz.pack].goal + '<span>Tries: ' + G.tries + '</span></div>';
        } else {
            const orbs = orbCounts(G.grid, G.players.length), total = orbs.reduce((a, b) => a + b, 0) || 1;
            $('#players').innerHTML = G.players.map(p => '<div class="pl' + (p.id === G.cur && !G.over ? ' on' : '') + (p.alive ? '' : ' out') + '" style="--c:' + p.color.hex + ';--rgb:' + p.color.rgb + '"><i class="pl__orb"></i><b>' + p.color.name + (p.ai ? ' <small>AI</small>' : '') + '</b><span>' + orbs[p.id] + '</span><u><s style="width:' + Math.round(orbs[p.id] / total * 100) + '%"></s></u>' + (p.alive ? '' : '<em>OUT</em>') + '</div>').join('');
            $('#turn').innerHTML = G.over ? '<b>Game over</b>' : '<i class="dotc" style="--c:' + cur.color.hex + '"></i><b style="color:' + cur.color.hex + '">' + cur.color.name + (cur.ai ? ' is thinking' : "'s turn") + '</b>';
        }
        // action buttons
        const human = !cur.ai && !G.busy && !G.over;
        let acts = '';
        if (puz) acts = '<button class="act" data-act="hintbtn"><i>💡</i><span>Hint</span></button><button class="act" data-act="reset"><i>↩️</i><span>Reset</span></button><button class="act" data-act="skip"><i>⏭️</i><span>Next</span></button>';
        else {
            if (cfg.surge && !cur.ai) acts += '<button class="act pw' + (G.armed === 'shield' ? ' armed' : '') + '" data-act="arm-shield"' + (cur.abil.shield && human ? '' : ' disabled') + '><i>🛡️</i><span>Shield</span></button><button class="act pw' + (G.armed === 'nova' ? ' armed' : '') + '" data-act="arm-nova"' + (cur.abil.nova && human ? '' : ' disabled') + '><i>☄️</i><span>Nova</span></button>';
            acts += '<button class="act" data-act="hintbtn"' + (human ? '' : ' disabled') + '><i>💡</i><span>Hint</span></button>';
            if (cfg.mode === 'ai') acts += '<button class="act" data-act="undo"' + (G.snap && human ? '' : ' disabled') + '><i>↩️</i><span>Undo</span></button>';
        }
        $('#actions').innerHTML = acts;
        const h = $('#hint');
        h.textContent = G.over ? '' : puz ? 'Tap the cell that sets off the chain' : G.armed === 'shield' ? 'Tap one of your cells to protect it until your next turn' : G.armed === 'nova' ? 'Tap one of your cells to detonate it now' : cur.ai ? 'The computer is choosing…' : cfg.mode === 'local' && G.players.length > 1 ? 'Pass the device to ' + cur.color.name + ' · tap an empty cell or one of yours' : 'Tap an empty cell or one of your own';
        $('#timer').hidden = !(cfg.blitz && !puz);
    }

    /* ── turn flow ── */
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const tookAll = () => G.players.every(p => p.took);
    function nextAlive(from) { let i = from; for (let k = 0; k < G.players.length; k++) { i = (i + 1) % G.players.length; if (G.players[i].alive) return i; } return from; }
    function banner(text, color) { const b = $('#banner'); if (!b) return; b.textContent = text; b.style.setProperty('--c', color); b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }

    function beginTurn() {
        if (G.over) return;
        G.busy = false; G.armed = null; const p = G.players[G.cur];
        G.grid.forEach(row => row.forEach(c => { if (c.sh && c.o === p.id) c.sh = false; }));      // a shield lasts until its owner's next turn
        if (G.kind === 'match') { G.deadline = cfg.blitz && !p.ai ? clock + 10 : 0; if (G.players.length > 1) { banner(p.ai ? p.color.name + ' AI' : p.color.name.toUpperCase() + "'S TURN", p.color.hex); if (!p.ai) A.sfx('turn', { i: p.id }); } }
        renderUI();
        if (p.ai) {
            G.busy = true;
            wait(700 + Math.random() * 500).then(() => {
                if (!running || G.over || G.players[G.cur] !== p) return;
                const mv = aiChoose(G.grid, p.id, G.players, tookAll(), cfg.ai, cfg.surge ? p.abil : null);
                if (mv) act(mv.type, mv.r, mv.c); else endTurn();
            });
        }
    }

    /* The single entry point for every move: type 'place' | 'nova' | 'shield' */
    async function act(type, r, c) {
        const p = G.players[G.cur];
        if (G.over || (G.busy && !p.ai) || (G.busy && p.ai && false)) return false;
        const cell = G.grid[r][c];
        if (type === 'place' && !canPlay(G.grid, r, c, p.id)) return false;
        if ((type === 'nova' || type === 'shield') && !(cell.o === p.id && cell.n > 0 && p.abil[type])) return false;
        if (G.kind === 'match' && !p.ai) G.snap = snapshot();
        G.busy = true; G.armed = null; p.took = true; G.turns++; cfg.stats.moves++; hintCell = null; $('#timer') && ($('#timer').firstChild.style.width = '0');
        let forced = null;
        if (type === 'place') { cell.n += 1; cell.o = p.id; pops[r + ',' + c] = clock; A.sfx('place', { i: p.id }); vibrate(10); }
        else if (type === 'shield') { cell.sh = true; p.abil.shield = false; p.used.shield = true; A.sfx('shield'); vibrate(20); rings.push({ x: (c + 0.5) * cs, y: (r + 0.5) * cs, t: clock, c: p.color, big: true }); floaters.push({ text: '🛡️ Shielded', t: clock, c: p.color }); renderUI(); await wait(650); if (p.used.shield && p.used.nova) cfg.stats.usedBoth++; endTurn(); return true; }
        else { p.abil.nova = false; p.used.nova = true; forced = [[r, c]]; A.sfx('nova'); vibrate([20, 30, 40]); flashes.push({ x: (c + 0.5) * cs, y: (r + 0.5) * cs, t: clock, c: p.color, big: true }); renderUI(); await wait(560); if (p.used.shield && p.used.nova) cfg.stats.usedBoth++; }
        renderUI(); await wait(type === 'place' ? 130 : 20);
        const waves = await runChain(p, forced);
        G.maxChain = Math.max(G.maxChain, waves); cfg.stats.bestChain = Math.max(cfg.stats.bestChain, waves);
        if (waves >= 5) { cfg.stats.bestChain = Math.max(cfg.stats.bestChain, waves); }
        persist(); checkAch(); endTurn(waves);
        return true;
    }

    async function runChain(p, forced) {
        let waves = 0, f = forced;
        while (running && waves < 300) {
            const w = explodeWave(G.grid, p.id, f); f = null;
            if (!w.boom.length) break;
            waves++;
            const captured = w.arrivals.filter(a => { const t = G.grid[a.to[0]][a.to[1]]; return t.o >= 0 && t.o !== p.id && t.n > 0; });
            A.sfx('boom', { i: waves }); if (captured.length) { A.sfx('zap'); cfg.stats.captures += captured.length; } if (waves >= 3) A.sfx('combo', { i: waves });
            vibrate(waves > 2 ? 28 : 14); shake = { t: clock, a: Math.min(9, 2 + waves * 1.1) };
            w.boom.forEach(([br, bc]) => { const x = (bc + 0.5) * cs, y = (br + 0.5) * cs; rings.push({ x, y, t: clock, c: p.color }); flashes.push({ x, y, t: clock, c: p.color }); for (let k = 0; k < 10; k++) sparks.push({ x, y, a: Math.random() * 6.283, s: 50 + Math.random() * 130, t: clock, l: 0.5 + Math.random() * 0.45, c: p.color }); });
            w.arrivals.forEach(a => flights.push({ x0: (a.from[1] + 0.5) * cs, y0: (a.from[0] + 0.5) * cs, x1: (a.to[1] + 0.5) * cs, y1: (a.to[0] + 0.5) * cs, t: clock, d: 0.26, c: p.color }));
            if (waves >= 2) floaters.push({ text: 'CHAIN ×' + waves, t: clock, c: p.color, big: true, id: 'chain' });
            renderUI();
            await wait(waves > 6 ? 230 : 290);
            const blocked = applyArrivals(G.grid, w.arrivals, p.id);
            w.arrivals.forEach(a => { pops[a.to[0] + ',' + a.to[1]] = clock; });
            captured.forEach(a => flashes.push({ x: (a.to[1] + 0.5) * cs, y: (a.to[0] + 0.5) * cs, t: clock, c: p.color }));
            blocked.forEach(a => rings.push({ x: (a.to[1] + 0.5) * cs, y: (a.to[0] + 0.5) * cs, t: clock, c: COLORS[G.grid[a.to[0]][a.to[1]].o] || p.color, big: true }));
            renderUI();
            if (decided(G.grid, tookAll())) break;
            await wait(45);
        }
        return waves;
    }

    function snapshot() { return { grid: cloneGrid(G.grid), cur: G.cur, turns: G.turns, maxChain: G.maxChain, players: G.players.map(p => ({ alive: p.alive, took: p.took, abil: Object.assign({}, p.abil), used: Object.assign({}, p.used) })) }; }
    function undo() {
        if (!G || G.kind !== 'match' || !G.snap || G.busy || G.over) return;
        const s = G.snap; G.grid = cloneGrid(s.grid); G.cur = s.cur; G.turns = s.turns; G.maxChain = s.maxChain; s.players.forEach((q, i) => { Object.assign(G.players[i], { alive: q.alive, took: q.took, abil: Object.assign({}, q.abil), used: Object.assign({}, q.used) }); });
        G.snap = null; A.sfx('undo'); gridCache = null; beginTurn();
    }

    function endTurn(waves) {
        if (!running) return;
        if (G.kind === 'puzzle') return puzzleResult();
        const np = G.players.length, orbs = orbCounts(G.grid, np);
        if (tookAll()) { G.players.forEach(pl => { if (pl.alive && orbs[pl.id] === 0) { pl.alive = false; cfg.stats.elims++; A.sfx('elim'); vibrate([30, 40, 30]); floaters.push({ text: pl.color.name + ' is out!', t: clock, c: pl.color, big: true }); } if (pl.alive) G.minOrbs[pl.id] = Math.min(G.minOrbs[pl.id], orbs[pl.id]); }); }
        const alive = G.players.filter(pl => pl.alive);
        if (alive.length <= 1 && tookAll()) { finishMatch(alive[0] ? alive[0].id : G.cur); return; }
        G.cur = nextAlive(G.cur); gridCache = null; beginTurn();
    }

    function finishMatch(w) {
        G.over = true; G.winner = w; G.busy = false; fireworks = true; renderUI();
        const st = cfg.stats, humanWon = cfg.mode === 'ai' ? w === 0 : true; st.games++; st.wins[w] = (st.wins[w] || 0) + 1;
        if (cfg.mode === 'ai') { if (w === 0) { st.streak++; st.bestStreak = Math.max(st.bestStreak, st.streak); } else st.streak = 0; } else { st.streak = 0; }
        persist(); checkAch();
        const p = G.players[w];
        A.sfx('victory'); vibrate([40, 40, 80]); try { Kid.confetti(60); } catch (e) { /* ignore */ }
        setTimeout(() => { if (!G || !G.over) return; modal('<div class="trophy" style="--c:' + p.color.hex + '">🏆</div><h2 style="color:' + p.color.hex + '">' + p.color.name + (p.ai ? ' (AI)' : '') + ' wins!</h2>' +
            '<p class="muted">' + G.turns + ' moves · biggest chain ' + G.maxChain + ' 💥' + (cfg.mode === 'ai' ? (humanWon ? ' · win streak ' + st.streak : '') : '') + '</p>' +
            '<div class="row"><button class="btn-big" data-act="again">Play again ▶</button></div><div class="row"><button class="btn-sub" data-act="setup">⚙️ Change setup</button><button class="btn-sub" data-act="home">🏠 Menu</button></div>', 'result'); }, 1100);
    }

    /* ── puzzles ── */
    function puzzleResult() {
        const left = enemyOrbs(G.grid, G.pz.enemies);
        if (left === 0) {
            G.over = true; fireworks = true; const stars = G.hinted ? 1 : G.tries === 0 ? 3 : G.tries <= 2 ? 2 : 1, prev = cfg.puz[G.g];
            if (stars > prev) { cfg.puz[G.g] = stars; try { if (window.Kid && Kid.Stars) Kid.Stars.add('chain', stars - prev); } catch (e) { /* ignore */ } }
            if (prev === 0) cfg.stats.puzzles++;
            persist(); checkAch(); A.sfx('solve'); vibrate([30, 40, 60]); try { Kid.confetti(40); } catch (e) { /* ignore */ }
            const hasNext = G.g < 29;
            setTimeout(() => { if (!G || !G.over) return; modal('<div class="trophy" style="--c:#FFD93B">🧩</div><h2>Puzzle solved!</h2><div class="starsrow">' + [0, 1, 2].map(i => '<i class="' + (i < stars ? 'on' : '') + '" style="--i:' + i + '">★</i>').join('') + '</div><p class="muted">Chain of ' + G.maxChain + (G.tries ? ' · ' + (G.tries + 1) + ' tries' : ' · first try!') + (G.hinted ? ' · hint used' : '') + '</p>' + (hasNext ? '<button class="btn-big" data-act="nextpuz">Next puzzle ▶</button>' : '') + '<div class="row"><button class="btn-sub" data-act="reset">🔁 Replay</button><button class="btn-sub" data-act="puzzles">🧩 Puzzles</button></div>', 'result'); }, 900);
        } else {
            G.tries++; A.sfx('fail'); floaters.push({ text: 'Not quite — try again', t: clock, c: COLORS[1] });
            setTimeout(() => { if (!G || G.over) return; G.grid = cloneGrid(G.start); G.busy = false; G.maxChain = 0; gridCache = null; renderUI(); }, 1500);
        }
    }
    function hintNow() {
        if (!G || G.over || G.busy) return;
        const p = G.players[G.cur]; A.sfx('hint');
        if (G.kind === 'puzzle') { G.hinted = true; const s = G.pz.sols[0]; hintCell = [s[0], s[1]]; }
        else { const mv = aiChoose(G.grid, p.id, G.players, tookAll(), 'hard', null); if (!mv) return; hintCell = [mv.r, mv.c]; }
        hintUntil = clock + 4;
    }

    /* ── input ── */
    const cellFromEvent = e => { const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) * W0 / r.width, y = (e.clientY - r.top) * H0 / r.height, c = Math.floor(x / cs), rr = Math.floor(y / cs); return inside(rr, c) ? [rr, c] : null; };
    const humanTurn = () => G && !G.over && !G.busy && !G.players[G.cur].ai;
    function tap(r, c) {
        if (!humanTurn()) return;
        const p = G.players[G.cur];
        if (G.armed === 'shield' || G.armed === 'nova') { const cell = G.grid[r][c]; if (cell.o === p.id && cell.n > 0) act(G.armed, r, c); else { shakes[r + ',' + c] = clock; A.sfx('no'); vibrate(15); } return; }
        if (!canPlay(G.grid, r, c, p.id)) { shakes[r + ',' + c] = clock; A.sfx('no'); vibrate(15); return; }
        act('place', r, c);
    }
    function bindCanvas() {
        canvas.addEventListener('pointerdown', e => { A.unlock(); const cl = cellFromEvent(e); if (!cl) return; e.preventDefault(); tap(cl[0], cl[1]); });
        canvas.addEventListener('pointermove', e => { hoverCell = (G && humanTurn() && e.pointerType === 'mouse') ? cellFromEvent(e) : null; });
        canvas.addEventListener('pointerleave', () => { hoverCell = null; });
        canvas.addEventListener('contextmenu', e => e.preventDefault());
        canvas.addEventListener('keydown', e => {
            if (!humanTurn()) return; const k = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
            if (k) { e.preventDefault(); hoverCell = hoverCell ? [clampN(hoverCell[0] + k[0], 0, ROWS - 1), clampN(hoverCell[1] + k[1], 0, COLS - 1)] : [4, 2]; }
            else if ((e.key === 'Enter' || e.key === ' ') && hoverCell) { e.preventDefault(); tap(hoverCell[0], hoverCell[1]); }
        });
    }
    const clampN = (v, a, b) => Math.max(a, Math.min(b, v)), clamp01 = v => Math.max(0, Math.min(1, v)), easeOut = t => 1 - Math.pow(1 - t, 3);

    /* ═══════════════ Rendering ═══════════════ */
    const spriteCache = {};
    function spriteFor(skin, color) {
        const key = skin + color.id; if (spriteCache[key]) return spriteCache[key];
        const s = 112, c = document.createElement('canvas'); c.width = c.height = s; const g = c.getContext('2d'), m = s / 2, r = s * 0.25;
        const halo = g.createRadialGradient(m, m, r * 0.7, m, m, m); halo.addColorStop(0, 'rgba(' + color.rgb + ',.6)'); halo.addColorStop(1, 'rgba(' + color.rgb + ',0)'); g.fillStyle = halo; g.fillRect(0, 0, s, s);
        const base = () => { const b = g.createRadialGradient(m - r * 0.35, m - r * 0.4, r * 0.08, m, m, r); b.addColorStop(0, '#FFFFFF'); b.addColorStop(0.32, color.hex); b.addColorStop(1, 'rgba(' + color.rgb.split(',').map(v => Math.round(v * 0.45)).join(',') + ',1)'); g.fillStyle = b; g.beginPath(); g.arc(m, m, r, 0, 6.283); g.fill(); };
        if (skin === 'planet') {
            base(); g.save(); g.beginPath(); g.arc(m, m, r, 0, 6.283); g.clip(); g.fillStyle = 'rgba(255,255,255,.2)'; for (let i = -1; i < 3; i++) { g.fillRect(m - r, m - r * 0.5 + i * r * 0.45, r * 2, r * 0.16); } g.restore();
            g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 3; g.beginPath(); g.ellipse(m, m, r * 1.55, r * 0.42, -0.45, 0, 6.283); g.stroke();
        } else if (skin === 'gem') {
            const pts = []; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; pts.push([m + Math.cos(a) * r, m + Math.sin(a) * r]); }
            g.fillStyle = color.hex; g.beginPath(); pts.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p[0], p[1])); g.closePath(); g.fill();
            pts.forEach((p, i) => { const q = pts[(i + 1) % 8]; g.fillStyle = 'rgba(' + (i % 2 ? '255,255,255,.34' : '0,0,0,.22') + ')'; g.beginPath(); g.moveTo(m, m); g.lineTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.closePath(); g.fill(); });
            g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.moveTo(m - r * 0.35, m - r * 0.5); g.lineTo(m - r * 0.1, m - r * 0.62); g.lineTo(m - r * 0.2, m - r * 0.3); g.closePath(); g.fill();
            g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.5; g.beginPath(); pts.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p[0], p[1])); g.closePath(); g.stroke();
        } else if (skin === 'candy') {
            base(); g.save(); g.beginPath(); g.arc(m, m, r, 0, 6.283); g.clip(); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = r * 0.28; for (let i = -3; i < 4; i++) { g.beginPath(); g.moveTo(m - r * 2, m + i * r * 0.62 + r * 0.9); g.lineTo(m + r * 2, m + i * r * 0.62 - r * 0.9); g.stroke(); } g.restore();
            g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(m - r * 0.38, m - r * 0.45, r * 0.3, r * 0.17, -0.6, 0, 6.283); g.fill();
        } else { base(); g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(m - r * 0.36, m - r * 0.46, r * 0.3, r * 0.16, -0.6, 0, 6.283); g.fill(); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.5; g.beginPath(); g.arc(m, m, r, 0, 6.283); g.stroke(); }
        return (spriteCache[key] = c);
    }
    const THEME_BG = { night: ['#0B0B22', '#14123A'], aurora: ['#031B2E', '#0E3B4F'], sunset: ['#1A0A3A', '#5A1B5E'] };
    function bakeGrid() {
        const dpr = canvas.width / W0, c = document.createElement('canvas'); c.width = canvas.width; c.height = canvas.height;
        const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const col = G.players[G.cur].color, bgc = THEME_BG[cfg.theme] || THEME_BG.night;
        const bg = g.createLinearGradient(0, 0, 0, H0); bg.addColorStop(0, bgc[0]); bg.addColorStop(1, bgc[1]); g.fillStyle = bg; g.fillRect(0, 0, W0, H0);
        if (cfg.theme === 'aurora') { [['rgba(39,245,154,.16)', 0.25], ['rgba(46,168,255,.14)', 0.6]].forEach(([cc, y]) => { const a = g.createLinearGradient(0, H0 * y - 60, W0, H0 * y + 60); a.addColorStop(0, 'rgba(0,0,0,0)'); a.addColorStop(0.5, cc); a.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = a; g.fillRect(0, H0 * y - 70, W0, 140); }); }
        if (cfg.theme === 'sunset') { const sg = g.createRadialGradient(W0 / 2, H0 * 1.05, 10, W0 / 2, H0 * 1.05, H0 * 0.8); sg.addColorStop(0, 'rgba(255,120,60,.45)'); sg.addColorStop(1, 'rgba(255,120,60,0)'); g.fillStyle = sg; g.fillRect(0, 0, W0, H0); }
        const glow = g.createRadialGradient(W0 / 2, H0 / 2, 10, W0 / 2, H0 / 2, Math.max(W0, H0) * 0.7); glow.addColorStop(0, 'rgba(' + col.rgb + ',.13)'); glow.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = glow; g.fillRect(0, 0, W0, H0);
        g.lineCap = 'round';
        for (let pass = 0; pass < 2; pass++) { g.strokeStyle = pass ? 'rgba(' + col.rgb + ',.95)' : 'rgba(' + col.rgb + ',.32)'; g.lineWidth = pass ? 1.6 : 5.5; g.beginPath(); for (let i = 0; i <= COLS; i++) { g.moveTo(i * cs, 0); g.lineTo(i * cs, H0); } for (let j = 0; j <= ROWS; j++) { g.moveTo(0, j * cs); g.lineTo(W0, j * cs); } g.stroke(); }
        g.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i <= COLS; i++) for (let j = 0; j <= ROWS; j++) { g.beginPath(); g.arc(i * cs, j * cs, 1.6, 0, 6.283); g.fill(); }
        gridKey = cfg.theme + col.id; return c;
    }
    function frame(ts) {
        if (!running) return; rafId = requestAnimationFrame(frame);
        const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0); lastTs = ts; clock += dt;
        if (G && G.kind === 'match' && G.deadline && !G.over && !G.busy && !G.players[G.cur].ai) {     // Blitz timer
            const left = G.deadline - clock, tm = $('#timer'); if (tm && tm.firstChild) { tm.firstChild.style.width = clamp01(left / 10) * 100 + '%'; tm.classList.toggle('low', left < 3.5); }
            if (left < 3.4 && Math.floor(left * 2) !== G.lastTick) { G.lastTick = Math.floor(left * 2); if (left > 0 && Math.abs(left - Math.round(left)) < 0.3) A.sfx('tick'); }
            if (left <= 0) { G.deadline = 0; const cs0 = candidates(G.grid, G.cur); floaters.push({ text: "Time's up!", t: clock, c: G.players[G.cur].color, big: true }); const mv = aiChoose(G.grid, G.cur, G.players, tookAll(), 'easy', null) || { r: cs0[0][0], c: cs0[0][1] }; act('place', mv.r, mv.c); }
        }
        if (fireworks && Math.random() < dt * 3.2) { const col = COLORS[(Math.random() * COLORS.length) | 0], x = Math.random() * W0, y = Math.random() * H0 * 0.7; for (let k = 0; k < 18; k++) sparks.push({ x, y, a: k / 18 * 6.283, s: 60 + Math.random() * 60, t: clock, l: 0.9, c: col }); }
        draw();
    }
    function draw() {
        if (!G) return;
        const cur = G.players[G.cur];
        if (!gridCache || gridKey !== cfg.theme + cur.color.id) gridCache = bakeGrid();
        ctx.clearRect(0, 0, W0, H0); ctx.drawImage(gridCache, 0, 0, W0, H0);
        const sk = clock - shake.t < 0.4 ? shake.a * (1 - (clock - shake.t) / 0.4) : 0;
        ctx.save(); if (sk) ctx.translate((Math.random() - 0.5) * sk, (Math.random() - 0.5) * sk);
        // moving scan line
        const sy = ((clock * 0.3) % 1.4 - 0.2) * H0; ctx.globalCompositeOperation = 'lighter'; const sg = ctx.createLinearGradient(0, sy - cs, 0, sy + cs); sg.addColorStop(0, 'rgba(' + cur.color.rgb + ',0)'); sg.addColorStop(0.5, 'rgba(' + cur.color.rgb + ',.07)'); sg.addColorStop(1, 'rgba(' + cur.color.rgb + ',0)'); ctx.fillStyle = sg; ctx.fillRect(0, sy - cs, W0, cs * 2); ctx.globalCompositeOperation = 'source-over';
        const armed = G.armed;
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
            const cell = G.grid[r][c], x = c * cs, y = r * cs, key = r + ',' + c, own = cell.o >= 0 && cell.n > 0;
            if (own) { ctx.fillStyle = 'rgba(' + G.players[cell.o].color.rgb + ',.075)'; ctx.fillRect(x + 2, y + 2, cs - 4, cs - 4); }
            if (own && cell.n === capOf(r, c) - 1) { const col = G.players[cell.o].color; ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(' + col.rgb + ',' + (0.16 + 0.16 * Math.sin(clock * 5 + r + c)) + ')'; ctx.lineWidth = 2; ctx.strokeRect(x + 3, y + 3, cs - 6, cs - 6); ctx.globalCompositeOperation = 'source-over'; }
            if (armed && own && cell.o === G.cur) { ctx.fillStyle = 'rgba(255,255,255,' + (0.1 + 0.08 * Math.sin(clock * 8)) + ')'; ctx.fillRect(x + 2, y + 2, cs - 4, cs - 4); }
            if (hoverCell && hoverCell[0] === r && hoverCell[1] === c) { ctx.fillStyle = 'rgba(' + cur.color.rgb + (canPlay(G.grid, r, c, G.cur) ? ',.2)' : ',.04)'); ctx.fillRect(x + 2, y + 2, cs - 4, cs - 4); }
            if (shakes[key] && clock - shakes[key] < 0.35) { ctx.fillStyle = 'rgba(255,60,60,' + (0.32 * (1 - (clock - shakes[key]) / 0.35)) + ')'; ctx.fillRect(x + 2, y + 2, cs - 4, cs - 4); }
            if (cell.n > 0) drawOrbs(cell, r, c, key);
            else if (hoverCell && hoverCell[0] === r && hoverCell[1] === c && canPlay(G.grid, r, c, G.cur)) { ctx.globalAlpha = 0.4; drawOne(cur.color, x + cs / 2, y + cs / 2, cs * 0.34); ctx.globalAlpha = 1; }
            if (cell.sh && cell.n > 0) { const col = G.players[cell.o].color; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + cs / 2, y + cs / 2, cs * (0.4 + 0.02 * Math.sin(clock * 6)), 0, 6.283); ctx.stroke(); ctx.strokeStyle = 'rgba(' + col.rgb + ',.7)'; ctx.lineWidth = 4; ctx.globalAlpha = 0.5; ctx.stroke(); ctx.globalAlpha = 1; }
        }
        if (hintCell && clock < hintUntil) { const [hr, hc] = hintCell, k = 0.5 + 0.5 * Math.sin(clock * 9); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 + 0.5 * k) + ')'; ctx.lineWidth = 3; ctx.strokeRect(hc * cs + 3, hr * cs + 3, cs - 6, cs - 6); ctx.fillStyle = 'rgba(255,255,255,' + 0.12 * k + ')'; ctx.fillRect(hc * cs + 3, hr * cs + 3, cs - 6, cs - 6); ctx.globalCompositeOperation = 'source-over'; }
        // effects drawn with additive light
        ctx.globalCompositeOperation = 'lighter';
        flights = flights.filter(f => clock - f.t < f.d + 0.03);
        flights.forEach(f => { for (let k = 0; k < 4; k++) { const tt = clamp01((clock - f.t - k * 0.022) / f.d), e = easeOut(tt); ctx.globalAlpha = (1 - k * 0.24); drawOne(f.c, f.x0 + (f.x1 - f.x0) * e, f.y0 + (f.y1 - f.y0) * e, cs * (0.3 - k * 0.04)); } ctx.globalAlpha = 1; });
        flashes = flashes.filter(f => clock - f.t < 0.4);
        flashes.forEach(f => { const k = (clock - f.t) / 0.4, rad = cs * (f.big ? 1.4 : 0.8) * (0.5 + k); const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, rad); g.addColorStop(0, 'rgba(255,255,255,' + 0.42 * (1 - k) + ')'); g.addColorStop(0.35, 'rgba(' + f.c.rgb + ',' + 0.34 * (1 - k) + ')'); g.addColorStop(1, 'rgba(' + f.c.rgb + ',0)'); ctx.fillStyle = g; ctx.fillRect(f.x - rad, f.y - rad, rad * 2, rad * 2); });
        rings = rings.filter(r => clock - r.t < 0.5);
        rings.forEach(r => { const k = (clock - r.t) / 0.5; ctx.strokeStyle = 'rgba(' + r.c.rgb + ',' + (0.95 * (1 - k)) + ')'; ctx.lineWidth = (r.big ? 5 : 3) * (1 - k) + 1; ctx.beginPath(); ctx.arc(r.x, r.y, cs * ((r.big ? 0.3 : 0.2) + (r.big ? 1.2 : 0.85) * easeOut(k)), 0, 6.283); ctx.stroke(); });
        if (sparks.length > 420) sparks.splice(0, sparks.length - 420);
        sparks = sparks.filter(s => clock - s.t < s.l);
        sparks.forEach(s => { const k = (clock - s.t) / s.l, d = s.s * easeOut(k) * 0.9, x = s.x + Math.cos(s.a) * d, y = s.y + Math.sin(s.a) * d, x0 = s.x + Math.cos(s.a) * d * 0.7, y0 = s.y + Math.sin(s.a) * d * 0.7; ctx.strokeStyle = 'rgba(' + s.c.rgb + ',' + (1 - k) + ')'; ctx.lineWidth = 2.2 * (1 - k) + 0.6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke(); });
        ctx.globalCompositeOperation = 'source-over'; ctx.restore();
        floaters = floaters.filter(f => clock - f.t < 1.7);
        floaters.forEach((f, i) => { const k = (clock - f.t) / 1.7, pop = f.big ? 1 + 0.35 * Math.max(0, 1 - k * 6) : 1, y = H0 * (f.id === 'chain' ? 0.34 : 0.5) - k * cs * 0.9; ctx.save(); ctx.globalAlpha = 1 - k * k; ctx.translate(W0 / 2, y); ctx.scale(pop, pop); ctx.font = '700 ' + Math.floor(cs * (f.big ? 0.62 : 0.5)) + 'px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.lineJoin = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = '#0B0B22'; ctx.strokeText(f.text, 0, 0); ctx.shadowColor = f.c.hex; ctx.shadowBlur = 14; ctx.fillStyle = '#fff'; ctx.fillText(f.text, 0, 0); ctx.shadowBlur = 0; ctx.fillStyle = f.c.hex; ctx.globalAlpha *= 0.55; ctx.fillText(f.text, 0, 0); ctx.restore(); });
    }
    function drawOne(color, x, y, d) { ctx.drawImage(spriteFor(cfg.skin, color), x - d * 1.75, y - d * 1.75, d * 3.5, d * 3.5); }
    function drawOrbs(cell, r, c, key) {
        const color = G.players[cell.o].color, cap = capOf(r, c), n = cell.n, cx = (c + 0.5) * cs, cy = (r + 0.5) * cs;
        const danger = n / cap, pop = pops[key] !== undefined ? clamp01((clock - pops[key]) / 0.25) : 1, scale = pop < 1 ? 0.55 + 0.6 * Math.sin(pop * Math.PI / 2) : 1;
        const orbit = n === 1 ? 0 : cs * (n === 2 ? 0.17 : 0.2), speed = 0.7 + 2.6 * danger * danger, jitter = n >= cap - 1 ? cs * 0.02 : cs * 0.006, size = cs * (n >= 3 ? 0.2 : 0.24) * scale;
        const items = [];
        for (let i = 0; i < n; i++) { const a = clock * speed + i * 6.283 / n + (r * 1.3 + c * 0.7); items.push({ a, z: Math.sin(a), x: cx + Math.cos(a) * orbit + Math.sin(clock * 22 + i + r) * jitter, y: cy + Math.sin(a) * orbit * 0.82 + Math.cos(clock * 19 + i + c) * jitter }); }
        items.sort((p, q) => p.z - q.z);
        items.forEach(o => { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(o.x, o.y + size * 1.05, size * 0.8, size * 0.28, 0, 0, 6.283); ctx.fill(); drawOne(color, o.x, o.y - size * 0.08, size * (n > 1 ? 0.9 + 0.14 * o.z : 1)); });
    }

    /* ═══════════════ Buttons ═══════════════ */
    const ACTIONS = {
        home() { A.sfx('click'); showHome(); }, setup() { showSetup(); }, start() { startMatch(); }, again() { closeModal(); startMatch(); }, puzzles() { closeModal(); showPuzzleMap(); },
        how() { showHow(); }, close() { closeModal(); showStyleDone(); }, stats() { showStats(); }, style() { showStyle(); },
        pause() { if (screen !== 'game' || $('.modal')) return; modal('<h2>Paused</h2><button class="btn-big" data-act="close">Resume ▶</button><div class="row"><button class="btn-sub" data-act="' + (G.kind === 'puzzle' ? 'reset' : 'again') + '">🔁 Restart</button><button class="btn-sub" data-act="how">❓ Rules</button></div><div class="row"><button class="btn-sub" data-act="' + (G.kind === 'puzzle' ? 'puzzles' : 'setup') + '">⚙️ ' + (G.kind === 'puzzle' ? 'Puzzles' : 'Setup') + '</button><button class="btn-sub" data-act="home">🏠 Menu</button></div>'); },
        music() { cfg.music = !cfg.music; A.setMusic(cfg.music); persist(); $$('[data-act="music"]').forEach(b => b.classList.toggle('off', !cfg.music)); },
        sfx() { cfg.sfx = !cfg.sfx; A.setSfx(cfg.sfx); persist(); $$('[data-act="sfx"]').forEach(b => b.classList.toggle('off', !cfg.sfx)); },
        'arm-shield'() { if (!humanTurn()) return; G.armed = G.armed === 'shield' ? null : 'shield'; renderUI(); },
        'arm-nova'() { if (!humanTurn()) return; G.armed = G.armed === 'nova' ? null : 'nova'; renderUI(); },
        hintbtn() { hintNow(); }, undo() { undo(); },
        reset() { closeModal(); if (G && G.kind === 'puzzle') { startPuzzleKeep(G.g); } },
        skip() { if (G && G.kind === 'puzzle') startPuzzle(Math.min(29, G.g + 1)); },
        nextpuz() { closeModal(); startPuzzle(Math.min(29, G.g + 1)); }
    };
    function startPuzzleKeep(g) { const keepTries = G ? G.tries : 0, keepHint = G ? G.hinted : false; startPuzzle(g); G.tries = keepTries; G.hinted = keepHint; renderUI(); }
    function showStyleDone() { /* closing a dialog needs no extra work */ }
    document.addEventListener('click', e => {
        const b = e.target.closest('[data-act]'); if (b && ACTIONS[b.dataset.act] && !b.disabled) { A.unlock(); A.sfx('click'); ACTIONS[b.dataset.act](); return; }
        const sg = e.target.closest('.seg [data-key]'); if (sg) { const k = sg.dataset.key; cfg[k] = k === 'players' ? +sg.dataset.val : sg.dataset.val; persist(); A.sfx('click'); $$('[data-key="' + k + '"]').forEach(x => x.classList.toggle('on', x === sg)); const ar = $('#aiRow'); if (ar) ar.hidden = cfg.mode !== 'ai'; return; }
        const fl = e.target.closest('[data-flag]'); if (fl) { const k = fl.dataset.flag; cfg[k] = !cfg[k]; persist(); A.sfx('click'); fl.classList.toggle('on', cfg[k]); return; }
        const pk = e.target.closest('[data-pack]'); if (pk) { A.sfx('click'); showPuzzleMap(+pk.dataset.pack); return; }
        const pz = e.target.closest('[data-puz]'); if (pz && !pz.disabled) { A.unlock(); A.sfx('click'); startPuzzle(+pz.dataset.puz); return; }
        const sk = e.target.closest('[data-skin]'); if (sk && !sk.disabled) { cfg.skin = sk.dataset.skin; persist(); A.sfx('click'); $$('[data-skin]').forEach(x => { x.classList.toggle('on', x === sk); x.querySelector('small').textContent = x === sk ? 'Selected' : 'Tap to use'; }); return; }
        const th = e.target.closest('[data-theme]'); if (th && !th.disabled) { cfg.theme = th.dataset.theme; persist(); A.sfx('click'); applyTheme(); gridCache = null; $$('[data-theme]').forEach(x => { x.classList.toggle('on', x === th); x.querySelector('small').textContent = x === th ? 'Selected' : 'Tap to use'; }); }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) A.pause(); else A.resume(); });
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && screen === 'game') ACTIONS.pause(); });

    applyTheme(); showHome(); checkAch();
    window.RK = RK;
    RK.chain = { ROWS, COLS, capOf, neighbours, newGrid, cloneGrid, explodeWave, applyArrivals, resolveSync, simulate, simulateNova, aiChoose, orbCounts, ownersPresent, canPlay, decided, puzzleOf, enemyOrbs, evaluate,
        get G() { return G; }, act, startMatch, startPuzzle, cfg, ACTIONS, tap, undo, hintNow, ACH, get hintCell() { return hintCell; }, runChainDebug: () => 0 };
})();
