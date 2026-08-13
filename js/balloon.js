/* ==========================================================================
   Balloon Math — act it out, then answer it.

   Flow per question:
     1. ACT     pop (subtraction) or count (addition) the balloons
     2. ANSWER  choose from three answers
     3. SCORE   2 stars first try, 1 star after a hint, then next question
   A round is 10 questions and ends with a results card.
   ========================================================================== */
(function () {
    'use strict';

    const ROUND_LENGTH = 10;

    const LEVELS = {
        1: { label: 'Up to 5',  subMax: 5,  addMax: 5  },
        2: { label: 'Up to 10', subMax: 10, addMax: 10 }
    };

    const PRAISE = [
        ['🎉', 'Fantastic!'], ['⭐', 'Brilliant!'], ['🌟', 'Superstar!'],
        ['🦄', 'Magical!'],   ['🎈', 'Perfect!'],   ['🔥', 'On fire!'],
        ['🏆', 'Champion!'],  ['💫', 'Dazzling!'],  ['🌈', 'Wonderful!'],
        ['🍭', 'Sweet work!']
    ];

    const el = id => document.getElementById(id);

    const dom = {
        modeBtns:   Array.from(document.querySelectorAll('[data-mode]')),
        levelBtns:  Array.from(document.querySelectorAll('[data-level]')),
        pips:       el('pips'),
        counter:    el('questionCount'),
        equation:   el('equation'),
        instruction:el('instruction'),
        arena:      el('arena'),
        answers:    el('answers'),
        btnSkip:    el('btnSkip'),
        btnNext:    el('btnNext'),
        streak:     el('streak'),
        streakNum:  el('streakNum'),
        result:     el('resultModal'),
        resultEmoji:el('resultEmoji'),
        resultTitle:el('resultTitle'),
        resultRibbon: el('resultRibbon'),
        resultStars:el('resultStars'),
        resultFirst:el('resultFirst'),
        resultBest: el('resultBest'),
        btnAgain:   el('btnAgain'),
        btnSwitch:  el('btnSwitch')
    };

    /* ── State ───────────────────────────────────────────────────────── */
    const S = {
        mode: 'sub',
        level: 1,
        index: 0,          // 0-based question number in the round
        q: null,           // { a, b, op, answer }
        phase: 'act',      // 'act' | 'answer' | 'scored'
        needed: 0,         // taps required in the act phase
        acted: 0,          // taps done so far
        tries: 0,          // wrong answers on this question
        stars: 0,          // stars earned this round
        firstTry: 0,       // questions solved without a hint
        streak: 0,
        bestStreak: 0,
        recent: [],        // last few sums, so questions do not repeat back to back
        timers: []
    };

    /* Every delayed action is registered so it can be cancelled cleanly —
       stale timers were the source of the old "answer reveals itself" bugs. */
    function later(fn, ms) {
        const id = setTimeout(() => {
            S.timers = S.timers.filter(t => t !== id);
            fn();
        }, ms);
        S.timers.push(id);
        return id;
    }
    function clearTimers() {
        S.timers.forEach(clearTimeout);
        S.timers = [];
    }

    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    /* ── Question generation ─────────────────────────────────────────── */
    function makeQuestion() {
        const cfg = LEVELS[S.level];
        let q, key;
        for (let attempt = 0; attempt < 16; attempt++) {
            if (S.mode === 'sub') {
                const a = rand(2, cfg.subMax);
                const b = rand(1, a - 1);              // always leaves at least 1
                q = { a, b, op: '−', answer: a - b };
            } else {
                const a = rand(1, cfg.addMax - 1);
                const b = rand(1, cfg.addMax - a);
                q = { a, b, op: '+', answer: a + b };
            }
            key = S.mode + q.a + '_' + q.b;
            if (!S.recent.includes(key)) break;
        }
        S.recent.push(key);
        if (S.recent.length > 4) S.recent.shift();
        return q;
    }

    /* Three choices: the answer plus two near misses, never negative. */
    function makeChoices(answer) {
        const ceiling = LEVELS[S.level][S.mode === 'sub' ? 'subMax' : 'addMax'];
        const pool = [];
        [-2, -1, 1, 2].forEach(d => {
            const v = answer + d;
            if (v >= 0 && v <= ceiling + 2) pool.push(v);
        });
        shuffle(pool);

        const choices = [answer];
        while (choices.length < 3 && pool.length) {
            const v = pool.pop();
            if (!choices.includes(v)) choices.push(v);
        }
        // Ultra-safe fallback for tiny ranges
        let extra = 0;
        while (choices.length < 3) {
            extra++;
            if (!choices.includes(answer + extra)) choices.push(answer + extra);
        }
        return shuffle(choices);
    }

    /* ── Rendering: equation ─────────────────────────────────────────── */
    function renderEquation(solved) {
        const q = S.q;
        const opClass = q.op === '−' ? 'equation__op--sub' : 'equation__op--add';
        dom.equation.innerHTML =
            '<span>' + q.a + '</span>' +
            '<span class="' + opClass + '">' + q.op + '</span>' +
            '<span>' + q.b + '</span>' +
            '<span>=</span>' +
            '<span class="equation__slot' + (solved ? ' is-solved' : '') + '">' +
                (solved ? q.answer : '?') +
            '</span>';
    }

    function say(text, tone) {
        dom.instruction.className = 'instruction' + (tone ? ' is-' + tone : '');
        dom.instruction.textContent = text;
    }

    /* ── Rendering: balloons ─────────────────────────────────────────── */
    function makeBalloon(colorIdx, order) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'balloon bc-' + (colorIdx % 8) + ' is-entering';
        b.style.animationDelay = (order * 0.05) + 's';
        b.innerHTML =
            '<span class="balloon__body"><span class="balloon__num"></span></span>' +
            '<span class="balloon__knot"></span>' +
            '<span class="balloon__string"></span>';
        b.addEventListener('click', () => onBalloon(b));
        // Let the entry animation finish, then hand over to the idle bob.
        setTimeout(() => b.classList.remove('is-entering'), 600 + order * 50);
        return b;
    }

    function makeTray(count, offset, plain) {
        const tray = document.createElement('div');
        tray.className = 'tray' + (plain ? ' tray--plain' : '');
        for (let i = 0; i < count; i++) {
            tray.appendChild(makeBalloon(offset + i, i));
        }
        return tray;
    }

    function renderArena() {
        dom.arena.innerHTML = '';
        const q = S.q;

        if (S.mode === 'sub') {
            dom.arena.appendChild(makeTray(q.a, 1, true));
        } else {
            const sign = document.createElement('div');
            sign.className = 'tray__sign';
            sign.setAttribute('aria-hidden', 'true');
            sign.textContent = '+';
            dom.arena.appendChild(makeTray(q.a, 0, false));
            dom.arena.appendChild(sign);
            dom.arena.appendChild(makeTray(q.b, 4, false));
        }
        labelBalloons();
    }

    function balloons() {
        return Array.from(dom.arena.querySelectorAll('.balloon'));
    }

    function labelBalloons() {
        const live = balloons().filter(b => !b.classList.contains('is-popping'));
        live.forEach((b, i) => {
            const done = b.classList.contains('is-counted');
            b.setAttribute('aria-label',
                S.mode === 'sub'
                    ? 'Balloon ' + (i + 1) + ' of ' + live.length + '. Tap to pop it.'
                    : (done ? 'Counted balloon' : 'Balloon. Tap to count it.'));
        });
    }

    function setBalloonsIdle(idle) {
        balloons().forEach(b => b.classList.toggle('is-idle', idle));
    }

    /* ── Act phase ───────────────────────────────────────────────────── */
    function onBalloon(node) {
        if (S.phase !== 'act') return;
        if (node.classList.contains('is-popping') || node.classList.contains('is-counted')) return;

        /* Quota reached (subtraction) — wobble instead of popping one too many. */
        if (S.acted >= S.needed) {
            node.classList.remove('is-nudged');
            void node.offsetWidth;
            node.classList.add('is-nudged');
            say('That\'s enough popping — only ' + S.needed + '! 😊', 'oops');
            Kid.Sound.oops();
            return;
        }

        const rect = node.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        if (S.mode === 'sub') {
            node.classList.add('is-popping');
            Kid.Sound.pop();
            Kid.burst(cx, cy);
            later(() => { node.remove(); labelBalloons(); }, 340);
        } else {
            node.classList.add('is-counted');
            node.querySelector('.balloon__num').textContent = String(S.acted + 1);
            Kid.Sound.tap();
        }

        S.acted++;
        updateActProgress();

        if (S.acted >= S.needed) {
            later(goToAnswer, S.mode === 'sub' ? 420 : 300);
        }
    }

    function updateActProgress() {
        const q = S.q;
        if (S.mode === 'sub') {
            const left = S.needed - S.acted;
            say(left > 0
                ? 'Pop ' + left + ' more balloon' + (left > 1 ? 's' : '') + ' 🎯'
                : 'All popped! Now count what is left 👀');
        } else {
            const left = S.needed - S.acted;
            say(left > 0
                ? 'Tap each balloon to count them — ' + left + ' to go 👆'
                : 'All counted! How many altogether? 🤔');
        }
    }

    function startActPhase() {
        S.phase = 'act';
        S.acted = 0;
        S.needed = S.mode === 'sub' ? S.q.b : S.q.a + S.q.b;
        dom.answers.hidden = true;
        dom.answers.innerHTML = '';
        dom.btnSkip.hidden = false;
        dom.btnNext.disabled = true;
        renderArena();
        say(S.mode === 'sub'
            ? 'Pop ' + S.q.b + ' balloon' + (S.q.b > 1 ? 's' : '') + ' 🎯'
            : 'Tap each balloon to count them 👆');
    }

    /* "I know it" — finish the acting instantly so confident kids aren't stuck. */
    function skipAct() {
        if (S.phase !== 'act') return;
        clearTimers();
        const todo = balloons().filter(b => !b.classList.contains('is-counted'));

        if (S.mode === 'sub') {
            todo.slice(0, S.needed - S.acted).forEach(b => {
                b.classList.add('is-popping');
                later(() => b.remove(), 300);
            });
        } else {
            todo.forEach((b, i) => {
                b.classList.add('is-counted');
                b.querySelector('.balloon__num').textContent = String(S.acted + i + 1);
            });
        }
        S.acted = S.needed;
        Kid.Sound.pop();
        later(goToAnswer, 340);
    }

    /* ── Answer phase ────────────────────────────────────────────────── */
    function goToAnswer() {
        if (S.phase !== 'act') return;
        S.phase = 'answer';
        S.tries = 0;
        dom.btnSkip.hidden = true;
        setBalloonsIdle(true);
        labelBalloons();

        say(S.mode === 'sub' ? 'How many balloons are left?' : 'How many balloons altogether?');

        dom.answers.innerHTML = '';
        makeChoices(S.q.answer).forEach((value, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'answer';
            btn.style.animationDelay = (i * 0.07) + 's';
            btn.dataset.value = String(value);
            btn.setAttribute('aria-label', 'Answer ' + value);
            btn.innerHTML = '<span class="answer__key">' + (i + 1) + '</span>' + value;
            btn.addEventListener('click', () => onAnswer(btn, value));
            dom.answers.appendChild(btn);
        });
        dom.answers.hidden = false;
    }

    function onAnswer(btn, value) {
        if (S.phase !== 'answer') return;

        if (value !== S.q.answer) {
            S.tries++;
            S.streak = 0;
            renderStreak();
            btn.classList.add('is-wrong');
            btn.disabled = true;
            Kid.Sound.oops();
            say(S.tries === 1
                ? 'Not quite — count the balloons again 👀'
                : 'Nearly! Count them slowly, one by one 🐢', 'oops');
            hintBalloons();
            return;
        }

        scoreQuestion(btn);
    }

    function hintBalloons() {
        balloons().filter(b => !b.classList.contains('is-popping')).forEach(b => {
            b.classList.remove('is-hinted');
            void b.offsetWidth;
            b.classList.add('is-hinted');
        });
    }

    function scoreQuestion(btn) {
        S.phase = 'scored';
        const clean = S.tries === 0;
        const earned = clean ? 2 : 1;

        S.stars += earned;
        if (clean) {
            S.firstTry++;
            S.streak++;
            S.bestStreak = Math.max(S.bestStreak, S.streak);
        }
        Kid.Stars.add('balloon', earned);
        renderStreak();

        btn.classList.add('is-right');
        Array.from(dom.answers.children).forEach(b => { if (b !== btn) b.disabled = true; });

        renderEquation(true);
        markPip(S.index, clean ? 'is-done' : 'is-miss');

        const praise = PRAISE[(S.index + (clean ? 0 : 3)) % PRAISE.length];
        const sentence = S.mode === 'sub'
            ? S.q.a + ' balloons take away ' + S.q.b + ' leaves ' + S.q.answer + '!'
            : S.q.a + ' balloons and ' + S.q.b + ' balloons make ' + S.q.answer + '!';
        say(praise[0] + ' ' + praise[1] + ' ' + sentence, 'happy');

        Kid.Sound.play('correct');
        Kid.confetti(clean ? 42 : 24);

        dom.btnNext.disabled = false;
        dom.btnNext.textContent = S.index === ROUND_LENGTH - 1 ? 'See my score 🏁' : 'Next question ➡';
        dom.btnNext.focus({ preventScroll: true });

        later(advance, 2600);   // gentle auto-advance; Next also works
    }

    /* ── Round flow ──────────────────────────────────────────────────── */
    function buildPips() {
        dom.pips.innerHTML = '';
        for (let i = 0; i < ROUND_LENGTH; i++) {
            dom.pips.appendChild(document.createElement('span'));
        }
    }

    function markPip(i, cls) {
        const pip = dom.pips.children[i];
        if (pip) pip.className = cls;
    }

    function paintPips() {
        Array.from(dom.pips.children).forEach((pip, i) => {
            if (i === S.index && !pip.classList.contains('is-done') && !pip.classList.contains('is-miss')) {
                pip.className = 'is-now';
            } else if (i > S.index) {
                pip.className = '';
            }
        });
        dom.counter.textContent = 'Question ' + (S.index + 1) + ' of ' + ROUND_LENGTH;
    }

    function renderStreak() {
        if (S.streak >= 3) {
            dom.streakNum.textContent = S.streak;
            dom.streak.hidden = false;
        } else {
            dom.streak.hidden = true;
        }
    }

    function askQuestion() {
        clearTimers();
        S.q = makeQuestion();
        S.tries = 0;
        paintPips();
        renderEquation(false);
        startActPhase();
    }

    function advance() {
        clearTimers();
        if (S.phase !== 'scored') return;   // Next is only live once scored
        if (S.index >= ROUND_LENGTH - 1) {
            showResults();
            return;
        }
        S.index++;
        askQuestion();
    }

    function startRound() {
        clearTimers();
        dom.result.hidden = true;
        S.index = 0;
        S.tries = 0;
        S.streak = 0;
        S.bestStreak = 0;
        S.firstTry = 0;
        S.stars = 0;
        buildPips();
        renderStreak();
        askQuestion();
    }

    function showResults() {
        S.phase = 'done';
        const score = S.firstTry;
        let emoji = '🌟', title = 'Great going!', ribbon = 'Round complete';

        if (score === ROUND_LENGTH)  { emoji = '🏆'; title = 'Perfect round!'; ribbon = 'Every single one, first try!'; }
        else if (score >= 8)         { emoji = '🎉'; title = 'Superstar!';     ribbon = 'Almost perfect!'; }
        else if (score >= 5)         { emoji = '🌈'; title = 'Well done!';     ribbon = 'Getting stronger!'; }
        else                         { emoji = '🎈'; title = 'Nice try!';      ribbon = 'Practice makes perfect!'; }

        dom.resultEmoji.textContent = emoji;
        dom.resultTitle.textContent = title;
        dom.resultRibbon.textContent = ribbon;
        dom.resultStars.textContent = S.stars;
        dom.resultFirst.textContent = score + '/' + ROUND_LENGTH;
        dom.resultBest.textContent = S.bestStreak;
        dom.result.hidden = false;
        dom.btnAgain.focus({ preventScroll: true });

        Kid.Sound.fanfare();
        Kid.confetti(score >= 8 ? 80 : 50);
    }

    /* ── Settings ────────────────────────────────────────────────────── */
    function paintSwitchers() {
        dom.modeBtns.forEach(b => b.setAttribute('aria-checked', String(b.dataset.mode === S.mode)));
        dom.levelBtns.forEach(b => b.setAttribute('aria-checked', String(Number(b.dataset.level) === S.level)));
    }

    function setMode(mode) {
        if (mode === S.mode) return;
        S.mode = mode;
        paintSwitchers();
        Kid.Sound.tap();
        startRound();
    }

    function setLevel(level) {
        if (level === S.level) return;
        S.level = level;
        paintSwitchers();
        Kid.Sound.tap();
        startRound();
    }

    /* ── Wiring ──────────────────────────────────────────────────────── */
    dom.modeBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
    dom.levelBtns.forEach(b => b.addEventListener('click', () => setLevel(Number(b.dataset.level))));
    dom.btnSkip.addEventListener('click', skipAct);
    dom.btnNext.addEventListener('click', advance);
    dom.btnAgain.addEventListener('click', () => { Kid.Sound.tap(); startRound(); });
    dom.btnSwitch.addEventListener('click', () => {
        dom.result.hidden = true;
        startRound();
        document.getElementById('setup').scrollIntoView({ block: 'center' });
        dom.modeBtns[0].focus({ preventScroll: true });
    });

    document.addEventListener('keydown', e => {
        if (e.target.matches('input, textarea')) return;

        if (S.phase === 'answer' && ['1', '2', '3'].includes(e.key)) {
            const btn = dom.answers.children[Number(e.key) - 1];
            if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
        } else if (S.phase === 'scored' && e.key === 'Enter') {
            e.preventDefault();
            advance();
        } else if (S.phase === 'act' && e.key === 'h') {
            skipAct();
        }
    });

    paintSwitchers();
    startRound();
})();
