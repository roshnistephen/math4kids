// Character Adventure Game Logic

class CharacterAdventure {
    constructor() {
        this.starsCollected = 0;
        this.currentLevel = 1;
        this.totalLevels = 5;
        this.starsNeededPerLevel = 5;
        this.characterPosition = { x: 50, y: 50 }; // Percentage based
        this.gameStarted = false;
        
        this.characters = [
            'images/characters/image_ComfyUI_00001__extracted.png',
            'images/characters/image_ComfyUI_00004__extracted.png',
            'images/characters/image_ComfyUI_00005__extracted.png',
            'images/characters/image_ComfyUI_00006__extracted.png',
            'images/characters/image_ComfyUI_00007__extracted.png'
        ];
        
        this.challenges = [
            { type: 'math', question: 'What is 2 + 3?', answer: 5, options: [4, 5, 6] },
            { type: 'math', question: 'What is 5 - 2?', answer: 3, options: [2, 3, 4] },
            { type: 'counting', question: 'How many apples? 🍎🍎🍎', answer: 3, options: [2, 3, 4] },
            { type: 'math', question: 'What is 3 + 4?', answer: 7, options: [6, 7, 8] },
            { type: 'counting', question: 'Count the stars: ⭐⭐⭐⭐', answer: 4, options: [3, 4, 5] }
        ];
        
        this.wrongAudio = document.getElementById('wrongAudio');
        this.correctAudio = document.getElementById('correctAudio');
        
        this.setupKeyboardControls();
    }
    
    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            if (!this.gameStarted) return;
            
            switch(e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    this.moveCharacter('up');
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    this.moveCharacter('down');
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    this.moveCharacter('left');
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    this.moveCharacter('right');
                    break;
            }
        });
    }
    
    startLevel() {
        this.gameStarted = true;
        document.getElementById('controlsPanel').style.display = 'flex';
        this.updateStarsNeeded();
        this.spawnCollectibles();
        this.updateLevelInfo();
    }
    
    spawnCollectibles() {
        const container = document.getElementById('collectibles');
        container.innerHTML = '';
        
        for (let i = 0; i < this.starsNeededPerLevel; i++) {
            const star = document.createElement('div');
            star.className = 'collectible';
            star.textContent = '⭐';
            star.dataset.id = i;
            
            // Random position avoiding edges
            const x = Math.random() * 80 + 10;
            const y = Math.random() * 60 + 10;
            star.style.left = x + '%';
            star.style.top = y + '%';
            star.style.animationDelay = (i * 0.2) + 's';
            
            star.addEventListener('click', () => this.collectStar(star));
            container.appendChild(star);
        }
    }
    
    collectStar(starElement) {
        if (starElement.classList.contains('collected')) return;
        
        starElement.classList.add('collected');
        this.starsCollected++;
        document.getElementById('starsCollected').textContent = this.starsCollected;
        
        if (this.correctAudio) {
            this.correctAudio.play().catch(e => console.log('Audio play failed:', e));
        }
        
        // Check if level complete
        const remainingStars = document.querySelectorAll('.collectible:not(.collected)').length;
        if (remainingStars === 0) {
            setTimeout(() => this.showChallenge(), 1000);
        }
    }
    
    showChallenge() {
        const challenge = this.challenges[Math.floor(Math.random() * this.challenges.length)];
        const panel = document.getElementById('challengePanel');
        
        document.getElementById('challengeTitle').textContent = 'Bonus Challenge!';
        document.getElementById('challengeContent').innerHTML = `
            <p style="font-size: 1.5em; margin: 20px 0;">${challenge.question}</p>
        `;
        
        const buttonsContainer = document.getElementById('challengeButtons');
        buttonsContainer.innerHTML = '';
        
        // Shuffle options
        const shuffled = [...challenge.options].sort(() => Math.random() - 0.5);
        
        shuffled.forEach(option => {
            const btn = document.createElement('button');
            btn.className = 'challenge-btn';
            btn.textContent = option;
            btn.onclick = () => this.checkChallengeAnswer(option, challenge.answer, btn);
            buttonsContainer.appendChild(btn);
        });
        
        panel.style.display = 'block';
    }
    
    checkChallengeAnswer(selected, correct, button) {
        if (selected === correct) {
            button.classList.add('correct');
            this.starsCollected += 2; // Bonus stars
            document.getElementById('starsCollected').textContent = this.starsCollected;
            
            if (this.correctAudio) {
                this.correctAudio.play().catch(e => console.log('Audio play failed:', e));
            }
            
            setTimeout(() => {
                this.nextLevel();
            }, 1500);
        } else {
            button.classList.add('wrong');
            
            if (this.wrongAudio) {
                this.wrongAudio.play().catch(e => console.log('Audio play failed:', e));
            }
            
            setTimeout(() => {
                button.classList.remove('wrong');
            }, 600);
        }
    }
    
    nextLevel() {
        this.currentLevel++;
        document.getElementById('currentLevel').textContent = this.currentLevel;
        
        if (this.currentLevel > this.totalLevels) {
            this.showGameComplete();
            return;
        }
        
        // Hide challenge panel
        document.getElementById('challengePanel').style.display = 'none';
        
        // Change character
        const characterIndex = (this.currentLevel - 1) % this.characters.length;
        document.getElementById('adventureCharacter').src = this.characters[characterIndex];
        
        // Spawn new collectibles
        this.spawnCollectibles();
        this.updateLevelInfo();
    }
    
    updateStarsNeeded() {
        document.getElementById('starsNeeded').textContent = this.starsNeededPerLevel;
    }
    
    updateLevelInfo() {
        document.getElementById('levelInfo').textContent = `${this.currentLevel} of ${this.totalLevels}`;
    }
    
    showGameComplete() {
        const message = `🎉 Amazing! You completed all levels!\n\nTotal Stars Collected: ${this.starsCollected} ⭐\n\nYou're a super learner!`;
        
        setTimeout(() => {
            if (confirm(message + '\n\nDo you want to play again?')) {
                location.reload();
            } else {
                location.href = 'home.html';
            }
        }, 500);
    }
}

// Global game instance
let adventure;

// Global functions for button controls
function startAdventure() {
    document.getElementById('challengePanel').style.display = 'none';
    adventure = new CharacterAdventure();
    adventure.startLevel();
}

function moveCharacter(direction) {
    if (!adventure || !adventure.gameStarted) return;
    
    const container = document.getElementById('characterContainer');
    const currentLeft = parseFloat(container.style.left || '50%');
    const currentBottom = parseFloat(container.style.bottom || '50px');
    
    const step = 10; // percentage or pixels
    
    switch(direction) {
        case 'up':
            container.style.bottom = Math.min(currentBottom + 30, 400) + 'px';
            container.classList.add('jumping');
            setTimeout(() => container.classList.remove('jumping'), 600);
            break;
        case 'down':
            container.style.bottom = Math.max(currentBottom - 30, 20) + 'px';
            break;
        case 'left':
            container.style.left = Math.max(currentLeft - step, 5) + '%';
            container.classList.add('moving-left');
            break;
        case 'right':
            container.style.left = Math.min(currentLeft + step, 90) + '%';
            container.classList.remove('moving-left');
            break;
    }
    
    // Check for collision with collectibles
    checkCollisions();
}

function checkCollisions() {
    const character = document.getElementById('characterContainer');
    const charRect = character.getBoundingClientRect();
    
    const collectibles = document.querySelectorAll('.collectible:not(.collected)');
    collectibles.forEach(star => {
        const starRect = star.getBoundingClientRect();
        
        // Simple collision detection
        if (!(charRect.right < starRect.left || 
              charRect.left > starRect.right || 
              charRect.bottom < starRect.top || 
              charRect.top > starRect.bottom)) {
            adventure.collectStar(star);
        }
    });
}

// Initialize character position on load
document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('characterContainer');
    if (container) {
        container.style.left = '50%';
        container.style.bottom = '50px';
    }
});
