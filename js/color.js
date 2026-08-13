/* ==========================================================================
   Colour by Number — pick a number, tap every shape that wears it.

   Tapping a shape whose number does not match the chosen colour never fails:
   the shape wobbles and the right key entry nudges instead.
   ========================================================================== */
(function () {
    'use strict';

    const NUMBERS = window.COLOR_NUMBERS;
    const PICTURES = window.COLOR_PICTURES;
    const SVG_NS = 'http://www.w3.org/2000/svg';

    const el = id => document.getElementById(id);

    const dom = {
        picker:  el('picker'),
        paper:   el('paper'),
        keyList: el('keyList'),
        hint:    el('keyHint'),
        bar:     el('barFill'),
        count:   el('sheetCount'),
        modal:   el('doneModal'),
        modalArt:el('doneArt'),
        btnNextPic: el('btnNextPic')
    };

    const S = {
        picIdx: 0,
        pick: null,        // currently chosen number
        zones: [],         // { node, n, label }
        filled: 0,
        mistakes: 0,
        finished: false,
        svg: null
    };

    /* ── Picture chooser ─────────────────────────────────────────────── */
    function buildPicker() {
        dom.picker.innerHTML = '';
        PICTURES.forEach((pic, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'picker__btn';
            btn.setAttribute('aria-pressed', String(i === S.picIdx));
            btn.innerHTML = '<em>' + pic.emoji + '</em>' + pic.name;
            btn.addEventListener('click', () => loadPicture(i));
            dom.picker.appendChild(btn);
        });
    }

    function paintPicker() {
        Array.from(dom.picker.children).forEach((b, i) =>
            b.setAttribute('aria-pressed', String(i === S.picIdx)));
    }

    /* ── Load a picture ──────────────────────────────────────────────── */
    function loadPicture(index) {
        S.picIdx = index;
        S.filled = 0;
        S.mistakes = 0;
        S.finished = false;
        S.pick = null;
        dom.modal.hidden = true;
        paintPicker();

        const pic = PICTURES[index];
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('viewBox', '0 0 320 320');
        svg.setAttribute('class', 'sheet__svg');
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', pic.name + ' colouring picture');
        svg.innerHTML = pic.svg;

        dom.paper.innerHTML = '';
        dom.paper.appendChild(svg);
        S.svg = svg;

        // Labels must sit above every shape, so they live in their own layer.
        const labelLayer = document.createElementNS(SVG_NS, 'g');
        labelLayer.setAttribute('class', 'labels');
        svg.appendChild(labelLayer);

        S.zones = Array.from(svg.querySelectorAll('.zone')).map(node => {
            const n = Number(node.dataset.n);
            const at = centreOf(node);
            const label = document.createElementNS(SVG_NS, 'text');
            label.setAttribute('class', 'zone-label');
            label.setAttribute('x', node.dataset.lx !== undefined ? node.dataset.lx : at.x);
            label.setAttribute('y', node.dataset.ly !== undefined ? node.dataset.ly : at.y);
            label.textContent = n;
            labelLayer.appendChild(label);

            node.setAttribute('tabindex', '0');
            node.setAttribute('role', 'button');
            node.setAttribute('aria-label', 'Shape number ' + n);
            node.addEventListener('click', () => onZone(node, n, label));
            node.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onZone(node, n, label); }
            });

            return { node, n, label };
        });

        buildKey();
        const numbers = usedNumbers();
        if (numbers.length) selectNumber(numbers[0], true);
        updateProgress();
        say('Tap every shape marked ' + (numbers[0] || '') + ' 🖍️');
    }

    /* Middle of a shape in viewBox units. getCTM() bakes in the viewBox scale,
       so map through screen space to land back in the SVG's own coordinates —
       that keeps labels right for mirrored groups too. */
    function centreOf(node) {
        const bb = node.getBBox();
        const pt = S.svg.createSVGPoint();
        pt.x = bb.x + bb.width / 2;
        pt.y = bb.y + bb.height / 2;

        const svgCTM = S.svg.getScreenCTM();
        const nodeCTM = node.getScreenCTM();
        if (!svgCTM || !nodeCTM) return { x: Math.round(pt.x), y: Math.round(pt.y) };

        const p = pt.matrixTransform(svgCTM.inverse().multiply(nodeCTM));
        return { x: Math.round(p.x), y: Math.round(p.y) };
    }

    function usedNumbers() {
        return Array.from(new Set(S.zones.map(z => z.n))).sort((a, b) => a - b);
    }

    function remaining(n) {
        return S.zones.filter(z => z.n === n && !z.node.classList.contains('is-filled')).length;
    }

    /* ── Colour key ──────────────────────────────────────────────────── */
    function buildKey() {
        dom.keyList.innerHTML = '';
        usedNumbers().forEach(n => {
            const colour = NUMBERS[n];
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'key__item';
            btn.dataset.n = String(n);
            btn.setAttribute('aria-pressed', 'false');
            btn.setAttribute('aria-label', n + ' is ' + colour.name);
            btn.innerHTML =
                '<span class="key__num" style="background:' + colour.hex + '">' + n + '</span>' +
                '<span class="key__label">' + colour.name + '</span>' +
                '<span class="key__left"></span>';
            btn.addEventListener('click', () => selectNumber(n));
            dom.keyList.appendChild(btn);
        });
        paintKey();
    }

    function paintKey() {
        Array.from(dom.keyList.children).forEach(btn => {
            const n = Number(btn.dataset.n);
            const left = remaining(n);
            btn.setAttribute('aria-pressed', String(n === S.pick));
            btn.classList.toggle('is-complete', left === 0);
            btn.querySelector('.key__left').textContent = left === 0 ? 'all done ✓' : left + ' left';
        });
    }

    function selectNumber(n, quiet) {
        S.pick = n;
        paintKey();
        if (!quiet) {
            Kid.Sound.tap();
            const left = remaining(n);
            say(left
                ? 'Now tap the shapes with a ' + n + ' — ' + NUMBERS[n].name.toLowerCase() + '! 🖍️'
                : 'Every ' + n + ' is coloured already ✅');
        }
    }

    function nudgeKey(n) {
        const btn = dom.keyList.querySelector('[data-n="' + n + '"]');
        if (!btn) return;
        btn.classList.remove('is-nudge');
        void btn.offsetWidth;
        btn.classList.add('is-nudge');
    }

    function say(text, tone) {
        dom.hint.className = 'key__hint' + (tone ? ' is-' + tone : '');
        dom.hint.textContent = text;
    }

    /* ── Colouring ───────────────────────────────────────────────────── */
    function onZone(node, n, label) {
        if (S.finished || node.classList.contains('is-filled')) return;

        if (S.pick === null) {
            say('Pick a colour from the list first 👉');
            return;
        }

        if (n !== S.pick) {
            S.mistakes++;
            node.classList.remove('is-wrong');
            void node.offsetWidth;
            node.classList.add('is-wrong');
            nudgeKey(n);
            Kid.Sound.oops();
            say('That shape says ' + n + ' — tap the ' + n + ' colour first! 👀', 'oops');
            return;
        }

        node.classList.add('is-filled', 'is-just-filled');
        node.style.fill = NUMBERS[n].hex;
        label.classList.add('is-hidden');
        node.setAttribute('aria-label', NUMBERS[n].name + ' shape, coloured');
        setTimeout(() => node.classList.remove('is-just-filled'), 460);

        const box = node.getBoundingClientRect();
        Kid.burst(box.left + box.width / 2, box.top + box.height / 2, [NUMBERS[n].hex, '#FFFFFF']);
        Kid.Sound.pop();

        S.filled++;
        paintKey();
        updateProgress();

        if (S.filled >= S.zones.length) {
            finish();
            return;
        }

        // Colour finished? Move the child on to the next number automatically.
        if (remaining(n) === 0) {
            const next = usedNumbers().find(v => remaining(v) > 0);
            if (next !== undefined) {
                setTimeout(() => {
                    selectNumber(next, true);
                    say('All the ' + n + 's are done! Now colour the ' + next + 's 🎨', 'happy');
                }, 320);
            }
        } else {
            say(remaining(n) + ' more ' + NUMBERS[n].name.toLowerCase() + ' to go 🖍️');
        }
    }

    function updateProgress() {
        const total = S.zones.length || 1;
        dom.bar.style.width = Math.round((S.filled / total) * 100) + '%';
        dom.count.textContent = S.filled + ' of ' + S.zones.length + ' coloured';
    }

    function finish() {
        S.finished = true;
        const clean = S.mistakes === 0;
        const stars = clean ? 2 : 1;
        Kid.Stars.add('colour', stars);

        say('Beautiful! You finished the picture 🎉', 'happy');
        Kid.Sound.fanfare();
        Kid.confetti(70);

        el('doneStars').textContent = '⭐'.repeat(stars);
        el('doneText').textContent = clean
            ? 'Every colour in the right place — perfect!'
            : 'Your ' + PICTURES[S.picIdx].name.toLowerCase() + ' looks wonderful.';

        // Show a copy of the finished picture in the card
        dom.modalArt.innerHTML = '';
        const copy = S.svg.cloneNode(true);
        copy.setAttribute('style', 'max-width:170px;margin:0 auto 6px');
        dom.modalArt.appendChild(copy);

        dom.btnNextPic.textContent = 'Next picture ' + PICTURES[(S.picIdx + 1) % PICTURES.length].emoji;
        setTimeout(() => { dom.modal.hidden = false; el('btnNextPic').focus({ preventScroll: true }); }, 700);
    }

    /* ── Save as a picture file ──────────────────────────────────────── */
    function savePhoto() {
        const clone = S.svg.cloneNode(true);
        clone.setAttribute('xmlns', SVG_NS);
        clone.setAttribute('width', '640');
        clone.setAttribute('height', '640');

        // Inline the styles the exported file cannot inherit from the page.
        const style = document.createElementNS(SVG_NS, 'style');
        style.textContent =
            '.zone{stroke:#2B2440;stroke-width:3.4;stroke-linejoin:round}' +
            '.zone:not([style]){fill:#FFFFFF}' +
            '.ink{fill:none;stroke:#2B2440;stroke-width:3.4;stroke-linecap:round;stroke-linejoin:round}' +
            '.zone-label{font-family:sans-serif;font-size:21px;fill:#6B6591;text-anchor:middle;dominant-baseline:central}' +
            '.zone-label.is-hidden{opacity:0}';
        clone.insertBefore(style, clone.firstChild);

        const svgText = new XMLSerializer().serializeToString(clone);
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            canvas.width = 640;
            canvas.height = 640;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, 640, 640);
            ctx.drawImage(img, 0, 0, 640, 640);
            const link = document.createElement('a');
            link.download = 'my-' + PICTURES[S.picIdx].id + '.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        };
        img.onerror = function () { alert('Sorry — this browser would not let us save the picture.'); };
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
        Kid.Sound.tap();
    }

    /* ── Wiring ──────────────────────────────────────────────────────── */
    el('btnClear').addEventListener('click', () => { Kid.Sound.tap(); loadPicture(S.picIdx); });
    el('btnSave').addEventListener('click', savePhoto);
    el('btnSaveDone').addEventListener('click', savePhoto);
    el('btnStay').addEventListener('click', () => { dom.modal.hidden = true; });
    dom.btnNextPic.addEventListener('click', () => loadPicture((S.picIdx + 1) % PICTURES.length));

    document.addEventListener('keydown', e => {
        if (e.target.closest('button, a')) return;
        const n = Number(e.key);
        if (n >= 1 && n <= 8 && usedNumbers().includes(n)) selectNumber(n);
    });

    buildPicker();
    loadPicture(0);
})();
