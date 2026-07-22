// ============================================================
// UNICORN MAKEOVER GAME
// ============================================================

const PARTS = [
    { id: 'horn',   label: 'Horn ✨',         emoji: '✨' },
    { id: 'mane',   label: 'Mane 🌈',          emoji: '🌈' },
    { id: 'eyes',   label: 'Eyeshadow 👁️',     emoji: '👁️' },
    { id: 'cheeks', label: 'Blush 🌸',          emoji: '🌸' },
    { id: 'lips',   label: 'Lips 💋',           emoji: '💋' },
    { id: 'nails',  label: 'Nail Polish 💅',    emoji: '💅' },
];

const COLORS_PER_PART = 6;

const PALETTES = {
    horn:   ['#FFD700', '#FF69B4', '#B39DDB', '#4DD0E1', '#FF7043', '#E0E0E0'],
    mane:   ['#F06292', '#AB47BC', '#26C6DA', '#FFCA28', '#EF5350', '#66BB6A'],
    eyes:   ['#5C6BC0', '#AB47BC', '#EC407A', '#26A69A', '#FF7043', '#26C6DA'],
    cheeks: ['#F48FB1', '#F06292', '#FFCCBC', '#CE93D8', '#B0BEC5', '#FFF59D'],
    lips:   ['#E91E63', '#C62828', '#FF7043', '#AD1457', '#F48FB1', '#FF1744'],
    nails:  ['#F48FB1', '#E53935', '#7B1FA2', '#0288D1', '#F9A825', '#2E7D32'],
};

const COLOR_NAMES = {
    horn:   ['Gold', 'Rose Pink', 'Lavender', 'Sky Blue', 'Coral', 'Silver'],
    mane:   ['Pink', 'Purple', 'Teal', 'Yellow', 'Red', 'Green'],
    eyes:   ['Indigo', 'Violet', 'Hot Pink', 'Teal', 'Orange', 'Cyan'],
    cheeks: ['Blush', 'Deep Rose', 'Peach', 'Lilac', 'Misty Blue', 'Cream'],
    lips:   ['Magenta', 'Dark Red', 'Coral', 'Berry', 'Light Pink', 'Cherry Red'],
    nails:  ['Cotton Candy', 'Cherry Red', 'Royal Purple', 'Ocean Blue', 'Honey Gold', 'Emerald'],
};

class UnicornMakeupGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.progressEl = document.getElementById('progressValue');
        this.progressStarsEl = document.getElementById('progressStars');
        this.overlay = document.getElementById('completeOverlay');
        this.finalStarsEl = document.getElementById('finalStars');
        this.applyBtn = document.getElementById('applyButton');
        this.clearBtn = document.getElementById('clearButton');
        this.resetBtn = document.getElementById('resetButton');

        // Layout
        this.CX = 240;
        this.CY = 235;
        this.R  = 115;

        // State
        this.partIdx  = 0;
        this.colorIdx = 0;
        this.applied  = Object.fromEntries(PARTS.map(p => [p.id, null]));
        this.doneCount = 0;
        this.sparkles  = [];

        this.buildUI();
        this.attachEvents();
        this.loop();
    }

    // ── UI ──────────────────────────────────────────────────

    buildUI() {
        const list = document.getElementById('partsList');
        PARTS.forEach((p, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'part-item' + (i === 0 ? ' active' : '');
            btn.dataset.index = String(i);
            btn.setAttribute('role', 'option');
            btn.setAttribute('aria-selected', String(i === 0));
            btn.innerHTML = `<span class="part-emoji">${p.emoji}</span>${p.label}`;
            btn.addEventListener('click', () => {
                this.partIdx  = i;
                this.colorIdx = 0;
                this.refreshUI();
            });
            list.appendChild(btn);
        });
        this.refreshColors();
    }

    refreshUI() {
        document.querySelectorAll('.part-item').forEach((btn, i) => {
            const active = i === this.partIdx;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-selected', String(active));
        });
        this.refreshColors();
    }

    refreshColors() {
        const grid   = document.getElementById('colorGrid');
        grid.innerHTML = '';
        const partId = PARTS[this.partIdx].id;
        const colors = PALETTES[partId];
        const names  = COLOR_NAMES[partId];

        colors.forEach((hex, i) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'color-swatch' + (i === this.colorIdx ? ' active' : '');
            btn.style.backgroundColor = hex;
            btn.title = names[i];
            btn.setAttribute('role', 'option');
            btn.setAttribute('aria-label', names[i]);
            btn.setAttribute('aria-selected', String(i === this.colorIdx));
            btn.dataset.index = String(i);
            btn.addEventListener('click', () => {
                this.colorIdx = i;
                this.applyMakeup();
                this.refreshUI();
            });
            grid.appendChild(btn);
        });
    }

    attachEvents() {
        document.addEventListener('keydown', e => this.onKey(e));
        this.applyBtn.addEventListener('click', () => this.applyMakeup());
        this.clearBtn.addEventListener('click', () => this.reset());
        this.resetBtn.addEventListener('click', () => this.reset());
    }

    onKey(e) {
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                this.partIdx  = (this.partIdx - 1 + PARTS.length) % PARTS.length;
                this.colorIdx = 0;
                this.refreshUI();
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.partIdx  = (this.partIdx + 1) % PARTS.length;
                this.colorIdx = 0;
                this.refreshUI();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.colorIdx = (this.colorIdx - 1 + COLORS_PER_PART) % COLORS_PER_PART;
                this.refreshUI();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.colorIdx = (this.colorIdx + 1) % COLORS_PER_PART;
                this.refreshUI();
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                this.applyMakeup();
                break;
        }
    }

    applyMakeup() {
        const partId = PARTS[this.partIdx].id;
        const hex    = PALETTES[partId][this.colorIdx];
        const isNew  = this.applied[partId] === null;
        this.applied[partId] = hex;

        if (isNew) {
            this.doneCount++;
            this.updateProgress();
        }

        this.spawnSparkles(partId);
        this.playSound();

        if (this.doneCount >= PARTS.length) {
            setTimeout(() => this.showComplete(), 900);
        }
    }

    updateProgress() {
        this.progressEl.textContent = `${this.doneCount} / ${PARTS.length}`;
        this.progressStarsEl.textContent = '⭐'.repeat(this.doneCount);
    }

    showComplete() {
        this.finalStarsEl.textContent = '⭐'.repeat(PARTS.length);
        this.overlay.classList.remove('hidden');
    }

    reset() {
        this.applied   = Object.fromEntries(PARTS.map(p => [p.id, null]));
        this.doneCount = 0;
        this.sparkles  = [];
        this.progressEl.textContent = `0 / ${PARTS.length}`;
        this.progressStarsEl.textContent = '';
        this.overlay.classList.add('hidden');
    }

    // ── Game Loop ────────────────────────────────────────────

    loop() {
        this.render();
        requestAnimationFrame(() => this.loop());
    }

    render() {
        const { ctx, canvas } = this;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.drawBg();
        this.drawScene();
        this.tickSparkles();
    }

    // ── Drawing ──────────────────────────────────────────────

    drawBg() {
        const { ctx } = this;
        const g = ctx.createLinearGradient(0, 0, 480, 480);
        g.addColorStop(0,   '#FFF0FA');
        g.addColorStop(0.5, '#F5F0FF');
        g.addColorStop(1,   '#EFF5FF');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 480, 480);

        // Decorative background stars
        [
            [35,  35,  10], [445, 30,  8],  [20,  215, 7],  [460, 190, 9],
            [45,  405, 8],  [440, 425, 10], [90,  458, 7],  [395, 460, 9],
            [120, 12,  6],  [358, 10,  7],  [468, 342, 6],  [12,  322, 7],
        ].forEach(([x, y, s]) => this.drawBgStar(x, y, s));
    }

    drawBgStar(x, y, size) {
        const { ctx } = this;
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = '#FFD700';
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a1 = (i * 4 * Math.PI / 5) - Math.PI / 2;
            const a2 = a1 + (2 * Math.PI / 5);
            const px = Math.cos(a1) * size;
            const py = Math.sin(a1) * size;
            const qx = Math.cos(a2) * (size * 0.4);
            const qy = Math.sin(a2) * (size * 0.4);
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            ctx.lineTo(qx, qy);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    drawScene() {
        const { CX, CY, R } = this;
        this.drawManeBack();
        this.drawEars();
        this.drawHead();
        this.drawHorn();
        this.drawManeFront();
        this.drawEyes();
        this.drawCheeks();
        this.drawNose();
        this.drawLips();
        this.drawNailBottles();
    }

    drawManeBack() {
        const { ctx, CX, CY, applied } = this;
        const c1 = applied.mane || '#F06292';
        const c2 = this.tint(c1, 40);
        const c3 = this.tint(c1, -35);

        [
            { x1: CX+55, y1: CY-58, cpx1: CX+155, cpy1: CY-78, cpx2: CX+165, cpy2: CY+58, x2: CX+112, y2: CY+108, lw: 32, c: c1 },
            { x1: CX+45, y1: CY-88, cpx1: CX+168, cpy1: CY-108, cpx2: CX+175, cpy2: CY+8, x2: CX+122, y2: CY+72, lw: 26, c: c2 },
            { x1: CX+35, y1: CY-108, cpx1: CX+142, cpy1: CY-138, cpx2: CX+158, cpy2: CY-38, x2: CX+102, y2: CY+18, lw: 20, c: c3 },
        ].forEach(s => {
            ctx.beginPath();
            ctx.moveTo(s.x1, s.y1);
            ctx.bezierCurveTo(s.cpx1, s.cpy1, s.cpx2, s.cpy2, s.x2, s.y2);
            ctx.strokeStyle = s.c;
            ctx.lineWidth   = s.lw;
            ctx.lineCap     = 'round';
            ctx.stroke();
        });
    }

    drawEars() {
        const { ctx, CX, CY } = this;
        // Left ear
        ctx.fillStyle   = '#FFF5F9';
        ctx.strokeStyle = '#F8BBD0';
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.moveTo(CX - 74, CY - 70);
        ctx.lineTo(CX - 100, CY - 124);
        ctx.lineTo(CX - 42,  CY - 86);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#FFD6E8';
        ctx.beginPath();
        ctx.moveTo(CX - 75,  CY - 75);
        ctx.lineTo(CX - 94,  CY - 116);
        ctx.lineTo(CX - 50,  CY - 90);
        ctx.closePath();
        ctx.fill();

        // Right ear
        ctx.fillStyle   = '#FFF5F9';
        ctx.strokeStyle = '#F8BBD0';
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.moveTo(CX + 74,  CY - 70);
        ctx.lineTo(CX + 100, CY - 124);
        ctx.lineTo(CX + 42,  CY - 86);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#FFD6E8';
        ctx.beginPath();
        ctx.moveTo(CX + 75,  CY - 75);
        ctx.lineTo(CX + 94,  CY - 116);
        ctx.lineTo(CX + 50,  CY - 90);
        ctx.closePath();
        ctx.fill();
    }

    drawHead() {
        const { ctx, CX, CY, R } = this;
        ctx.beginPath();
        ctx.arc(CX, CY, R, 0, Math.PI * 2);
        ctx.fillStyle   = '#FFF5F9';
        ctx.fill();
        ctx.strokeStyle = '#F8BBD0';
        ctx.lineWidth   = 2.5;
        ctx.stroke();
    }

    drawHorn() {
        const { ctx, CX, CY, R, applied } = this;
        const color    = applied.horn || '#F0E68C';
        const tipX     = CX;
        const tipY     = CY - R - 72;
        const baseY    = CY - R + 8;
        const baseHalf = 14;

        ctx.beginPath();
        ctx.moveTo(CX - baseHalf, baseY);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(CX + baseHalf, baseY);
        ctx.closePath();
        ctx.fillStyle   = color;
        ctx.fill();
        ctx.strokeStyle = this.tint(color, -45);
        ctx.lineWidth   = 1.5;
        ctx.stroke();

        // Diagonal stripe shimmer lines
        for (let i = 1; i <= 3; i++) {
            const t    = i / 4;
            const sy   = baseY + t * (tipY - baseY);
            const half = (1 - t) * baseHalf;
            ctx.strokeStyle = 'rgba(255,255,255,0.55)';
            ctx.lineWidth   = 1.5;
            ctx.beginPath();
            ctx.moveTo(CX - half, sy);
            ctx.lineTo(CX - half * 0.25, sy - 7);
            ctx.stroke();
        }

        // Inner shimmer
        ctx.fillStyle = 'rgba(255,255,255,0.38)';
        ctx.beginPath();
        ctx.moveTo(CX - 4, baseY);
        ctx.lineTo(CX - 1, tipY + 22);
        ctx.lineTo(CX + 5, baseY);
        ctx.closePath();
        ctx.fill();
    }

    drawManeFront() {
        const { ctx, CX, CY, R, applied } = this;
        const c1 = applied.mane || '#F06292';
        const c2 = this.tint(c1, 35);
        const c3 = this.tint(c1, -35);

        [
            { x1: CX-18, y1: CY-R+12, cpx: CX-34, cpy: CY-R+50, x2: CX-26, y2: CY-R+72, lw: 14, c: c1 },
            { x1: CX+5,  y1: CY-R+5,  cpx: CX-10, cpy: CY-R+46, x2: CX-2,  y2: CY-R+68, lw: 11, c: c2 },
            { x1: CX+22, y1: CY-R+14, cpx: CX+16, cpy: CY-R+48, x2: CX+18, y2: CY-R+62, lw: 9,  c: c3 },
        ].forEach(s => {
            ctx.beginPath();
            ctx.moveTo(s.x1, s.y1);
            ctx.quadraticCurveTo(s.cpx, s.cpy, s.x2, s.y2);
            ctx.strokeStyle = s.c;
            ctx.lineWidth   = s.lw;
            ctx.lineCap     = 'round';
            ctx.stroke();
        });
    }

    drawEyes() {
        const { ctx, CX, CY, applied } = this;
        const irisColor = applied.eyes || '#9C27B0';

        [CX - 36, CX + 36].forEach(ex => {
            const ey = CY - 18;

            // Eyeshadow
            ctx.globalAlpha = 0.45;
            ctx.fillStyle   = irisColor;
            ctx.beginPath();
            ctx.ellipse(ex, ey - 11, 23, 13, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;

            // White
            ctx.fillStyle   = '#FFFFFF';
            ctx.strokeStyle = '#555';
            ctx.lineWidth   = 1.5;
            ctx.beginPath();
            ctx.ellipse(ex, ey, 20, 13, 0, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();

            // Iris
            ctx.fillStyle = irisColor;
            ctx.beginPath();
            ctx.arc(ex, ey, 9, 0, Math.PI * 2);
            ctx.fill();

            // Pupil
            ctx.fillStyle = '#1A1A2E';
            ctx.beginPath();
            ctx.arc(ex, ey, 5.5, 0, Math.PI * 2);
            ctx.fill();

            // Shine dot
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(ex + 3, ey - 3, 3, 0, Math.PI * 2);
            ctx.fill();

            // Top lashes
            ctx.strokeStyle = '#333';
            ctx.lineWidth   = 1.5;
            ctx.lineCap     = 'round';
            for (let j = -2; j <= 2; j++) {
                const lx  = ex + j * 5;
                const off = j < 0 ? -3 : j > 0 ? 3 : 0;
                ctx.beginPath();
                ctx.moveTo(lx, ey - 13);
                ctx.lineTo(lx + off, ey - 20 - (j === 0 ? 2 : 0));
                ctx.stroke();
            }
        });
    }

    drawCheeks() {
        const { ctx, CX, CY, applied } = this;
        ctx.fillStyle   = applied.cheeks || '#FFCDD2';
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
        ctx.fillStyle   = '#E8A0B4';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.ellipse(CX - 12, CY + 48, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(CX + 12, CY + 48, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    drawLips() {
        const { ctx, CX, CY, applied } = this;
        const color = applied.lips || '#F06292';

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(CX - 26, CY + 68);
        ctx.quadraticCurveTo(CX - 12, CY + 60, CX,      CY + 64);
        ctx.quadraticCurveTo(CX + 12, CY + 60, CX + 26, CY + 68);
        ctx.quadraticCurveTo(CX + 14, CY + 82, CX,      CY + 84);
        ctx.quadraticCurveTo(CX - 14, CY + 82, CX - 26, CY + 68);
        ctx.closePath();
        ctx.fill();

        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.ellipse(CX - 9, CY + 66, 8, 4, -0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    drawNailBottles() {
        const { ctx, CX, applied } = this;
        const nailColor = applied.nails || '#FFCDD2';
        const xs        = [CX - 96, CX - 32, CX + 32, CX + 96];

        xs.forEach(x => {
            const capColor  = this.tint(nailColor, 40);
            const neckColor = this.tint(nailColor, 20);
            const darkLine  = this.tint(nailColor, -50);

            // Bottle body
            ctx.fillStyle   = nailColor;
            ctx.strokeStyle = darkLine;
            ctx.lineWidth   = 1.5;
            this.rrect(ctx, x - 15, 400, 30, 52, 6);
            ctx.fill(); ctx.stroke();

            // Body shine
            ctx.fillStyle = 'rgba(255,255,255,0.32)';
            ctx.beginPath();
            ctx.ellipse(x - 5, 418, 5, 14, 0, 0, Math.PI * 2);
            ctx.fill();

            // Neck
            ctx.fillStyle   = neckColor;
            ctx.strokeStyle = darkLine;
            ctx.lineWidth   = 1.5;
            this.rrect(ctx, x - 6, 387, 12, 14, 3);
            ctx.fill(); ctx.stroke();

            // Cap
            ctx.fillStyle   = capColor;
            ctx.strokeStyle = darkLine;
            ctx.lineWidth   = 1.5;
            this.rrect(ctx, x - 9, 375, 18, 13, 5);
            ctx.fill(); ctx.stroke();

            // Cap top glint
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.beginPath();
            ctx.ellipse(x - 2, 379, 4, 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // ── Sparkles ─────────────────────────────────────────────

    spawnSparkles(partId) {
        const { CX, CY, R } = this;
        const origins = {
            horn:   { x: CX,       y: CY - R - 35 },
            mane:   { x: CX + R + 20, y: CY - 20  },
            eyes:   { x: CX,       y: CY - 20      },
            cheeks: { x: CX,       y: CY + 22      },
            lips:   { x: CX,       y: CY + 70      },
            nails:  { x: CX,       y: 428           },
        };
        const o = origins[partId];
        const palette = PALETTES[partId];

        for (let i = 0; i < 16; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 3;
            this.sparkles.push({
                x:     o.x + (Math.random() - 0.5) * 70,
                y:     o.y + (Math.random() - 0.5) * 45,
                vx:    Math.cos(angle) * speed,
                vy:    Math.sin(angle) * speed - 1.2,
                life:  1,
                decay: 0.018 + Math.random() * 0.024,
                size:  4 + Math.random() * 9,
                color: palette[Math.floor(Math.random() * palette.length)],
            });
        }
    }

    tickSparkles() {
        const { ctx } = this;
        this.sparkles = this.sparkles.filter(s => s.life > 0.02);
        this.sparkles.forEach(s => {
            s.x    += s.vx;
            s.y    += s.vy;
            s.vy   += 0.07;
            s.life -= s.decay;

            ctx.save();
            ctx.globalAlpha = s.life;
            ctx.fillStyle   = s.color;
            ctx.translate(s.x, s.y);
            ctx.rotate(s.life * 9);

            // 4-pointed star
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
                const a = (i / 4) * Math.PI * 2;
                const b = a + Math.PI / 4;
                if (i === 0) ctx.moveTo(Math.cos(a) * s.size, Math.sin(a) * s.size);
                else         ctx.lineTo(Math.cos(a) * s.size, Math.sin(a) * s.size);
                ctx.lineTo(Math.cos(b) * s.size * 0.38, Math.sin(b) * s.size * 0.38);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        });
    }

    // ── Helpers ──────────────────────────────────────────────

    rrect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y,     x + w, y + r,     r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x,     y + h, x,     y + h - r, r);
        ctx.lineTo(x,     y + r);
        ctx.arcTo(x,     y,     x + r, y,         r);
        ctx.closePath();
    }

    tint(hex, amount) {
        const n = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, Math.max(0, (n >> 16)          + amount));
        const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff)  + amount));
        const b = Math.min(255, Math.max(0, (n & 0xff)         + amount));
        return `rgb(${r},${g},${b})`;
    }

    playSound() {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        if (!this.ac) this.ac = new AC();
        if (this.ac.state === 'suspended') this.ac.resume().catch(() => {});
        const now = this.ac.currentTime;
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
            const osc  = this.ac.createOscillator();
            const gain = this.ac.createGain();
            osc.type  = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.001, now + i * 0.07);
            gain.gain.linearRampToValueAtTime(0.08,  now + i * 0.07 + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.22);
            osc.connect(gain);
            gain.connect(this.ac.destination);
            osc.start(now + i * 0.07);
            osc.stop(now + i * 0.07 + 0.22);
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new UnicornMakeupGame());
} else {
    new UnicornMakeupGame();
}
