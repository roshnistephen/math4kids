class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game settings
        this.gridSize = 20;
        this.tileCount = this.canvas.width / this.gridSize;
        
        // Snake
        this.snake = [{ x: 10, y: 10 }];
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        
        // Food
        this.food = this.generateFood();
        
        // Game state
        this.score = 0;
        this.gameRunning = false;
        this.gamePaused = false;
        this.gameSpeed = 120; // milliseconds - starts very slow
        this.minGameSpeed = 80; // fastest speed allowed
        this.speedIncrement = 0.5; // small increment per food eaten
        
        // Colors
        this.colors = {
            snake: '#4CAF50',
            food: '#FF6B6B',
            grid: '#e0e0e0'
        };
        
        this.init();
    }
    
    init() {
        // Event listeners
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        
        this.draw();
    }
    
    handleKeyPress(e) {
        if (!this.gameRunning) return;
        
        const key = e.key;
        
        // Prevent default arrow key behavior
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
            e.preventDefault();
        }
        
        // Update next direction based on arrow keys
        switch(key) {
            case 'ArrowUp':
                if (this.direction.y === 0) {
                    this.nextDirection = { x: 0, y: -1 };
                }
                break;
            case 'ArrowDown':
                if (this.direction.y === 0) {
                    this.nextDirection = { x: 0, y: 1 };
                }
                break;
            case 'ArrowLeft':
                if (this.direction.x === 0) {
                    this.nextDirection = { x: -1, y: 0 };
                }
                break;
            case 'ArrowRight':
                if (this.direction.x === 0) {
                    this.nextDirection = { x: 1, y: 0 };
                }
                break;
        }
    }
    
    start() {
        if (this.gameRunning) return;
        
        this.gameRunning = true;
        this.gamePaused = false;
        this.updateButtonStates();
        this.gameLoop();
    }
    
    togglePause() {
        if (!this.gameRunning) return;
        
        this.gamePaused = !this.gamePaused;
        this.updateButtonStates();
        
        if (!this.gamePaused) {
            this.gameLoop();
        }
    }
    
    updateButtonStates() {
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        
        startBtn.disabled = this.gameRunning;
        pauseBtn.disabled = !this.gameRunning;
    }
    
    gameLoop() {
        if (!this.gameRunning || this.gamePaused) return;
        
        setTimeout(() => {
            this.update();
            this.draw();
            this.gameLoop();
        }, this.gameSpeed);
    }
    
    update() {
        // Update direction
        this.direction = this.nextDirection;
        
        // Calculate new head position
        const head = this.snake[0];
        const newHead = {
            x: head.x + this.direction.x,
            y: head.y + this.direction.y
        };
        
        // Check collision with walls
        if (this.checkWallCollision(newHead)) {
            this.endGame();
            return;
        }
        
        // Check collision with self
        if (this.checkSelfCollision(newHead)) {
            this.endGame();
            return;
        }
        
        // Add new head
        this.snake.unshift(newHead);
        
        // Check if food eaten
        if (newHead.x === this.food.x && newHead.y === this.food.y) {
            this.score += 10;
            this.updateScore();
            this.food = this.generateFood();
            this.increaseSpeed();
        } else {
            // Remove tail if no food eaten
            this.snake.pop();
        }
    }
    
    checkWallCollision(head) {
        return head.x < 0 || head.x >= this.tileCount || 
               head.y < 0 || head.y >= this.tileCount;
    }
    
    checkSelfCollision(head) {
        return this.snake.some(segment => 
            segment.x === head.x && segment.y === head.y
        );
    }
    
    generateFood() {
        let food;
        let validPosition = false;
        
        while (!validPosition) {
            food = {
                x: Math.floor(Math.random() * this.tileCount),
                y: Math.floor(Math.random() * this.tileCount)
            };
            
            // Check if food is not on snake
            validPosition = !this.snake.some(segment => 
                segment.x === food.x && segment.y === food.y
            );
        }
        
        return food;
    }
    
    endGame() {
        this.gameRunning = false;
        this.updateButtonStates();
        alert(`Game Over! Final Score: ${this.score}`);
    }
    
    increaseSpeed() {
        if (this.gameSpeed > this.minGameSpeed) {
            this.gameSpeed -= this.speedIncrement;
        }
    }
    
    updateScore() {
        document.getElementById('score').innerText = this.score;
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.drawGrid();
        
        // Draw snake
        this.drawSnake();
        
        // Draw food
        this.drawFood();
    }
    
    drawGrid() {
        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 0.5;
        
        for (let i = 0; i <= this.tileCount; i++) {
            const pos = i * this.gridSize;
            
            // Vertical lines
            this.ctx.beginPath();
            this.ctx.moveTo(pos, 0);
            this.ctx.lineTo(pos, this.canvas.height);
            this.ctx.stroke();
            
            // Horizontal lines
            this.ctx.beginPath();
            this.ctx.moveTo(0, pos);
            this.ctx.lineTo(this.canvas.width, pos);
            this.ctx.stroke();
        }
    }
    
    drawSnake() {
        this.snake.forEach((segment, index) => {
            const x = segment.x * this.gridSize;
            const y = segment.y * this.gridSize;
            
            // Head is darker, body is lighter
            if (index === 0) {
                this.ctx.fillStyle = '#2E7D32';
            } else {
                this.ctx.fillStyle = this.colors.snake;
            }
            
            // Draw with rounded corners
            this.roundRect(
                x + 2,
                y + 2,
                this.gridSize - 4,
                this.gridSize - 4,
                4
            );
            this.ctx.fill();
        });
    }
    
    drawFood() {
        const x = this.food.x * this.gridSize;
        const y = this.food.y * this.gridSize;
        
        this.ctx.fillStyle = '#FF6B6B';
        this.ctx.beginPath();
        this.ctx.arc(x + this.gridSize / 2, y + this.gridSize / 2, 6, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    roundRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
    }
}

// Initialize game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new SnakeGame();
    });
} else {
    new SnakeGame();
}
