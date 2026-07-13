const GAME_SETTINGS = {
    gridSize: 16,
    boardSize: 480,
    startLength: 3,
    startSpeed: 6.5,
    maxSpeed: 11,
    speedStep: 0.2,
    cellPadding: 3,
    bestScoreKey: 'snake-best-score'
};

const COLORS = {
    background: '#f7ffef',
    boardShadow: '#d5efc4',
    grid: 'rgba(129, 181, 108, 0.1)',
    snakeHead: '#2ea44f',
    snakeBody: '#65d17a',
    snakeTail: '#8ae39d',
    apple: '#ff5b6f',
    appleLeaf: '#48b263',
    appleStem: '#7b4b2a'
};

const DIRECTIONS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
};

class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.context = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('scoreValue');
        this.bestScoreElement = document.getElementById('bestScoreValue');
        this.finalScoreElement = document.getElementById('finalScoreValue');
        this.dialogBestScoreElement = document.getElementById('dialogBestScoreValue');
        this.overlay = document.getElementById('gameOverOverlay');
        this.playAgainButton = document.getElementById('playAgainButton');
        this.controlButtons = Array.from(document.querySelectorAll('[data-direction]'));

        this.cellSize = GAME_SETTINGS.boardSize / GAME_SETTINGS.gridSize;
        this.boardLimit = GAME_SETTINGS.gridSize - 1;
        this.audioContext = null;
        this.loopFrame = null;
        this.lastFrameTime = 0;
        this.moveAccumulator = 0;
        this.foodPulse = 0;
        this.popAnimation = null;
        this.bestScore = this.readBestScore();

        this.setupCanvas();
        this.attachEvents();
        this.reset();
        this.start();
    }

    setupCanvas() {
        this.canvas.width = GAME_SETTINGS.boardSize;
        this.canvas.height = GAME_SETTINGS.boardSize;
    }

    attachEvents() {
        document.addEventListener('keydown', (event) => this.handleKeydown(event));
        this.playAgainButton.addEventListener('click', () => this.restart());

        this.controlButtons.forEach((button) => {
            const turn = () => this.queueDirection(button.dataset.direction);
            button.addEventListener('click', turn);
            button.addEventListener('touchstart', (event) => {
                event.preventDefault();
                turn();
            }, { passive: false });
        });
    }

    reset() {
        this.score = 0;
        this.speed = GAME_SETTINGS.startSpeed;
        this.isGameOver = false;
        this.foodPulse = 0;
        this.popAnimation = null;
        this.moveAccumulator = 0;

        this.snake = this.createStartingSnake();
        this.direction = { ...DIRECTIONS.right };
        this.pendingDirection = { ...DIRECTIONS.right };
        this.food = this.createFood();

        this.updateScore();
        this.hideGameOver();
        this.draw();
    }

    createStartingSnake() {
        const center = Math.floor(GAME_SETTINGS.gridSize / 2);
        return Array.from({ length: GAME_SETTINGS.startLength }, (_, index) => ({
            x: center - index,
            y: center
        }));
    }

    start() {
        cancelAnimationFrame(this.loopFrame);
        this.lastFrameTime = performance.now();
        this.loopFrame = requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    restart() {
        this.reset();
        this.start();
    }

    gameLoop(timestamp) {
        const deltaTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;

        if (!this.isGameOver) {
            this.moveAccumulator += deltaTime;
            const stepDuration = 1000 / this.speed;

            while (this.moveAccumulator >= stepDuration && !this.isGameOver) {
                this.moveAccumulator -= stepDuration;
                this.update();
            }
        }

        this.updateAnimations(deltaTime);
        this.draw();
        this.loopFrame = requestAnimationFrame((nextTimestamp) => this.gameLoop(nextTimestamp));
    }

    update() {
        this.direction = { ...this.pendingDirection };

        const nextHead = {
            x: this.snake[0].x + this.direction.x,
            y: this.snake[0].y + this.direction.y
        };

        const willEatFood = this.positionsMatch(nextHead, this.food);
        const tail = this.snake[this.snake.length - 1];

        if (this.isWallCollision(nextHead) || this.isSelfCollision(nextHead, willEatFood ? null : tail)) {
            this.endGame();
            return;
        }

        this.snake.unshift(nextHead);

        if (willEatFood) {
            this.score += 1;
            this.speed = Math.min(this.speed + GAME_SETTINGS.speedStep, GAME_SETTINGS.maxSpeed);
            this.food = this.createFood();
            this.popAnimation = { age: 0, duration: 220, x: nextHead.x, y: nextHead.y };
            this.playEatSound();
            this.updateScore();
        } else {
            this.snake.pop();
        }
    }

    updateAnimations(deltaTime) {
        this.foodPulse += deltaTime * 0.008;

        if (this.popAnimation) {
            this.popAnimation.age += deltaTime;
            if (this.popAnimation.age >= this.popAnimation.duration) {
                this.popAnimation = null;
            }
        }
    }

    handleKeydown(event) {
        const keyMap = {
            ArrowUp: 'up',
            ArrowDown: 'down',
            ArrowLeft: 'left',
            ArrowRight: 'right'
        };

        const directionName = keyMap[event.key];
        if (!directionName) {
            return;
        }

        event.preventDefault();
        this.queueDirection(directionName);
    }

    queueDirection(directionName) {
        if (this.isGameOver || !DIRECTIONS[directionName]) {
            return;
        }

        const nextDirection = DIRECTIONS[directionName];
        const isReversing =
            nextDirection.x === -this.direction.x &&
            nextDirection.y === -this.direction.y;

        if (!isReversing) {
            this.pendingDirection = { ...nextDirection };
            this.warmAudio();
        }
    }

    isWallCollision(position) {
        return position.x < 0 || position.x > this.boardLimit || position.y < 0 || position.y > this.boardLimit;
    }

    isSelfCollision(position, ignoredTail) {
        return this.snake.some((segment, index) => {
            const isIgnoredTail = ignoredTail && index === this.snake.length - 1 && this.positionsMatch(segment, ignoredTail);
            return !isIgnoredTail && this.positionsMatch(segment, position);
        });
    }

    createFood() {
        const openCells = [];

        for (let y = 0; y < GAME_SETTINGS.gridSize; y += 1) {
            for (let x = 0; x < GAME_SETTINGS.gridSize; x += 1) {
                const occupied = this.snake.some((segment) => segment.x === x && segment.y === y);
                if (!occupied) {
                    openCells.push({ x, y });
                }
            }
        }

        return openCells[Math.floor(Math.random() * openCells.length)];
    }

    updateScore() {
        this.scoreElement.textContent = String(this.score);

        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem(GAME_SETTINGS.bestScoreKey, String(this.bestScore));
        }

        this.bestScoreElement.textContent = String(this.bestScore);
    }

    readBestScore() {
        const savedScore = Number.parseInt(localStorage.getItem(GAME_SETTINGS.bestScoreKey) || '0', 10);
        return Number.isFinite(savedScore) ? savedScore : 0;
    }

    endGame() {
        this.isGameOver = true;
        this.finalScoreElement.textContent = String(this.score);
        this.dialogBestScoreElement.textContent = String(this.bestScore);
        this.overlay.classList.remove('hidden');
    }

    hideGameOver() {
        this.overlay.classList.add('hidden');
    }

    positionsMatch(first, second) {
        return first.x === second.x && first.y === second.y;
    }

    draw() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBoard();
        this.drawGrid();
        this.drawFood();
        this.drawSnake();
        this.drawPopAnimation();
    }

    drawBoard() {
        this.context.fillStyle = COLORS.background;
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.context.fillStyle = COLORS.boardShadow;
        this.context.fillRect(0, this.canvas.height - 18, this.canvas.width, 18);
    }

    drawGrid() {
        this.context.strokeStyle = COLORS.grid;
        this.context.lineWidth = 1;

        for (let index = 0; index <= GAME_SETTINGS.gridSize; index += 1) {
            const position = index * this.cellSize;
            this.context.beginPath();
            this.context.moveTo(position, 0);
            this.context.lineTo(position, GAME_SETTINGS.boardSize);
            this.context.stroke();

            this.context.beginPath();
            this.context.moveTo(0, position);
            this.context.lineTo(GAME_SETTINGS.boardSize, position);
            this.context.stroke();
        }
    }

    drawSnake() {
        this.snake.forEach((segment, index) => {
            const x = segment.x * this.cellSize + GAME_SETTINGS.cellPadding;
            const y = segment.y * this.cellSize + GAME_SETTINGS.cellPadding;
            const size = this.cellSize - GAME_SETTINGS.cellPadding * 2;
            const radius = size * 0.34;

            if (index === 0) {
                this.context.fillStyle = COLORS.snakeHead;
            } else if (index === this.snake.length - 1) {
                this.context.fillStyle = COLORS.snakeTail;
            } else {
                this.context.fillStyle = COLORS.snakeBody;
            }

            this.drawRoundedRect(x, y, size, size, radius);
            this.context.fill();

            if (index === 0) {
                this.drawSnakeFace(x, y, size);
            }
        });
    }

    drawSnakeFace(x, y, size) {
        const eyeRadius = Math.max(2, size * 0.08);
        const eyeY = y + size * 0.35;
        const leftEyeX = x + size * 0.32;
        const rightEyeX = x + size * 0.68;

        this.context.fillStyle = '#ffffff';
        this.context.beginPath();
        this.context.arc(leftEyeX, eyeY, eyeRadius, 0, Math.PI * 2);
        this.context.arc(rightEyeX, eyeY, eyeRadius, 0, Math.PI * 2);
        this.context.fill();
    }

    drawFood() {
        const centerX = this.food.x * this.cellSize + this.cellSize / 2;
        const centerY = this.food.y * this.cellSize + this.cellSize / 2;
        const pulseScale = 1 + Math.sin(this.foodPulse) * 0.08;
        const appleRadius = this.cellSize * 0.24 * pulseScale;

        this.context.save();
        this.context.translate(centerX, centerY);

        this.context.fillStyle = COLORS.apple;
        this.context.beginPath();
        this.context.arc(-appleRadius * 0.45, 0, appleRadius, 0, Math.PI * 2);
        this.context.arc(appleRadius * 0.45, 0, appleRadius, 0, Math.PI * 2);
        this.context.arc(0, appleRadius * 0.2, appleRadius * 1.1, 0, Math.PI);
        this.context.fill();

        this.context.strokeStyle = COLORS.appleStem;
        this.context.lineWidth = 3;
        this.context.beginPath();
        this.context.moveTo(0, -appleRadius * 0.65);
        this.context.lineTo(1, -appleRadius * 1.35);
        this.context.stroke();

        this.context.fillStyle = COLORS.appleLeaf;
        this.context.beginPath();
        this.context.ellipse(appleRadius * 0.55, -appleRadius * 0.95, appleRadius * 0.45, appleRadius * 0.22, -0.6, 0, Math.PI * 2);
        this.context.fill();

        this.context.restore();
    }

    drawPopAnimation() {
        if (!this.popAnimation) {
            return;
        }

        const progress = this.popAnimation.age / this.popAnimation.duration;
        const centerX = this.popAnimation.x * this.cellSize + this.cellSize / 2;
        const centerY = this.popAnimation.y * this.cellSize + this.cellSize / 2;
        const radius = this.cellSize * (0.15 + progress * 0.65);

        this.context.save();
        this.context.globalAlpha = 1 - progress;
        this.context.strokeStyle = '#ffd15a';
        this.context.lineWidth = 4;
        this.context.beginPath();
        this.context.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.context.stroke();
        this.context.restore();
    }

    drawRoundedRect(x, y, width, height, radius) {
        this.context.beginPath();
        this.context.moveTo(x + radius, y);
        this.context.lineTo(x + width - radius, y);
        this.context.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.context.lineTo(x + width, y + height - radius);
        this.context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.context.lineTo(x + radius, y + height);
        this.context.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.context.lineTo(x, y + radius);
        this.context.quadraticCurveTo(x, y, x + radius, y);
        this.context.closePath();
    }

    warmAudio() {
        if (!this.audioContext) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.audioContext = AudioContextClass ? new AudioContextClass() : null;
        }

        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(() => {});
        }
    }

    playEatSound() {
        this.warmAudio();

        if (!this.audioContext) {
            return;
        }

        const now = this.audioContext.currentTime;
        const notes = [523.25, 659.25, 783.99];

        notes.forEach((frequency, index) => {
            const oscillator = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(frequency, now);

            gain.gain.setValueAtTime(0.0001, now);
            gain.gain.linearRampToValueAtTime(0.12, now + index * 0.03 + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.03 + 0.18);

            oscillator.connect(gain);
            gain.connect(this.audioContext.destination);
            oscillator.start(now + index * 0.03);
            oscillator.stop(now + index * 0.03 + 0.18);
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new SnakeGame());
} else {
    new SnakeGame();
}
