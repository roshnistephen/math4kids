const DATA_URL = 'data/color-by-letter/levels.json';
const SVG_NS = 'http://www.w3.org/2000/svg';

class ColorByLetterGame {
    constructor() {
        this.mount = document.getElementById('worksheetMount');
        this.hintList = document.getElementById('hintList');
        this.paletteGrid = document.getElementById('paletteGrid');
        this.progressValue = document.getElementById('progressValue');
        this.levelBadge = document.getElementById('levelBadge');
        this.statusText = document.getElementById('statusText');
        this.worksheetTitle = document.getElementById('worksheetTitle');
        this.sparkleLayer = document.getElementById('sparkleLayer');
        this.confettiLayer = document.getElementById('confettiLayer');
        this.overlay = document.getElementById('completeOverlay');
        this.completeMessage = document.getElementById('completeMessage');
        this.nextLevelButton = document.getElementById('nextLevelButton');
        this.successAudioUrl = 'media/correct-156911.mp3';
        this.failAudioUrl = 'media/wrong-buzzer-6268.mp3';
        this.levelOrder = [];
        this.levelPointer = 0;
        this.completedRegions = new Set();
        this.selectedLetter = null;
        this.regionState = new Map();

        this.nextLevelButton.addEventListener('click', () => this.advanceLevel());
        this.init();
    }

    async init() {
        try {
            const response = await fetch(DATA_URL);
            this.data = await response.json();
            this.levels = [...this.data.levels].sort((a, b) => a.regionCount - b.regionCount);
            this.levelOrder = this.buildLevelOrder();
            await this.loadLevel(this.levelOrder[this.levelPointer]);
        } catch (error) {
            this.mount.innerHTML = '<p style="padding: 24px; text-align: center; color: #7c3aed;">The worksheet could not load right now.</p>';
            this.statusText.textContent = 'Try refreshing the page.';
            console.error(error);
        }
    }

    buildLevelOrder() {
        const grouped = new Map();
        this.levels.forEach((level, index) => {
            const bucket = grouped.get(level.regionCount) || [];
            bucket.push(index);
            grouped.set(level.regionCount, bucket);
        });

        return [...grouped.entries()]
            .sort((a, b) => a[0] - b[0])
            .flatMap(([, indexes]) => this.shuffle(indexes));
    }

    async loadLevel(levelIndex) {
        this.level = this.levels[levelIndex];
        this.completedRegions.clear();
        this.selectedLetter = null;
        this.regionState.clear();
        this.overlay.classList.add('hidden');
        this.statusText.textContent = 'Pick a watercolor to begin.';
        this.worksheetTitle.textContent = this.level.title;
        this.levelBadge.textContent = `Level ${this.levelPointer + 1}`;
        this.progressValue.textContent = `0 / ${this.level.regions.length}`;

        const svgResponse = await fetch(this.level.svg);
        this.mount.innerHTML = await svgResponse.text();
        this.svg = this.mount.querySelector('svg');

        this.decorateSvg();
        this.buildHints();
        this.buildPalette();
    }

    decorateSvg() {
        this.installDefs();
        const paintLayer = document.createElementNS(SVG_NS, 'g');
        paintLayer.setAttribute('id', 'paintLayer');
        const letterLayer = document.createElementNS(SVG_NS, 'g');
        letterLayer.setAttribute('id', 'letterLayer');
        this.svg.append(paintLayer, letterLayer);

        this.level.regions.forEach(region => {
            const baseNode = this.svg.querySelector(`#${region.id}`);
            if (!baseNode) {
                throw new Error(`Missing region ${region.id}`);
            }

            baseNode.classList.add('worksheet-region', 'region-button');
            baseNode.setAttribute('tabindex', '0');
            baseNode.setAttribute('role', 'button');
            baseNode.setAttribute('aria-label', `Letter ${region.letter} region`);
            baseNode.addEventListener('click', event => this.onRegionTap(region, event));
            baseNode.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.onRegionTap(region, event);
                }
            });

            const overlay = baseNode.cloneNode(true);
            overlay.removeAttribute('id');
            overlay.removeAttribute('tabindex');
            overlay.removeAttribute('role');
            overlay.removeAttribute('aria-label');
            overlay.classList.remove('worksheet-region', 'region-button');
            overlay.classList.add('worksheet-region-paint');
            overlay.setAttribute('fill', `url(#wash-${region.letter})`);
            overlay.setAttribute('stroke', 'none');
            paintLayer.appendChild(overlay);

            this.regionState.set(region.id, { baseNode, overlay, letter: region.letter, done: false });

            const label = document.createElementNS(SVG_NS, 'text');
            label.setAttribute('x', region.label.x);
            label.setAttribute('y', region.label.y);
            label.setAttribute('class', 'region-letter');
            label.textContent = region.letter;
            letterLayer.appendChild(label);
        });
    }

    installDefs() {
        const defs = document.createElementNS(SVG_NS, 'defs');
        defs.innerHTML = `
            <filter id="watercolorFilter" x="-15%" y="-15%" width="130%" height="130%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise"></feTurbulence>
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" xChannelSelector="R" yChannelSelector="G"></feDisplacementMap>
                <feGaussianBlur stdDeviation="0.8"></feGaussianBlur>
            </filter>
        `;

        Object.entries(this.level.colorMap).forEach(([letter, swatch]) => {
            const pattern = document.createElementNS(SVG_NS, 'pattern');
            pattern.setAttribute('id', `wash-${letter}`);
            pattern.setAttribute('patternUnits', 'userSpaceOnUse');
            pattern.setAttribute('width', '140');
            pattern.setAttribute('height', '140');

            pattern.innerHTML = `
                <rect width="140" height="140" fill="${this.mixHex(swatch.hex, 18)}"></rect>
                <circle cx="36" cy="34" r="30" fill="${this.mixHex(swatch.hex, 38)}" opacity="0.42"></circle>
                <circle cx="105" cy="52" r="28" fill="${this.mixHex(swatch.hex, -10)}" opacity="0.32"></circle>
                <circle cx="82" cy="108" r="34" fill="${this.mixHex(swatch.hex, 10)}" opacity="0.38"></circle>
                <ellipse cx="46" cy="92" rx="18" ry="12" fill="#ffffff" opacity="0.18"></ellipse>
                <ellipse cx="98" cy="24" rx="16" ry="10" fill="#ffffff" opacity="0.16"></ellipse>
            `;
            defs.appendChild(pattern);
        });

        this.svg.prepend(defs);
    }

    buildHints() {
        this.hintList.innerHTML = '';
        this.activeLetters().forEach(letter => {
            const swatch = this.level.colorMap[letter];
            const row = document.createElement('div');
            row.className = 'hint-row';
            row.innerHTML = `
                <strong>${letter}</strong>
                <span class="hint-color">
                    <span class="swatch-dot" style="background:${swatch.hex}"></span>
                    <span>${swatch.emoji} ${swatch.name}</span>
                </span>
            `;
            this.hintList.appendChild(row);
        });
    }

    buildPalette() {
        this.paletteGrid.innerHTML = '';
        this.activeLetters().forEach(letter => {
            const swatch = this.level.colorMap[letter];
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'palette-blob';
            button.setAttribute('role', 'option');
            button.setAttribute('aria-selected', 'false');
            button.setAttribute('aria-label', `${swatch.name} paint for letter ${letter}`);
            button.innerHTML = `
                <span class="blob-paint" style="background:
                    radial-gradient(circle at 32% 28%, rgba(255,255,255,0.6), transparent 38%),
                    radial-gradient(circle at 68% 72%, rgba(255,255,255,0.25), transparent 35%),
                    ${swatch.hex};"></span>
                <span class="palette-letter">${letter}</span>
                <span class="palette-name">${swatch.name}</span>
            `;
            button.addEventListener('click', () => this.selectLetter(letter));
            this.paletteGrid.appendChild(button);
        });
    }

    selectLetter(letter) {
        this.selectedLetter = letter;
        this.statusText.textContent = `${letter} is ready. Find all the ${letter} regions.`;
        [...this.paletteGrid.children].forEach((button, index) => {
            const active = this.activeLetters()[index] === letter;
            button.classList.toggle('active', active);
            button.setAttribute('aria-selected', String(active));
        });
    }

    onRegionTap(region, event) {
        const state = this.regionState.get(region.id);
        if (!state || state.done) {
            return;
        }

        if (!this.selectedLetter) {
            this.bumpPalette();
            this.statusText.textContent = 'Pick a watercolor first.';
            return;
        }

        if (this.selectedLetter !== region.letter) {
            state.baseNode.classList.remove('wrong');
            void state.baseNode.getBoundingClientRect();
            state.baseNode.classList.add('wrong');
            this.statusText.textContent = 'Oops! Try a different color.';
            this.playAudio(this.failAudioUrl, 0.22);
            return;
        }

        state.done = true;
        state.baseNode.classList.add('done');
        state.overlay.style.opacity = '1';
        state.overlay.animate(
            [
                { opacity: 0, transform: 'scale(0.88)' },
                { opacity: 1, transform: 'scale(1.03)', offset: 0.7 },
                { opacity: 1, transform: 'scale(1)' }
            ],
            { duration: 520, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'forwards' }
        );
        this.spawnSparkles(event, this.level.colorMap[region.letter].emoji);
        this.playAudio(this.successAudioUrl, 0.45);
        this.completedRegions.add(region.id);
        this.progressValue.textContent = `${this.completedRegions.size} / ${this.level.regions.length}`;
        this.statusText.textContent = `Great job! ${region.letter} is colored.`;

        if (this.completedRegions.size === this.level.regions.length) {
            window.setTimeout(() => this.finishLevel(), 420);
        }
    }

    finishLevel() {
        this.statusText.textContent = 'Amazing! Your worksheet is complete.';
        this.completeMessage.textContent = `${this.level.title} is beautifully painted!`;
        const isLastLevel = this.levelPointer >= this.levelOrder.length - 1;
        this.nextLevelButton.textContent = isLastLevel ? 'Play Again' : 'Next Level';
        this.overlay.classList.remove('hidden');
        this.launchConfetti();
        this.playApplause();
    }

    advanceLevel() {
        this.overlay.classList.add('hidden');
        if (this.levelPointer >= this.levelOrder.length - 1) {
            this.levelOrder = this.buildLevelOrder();
            this.levelPointer = 0;
        } else {
            this.levelPointer += 1;
        }
        this.loadLevel(this.levelOrder[this.levelPointer]);
    }

    launchConfetti() {
        this.confettiLayer.innerHTML = '';
        const colors = ['#ff6b6b', '#facc15', '#34d399', '#60a5fa', '#c084fc', '#fb7185'];
        for (let i = 0; i < 36; i += 1) {
            const piece = document.createElement('span');
            piece.className = 'confetti-piece';
            piece.style.left = `${Math.random() * 100}%`;
            piece.style.background = colors[i % colors.length];
            piece.style.animationDuration = `${1.8 + Math.random() * 1.6}s`;
            piece.style.animationDelay = `${Math.random() * 0.4}s`;
            piece.style.transform = `rotate(${Math.random() * 360}deg)`;
            this.confettiLayer.appendChild(piece);
        }
        window.setTimeout(() => {
            this.confettiLayer.innerHTML = '';
        }, 3600);
    }

    spawnSparkles(event, emoji) {
        const rect = this.sparkleLayer.getBoundingClientRect();
        const x = 'clientX' in event ? event.clientX - rect.left : rect.width / 2;
        const y = 'clientY' in event ? event.clientY - rect.top : rect.height / 2;

        for (let i = 0; i < 6; i += 1) {
            const sparkle = document.createElement('span');
            sparkle.className = 'sparkle';
            sparkle.textContent = i % 2 === 0 ? '✨' : emoji;
            sparkle.style.left = `${x}px`;
            sparkle.style.top = `${y}px`;
            sparkle.style.setProperty('--dx', `${(Math.random() - 0.5) * 54}px`);
            sparkle.style.setProperty('--dy', `${-20 - Math.random() * 44}px`);
            this.sparkleLayer.appendChild(sparkle);
            window.setTimeout(() => sparkle.remove(), 760);
        }
    }

    bumpPalette() {
        [...this.paletteGrid.children].forEach(button => {
            button.classList.remove('is-jiggling');
            void button.offsetWidth;
            button.classList.add('is-jiggling');
        });
    }

    activeLetters() {
        return Object.keys(this.level.colorMap).sort();
    }

    shuffle(items) {
        const clone = [...items];
        for (let i = clone.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [clone[i], clone[j]] = [clone[j], clone[i]];
        }
        return clone;
    }

    mixHex(hex, amount) {
        const value = Number.parseInt(hex.slice(1), 16);
        const apply = shift => Math.max(0, Math.min(255, shift));
        const r = apply((value >> 16) + amount);
        const g = apply(((value >> 8) & 255) + amount);
        const b = apply((value & 255) + amount);
        return `rgb(${r}, ${g}, ${b})`;
    }

    playAudio(url, volume) {
        const audio = new Audio(url);
        audio.volume = volume;
        audio.play().catch(() => {});
    }

    playApplause() {
        this.playAudio(this.successAudioUrl, 0.55);
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextCtor) {
            return;
        }
        if (!this.audioContext) {
            this.audioContext = new AudioContextCtor();
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(() => {});
        }
        const now = this.audioContext.currentTime;
        [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            oscillator.type = index % 2 === 0 ? 'triangle' : 'sine';
            oscillator.frequency.value = frequency;
            gain.gain.setValueAtTime(0.001, now + index * 0.06);
            gain.gain.linearRampToValueAtTime(0.08, now + index * 0.06 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.06 + 0.32);
            oscillator.connect(gain);
            gain.connect(this.audioContext.destination);
            oscillator.start(now + index * 0.06);
            oscillator.stop(now + index * 0.06 + 0.32);
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ColorByLetterGame());
} else {
    new ColorByLetterGame();
}
