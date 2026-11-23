/* LokaKids mini-game arcade: quiz-style games, memory match and number pop. */
(function () {
    'use strict';
    const $ = (s, r) => (r || document).querySelector(s);
    const rnd = n => Math.floor(Math.random() * n);
    const pick = a => a[rnd(a.length)];
    const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const app = $('#app');
    const game = document.body.dataset.game;

    /* ── Shared UI ── */
    function levelsBar(levels, current, onPick) {
        const bar = document.createElement('section');
        bar.className = 'setup';
        const sw = document.createElement('div');
        sw.className = 'switcher'; sw.setAttribute('role', 'radiogroup');
        levels.forEach((l, i) => {
            const b = document.createElement('button');
            b.type = 'button'; b.className = 'switcher__btn'; b.textContent = l.label;
            b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(i === current));
            b.onclick = () => { Kid.Sound.tap(); sw.querySelectorAll('button').forEach((x, k) => x.setAttribute('aria-checked', String(k === i))); onPick(i); };
            sw.appendChild(b);
        });
        bar.appendChild(sw);
        return bar;
    }

    function finish(o) {
        const m = document.createElement('div');
        m.className = 'modal';
        m.innerHTML = '<div class="modal__card"><p class="modal__emoji">' + o.emoji + '</p><h2 class="modal__title">' + o.title +
            '</h2><p class="modal__text">' + o.text + '</p><div class="result__score">' +
            o.stats.map(s => '<div class="result__stat"><b>' + s[0] + '</b><span>' + s[1] + '</span></div>').join('') +
            '</div><div class="modal__actions"><button class="btn btn--primary" type="button">Play again 🔁</button>' +
            '<a class="btn btn--ghost" href="index.html">Back to menu 🏠</a></div></div>';
        document.body.appendChild(m);
        $('button', m).onclick = () => { m.remove(); Kid.Sound.tap(); o.again(); };
        Kid.Sound.fanfare(); Kid.confetti(70);
    }

    const ROUND = 8;

    /* ── Quiz engine (count / pattern / compare) ── */
    function quiz(cfg) {
        let level = 0, q = 0, stars = 0, first = 0, streak = 0, best = 0, tries = 0, current;
        app.innerHTML = '';
        const setup = levelsBar(cfg.levels, 0, i => { level = i; start(); });
        const board = document.createElement('section');
        board.className = 'panel board';
        board.innerHTML = '<div class="pips"></div><p class="board__count"></p><p class="prompt"></p><p class="hintline" aria-live="polite"></p>';
        const stage = document.createElement('section'); stage.className = 'stage';
        const answers = document.createElement('section'); answers.className = 'answers';
        const foot = document.createElement('section'); foot.className = 'game-foot';
        foot.innerHTML = '<span class="streak" hidden>🔥 <b>0</b> in a row!</span>';
        app.append(setup, board, stage, answers, foot);
        const pips = $('.pips', board), count = $('.board__count', board), prompt = $('.prompt', board), hint = $('.hintline', board), streakEl = $('.streak', foot);

        function drawPips() {
            pips.innerHTML = '';
            for (let i = 0; i < ROUND; i++) { const p = document.createElement('i'); p.className = 'pip'; pips.appendChild(p); }
        }
        function start() { q = 0; stars = 0; first = 0; streak = 0; best = 0; drawPips(); next(); }
        function next() {
            tries = 0; hint.textContent = '';
            current = cfg.make(level);
            pips.children[q].classList.add('is-now');
            count.textContent = 'Question ' + (q + 1) + ' of ' + ROUND;
            prompt.textContent = current.prompt;
            stage.innerHTML = current.stage || ''; stage.hidden = !current.stage;
            if (cfg.afterStage) cfg.afterStage(stage);
            answers.dataset.locked = ''; answers.innerHTML = '';
            current.options.forEach((o, i) => {
                const b = document.createElement('button');
                b.type = 'button'; b.className = 'answer' + (o.plate ? ' answer--plate' : ''); b.innerHTML = o.html;
                b.onclick = () => choose(i, b);
                answers.appendChild(b);
            });
        }
        function choose(i, btn) {
            if (i === current.answer) {
                const earned = tries === 0 ? 2 : 1;
                stars += earned; Kid.Stars.add(cfg.key, earned);
                if (tries === 0) { first++; streak++; best = Math.max(best, streak); } else streak = 0;
                streakEl.hidden = streak < 2; $('b', streakEl).textContent = streak;
                btn.classList.add('is-right'); answers.dataset.locked = '1';
                pips.children[q].className = 'pip ' + (tries ? 'is-hint' : 'is-done');
                Kid.Sound.play('correct'); Kid.confetti(tries ? 16 : 30);
                hint.textContent = pick(['Brilliant! 🌟', 'You got it! 🎉', 'Super job! 👏', 'Yes! ✨']);
                q++;
                setTimeout(() => q >= ROUND ? done() : next(), 1300);
            } else {
                tries++; streak = 0; streakEl.hidden = true;
                btn.classList.add('is-wrong'); btn.disabled = true; Kid.Sound.oops();
                hint.textContent = '💡 ' + current.hint;
            }
        }
        function done() {
            finish({
                emoji: stars >= 14 ? '🏆' : '🌟', title: stars >= 14 ? 'Amazing round!' : 'Well done!',
                text: 'You finished all ' + ROUND + ' questions.',
                stats: [[stars, 'stars earned'], [first + '/' + ROUND, 'first try'], [best, 'best streak']], again: start
            });
        }
        start();
    }

    /* Count the Critters */
    const CRITTERS = ['🐞', '🐝', '🦋', '🐸', '🐥', '🐠', '🍎', '🍓', '⭐', '🌸', '🍪', '🦆'];
    function numOptions(n, max) {
        const s = new Set([n]);
        while (s.size < 3) { const v = Math.max(1, Math.min(max, n + pick([-2, -1, 1, 2]))); s.add(v); }
        const arr = shuffle([...s]);
        return { options: arr.map(v => ({ html: v })), answer: arr.indexOf(n) };
    }
    const COUNT = {
        key: 'count', levels: [{ label: '🐣 Up to 5' }, { label: '🚀 Up to 10' }],
        make(l) {
            const max = l ? 10 : 5, n = 1 + rnd(max), e = pick(CRITTERS);
            const o = numOptions(n, max + 2);
            return Object.assign({ prompt: 'How many ' + e + ' can you count?', hint: 'Tap each one and count out loud!',
                stage: Array.from({ length: n }, (_, i) => '<span class="thing" style="--i:' + i + '" data-t>' + e + '</span>').join('') }, o);
        },
        afterStage(stage) {
            let c = 0;
            stage.querySelectorAll('[data-t]').forEach(t => t.onclick = () => {
                if (t.classList.contains('is-counted')) return;
                t.classList.add('is-counted'); t.insertAdjacentHTML('beforeend', '<b class="tag">' + (++c) + '</b>'); Kid.Sound.pop();
            });
        }
    };

    /* Pattern Parade */
    const PAT = ['🔴', '🔵', '🟡', '🟢', '🟣', '🟠', '🍎', '🍌', '🐶', '🐱', '⭐', '🌙'];
    const PATTERNS = [[0, 1], [0, 0, 1], [0, 1, 2], [0, 1, 1], [0, 0, 1, 1]];
    const PATTERN = {
        key: 'pattern', levels: [{ label: '🐣 Easy' }, { label: '🚀 Trickier' }],
        make(l) {
            const shape = pick(l ? PATTERNS.slice(2) : PATTERNS.slice(0, 2));
            const syms = shuffle(PAT).slice(0, 3);
            const reps = Math.ceil(7 / shape.length) + 1;
            const seq = []; for (let r = 0; r < reps; r++) shape.forEach(s => seq.push(syms[s]));
            const showLen = Math.max(5, shape.length * 2 + 1), ans = seq[showLen];
            const opts = shuffle(syms.slice(0, Math.max(3, new Set(shape).size)));
            return { prompt: 'What comes next?', hint: 'Look at the pattern — it repeats!',
                stage: seq.slice(0, showLen).map((s, i) => '<span class="thing" style="--i:' + i + '">' + s + '</span>').join('') + '<span class="slot">?</span>',
                options: opts.map(o => ({ html: o })), answer: opts.indexOf(ans) };
        }
    };

    /* Cookie Compare */
    const COMPARE = {
        key: 'compare', levels: [{ label: '🐣 Up to 5' }, { label: '🚀 Up to 10' }],
        make(l) {
            const max = l ? 10 : 5; let a = 1 + rnd(max), b; do { b = 1 + rnd(max); } while (b === a);
            const more = Math.random() > .5, e = pick(['🍪', '🍩', '🍓', '🧁', '🍭']);
            const want = more ? Math.max(a, b) : Math.min(a, b);
            const plate = n => ({ plate: true, html: '<span>' + e.repeat(n) + '</span>' });
            return { prompt: 'Which plate has ' + (more ? 'MORE' : 'FEWER') + '?', hint: 'Count each plate, then compare the numbers.',
                stage: '', options: [plate(a), plate(b)], answer: a === want ? 0 : 1 };
        }
    };

    /* ── Memory Match ── */
    function memory() {
        const IMG = ['00001', '00004', '00005', '00006', '00007', '00009', '00011', '00013', '00014', '00017']
            .map(n => '<img src="images/characters/image_ComfyUI_' + n + '__extracted.png" alt="">');
        const EMO = ['🦄', '🐱', '🐶', '🦋', '🐸', '🍓', '🌈', '🐠', '🚀', '🍩'];
        const levels = [{ label: '🐣 6 cards', n: 3, cols: 3 }, { label: '🌟 12 cards', n: 6, cols: 4 }, { label: '🚀 16 cards', n: 8, cols: 4 }];
        let lv = 0, moves = 0, matched = 0, open = [], lock = false;
        app.innerHTML = '';
        const setup = levelsBar(levels, 0, i => { lv = i; start(); });
        const board = document.createElement('section'); board.className = 'panel board';
        board.innerHTML = '<p class="prompt">Find the matching pairs!</p><p class="hintline"></p>';
        const grid = document.createElement('section'); grid.className = 'memory';
        app.append(setup, board, grid);
        const info = $('.hintline', board);
        function start() {
            const L = levels[lv]; moves = 0; matched = 0; open = []; lock = false;
            info.textContent = 'Moves: 0'; grid.style.setProperty('--cols', L.cols);
            const faces = shuffle(IMG.concat(EMO)).slice(0, L.n);
            grid.innerHTML = '';
            shuffle(faces.concat(faces)).forEach((f, i) => {
                const c = document.createElement('button'); c.type = 'button'; c.className = 'mcard'; c.dataset.f = faces.indexOf(f);
                c.innerHTML = '<div class="mcard__in"><div class="mcard__face mcard__back">✨</div><div class="mcard__face mcard__front">' + f + '</div></div>';
                c.onclick = () => flip(c); grid.appendChild(c);
            });
        }
        function flip(c) {
            if (lock || c.classList.contains('is-up') || c.classList.contains('is-matched')) return;
            c.classList.add('is-up'); open.push(c); Kid.Sound.tap();
            if (open.length < 2) return;
            moves++; info.textContent = 'Moves: ' + moves; lock = true;
            const [a, b] = open;
            if (a.dataset.f === b.dataset.f) {
                a.classList.replace('is-up', 'is-matched'); b.classList.replace('is-up', 'is-matched');
                open = []; lock = false; matched++; Kid.Sound.play('correct'); Kid.confetti(14);
                if (matched === levels[lv].n) {
                    const n = levels[lv].n, st = moves <= n + 2 ? 3 : moves <= n * 2 ? 2 : 1;
                    Kid.Stars.add('memory', st);
                    setTimeout(() => finish({ emoji: '🧠', title: 'You did it!', text: 'Every pair has been found.',
                        stats: [[st, 'stars earned'], [moves, 'moves'], [n, 'pairs']], again: start }), 700);
                }
            } else setTimeout(() => { a.classList.remove('is-up'); b.classList.remove('is-up'); open = []; lock = false; }, 900);
        }
        start();
    }

    /* ── Number Pop ── */
    function pop() {
        const levels = [{ label: '🐣 1 to 5', n: 5 }, { label: '🌟 1 to 8', n: 8 }, { label: '🚀 1 to 10', n: 10 }];
        const COLS = [['#FF6FA5', '#E63C7E'], ['#3BA9F5', '#1B7FCC'], ['#17C3A2', '#0E9C81'], ['#FFB627', '#E08A00'], ['#7A5AF8', '#5B3FD6']];
        let lv = 0, nextN = 1, mistakes = 0;
        app.innerHTML = '';
        const setup = levelsBar(levels, 0, i => { lv = i; start(); });
        const board = document.createElement('section'); board.className = 'panel board';
        board.innerHTML = '<p class="prompt"></p><p class="hintline"></p>';
        const sky = document.createElement('section'); sky.className = 'sky';
        app.append(setup, board, sky);
        const prompt = $('.prompt', board), hint = $('.hintline', board);
        function start() {
            const n = levels[lv].n; nextN = 1; mistakes = 0; sky.innerHTML = '';
            prompt.textContent = 'Pop the numbers in order: 1, 2, 3…'; hint.textContent = '';
            const slots = shuffle(Array.from({ length: n }, (_, i) => i)); const cols = Math.min(n, 4), rows = Math.ceil(n / cols);
            for (let k = 1; k <= n; k++) {
                const s = slots[k - 1], col = s % cols, row = Math.floor(s / cols), c = COLS[k % COLS.length];
                const b = document.createElement('button'); b.type = 'button'; b.className = 'bub'; b.textContent = k;
                b.style.cssText = 'left:' + (6 + col * (88 / cols) + Math.random() * 4) + '%;top:' + (6 + row * (74 / rows) + Math.random() * 6) + '%;--c1:' + c[0] + ';--c2:' + c[1] + ';--dur:' + (3 + Math.random() * 2) + 's';
                b.onclick = () => hit(b, k); sky.appendChild(b);
            }
            mark();
        }
        function mark() { sky.querySelectorAll('.bub').forEach(b => b.classList.toggle('is-next', mistakes >= 2 && +b.textContent === nextN)); }
        function hit(b, k) {
            if (k !== nextN) { mistakes++; b.classList.remove('is-wrong'); void b.offsetWidth; b.classList.add('is-wrong'); Kid.Sound.oops(); hint.textContent = '💡 Look for number ' + nextN + '!'; mark(); return; }
            b.classList.add('is-gone'); Kid.Sound.pop(); const r = b.getBoundingClientRect(); Kid.burst(r.left + r.width / 2, r.top + r.height / 2);
            hint.textContent = ''; nextN++; mark();
            if (nextN > levels[lv].n) {
                const st = mistakes === 0 ? 3 : mistakes < 3 ? 2 : 1; Kid.Stars.add('pop', st);
                setTimeout(() => finish({ emoji: '🎈', title: 'All popped!', text: 'You counted every number in order.',
                    stats: [[st, 'stars earned'], [levels[lv].n, 'numbers'], [mistakes, 'oops']], again: start }), 500);
            }
        }
        start();
    }

    const G = { count: () => quiz(COUNT), pattern: () => quiz(PATTERN), compare: () => quiz(COMPARE), memory, pop };
    if (G[game]) G[game]();
})();
