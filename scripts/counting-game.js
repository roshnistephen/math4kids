// Counting Game Logic

class CountingGame {
    constructor() {
        this.score = 0;
        this.currentQuestion = 1;
        this.totalQuestions = 10;
        this.correctAnswer = 0;
        this.level = 'easy';
        this.maxCount = 5;
        
        this.objects = ['🍎', '🍊', '🍌', '🍇', '🍓', '🍒', '🍑', '🥝', '🍍', '🥭', 
                       '⚽', '🏀', '🎾', '🏐', '🎈', '🎁', '🧸', '🚗', '✈️', '🚀',
                       '⭐', '🌟', '💎', '🎨', '🎭', '🎪', '🎠', '🎡', '🎢', '🎰'];
        
        this.characters = [
            '../images/characters/image_ComfyUI_00004__extracted.png',
            '../images/characters/image_ComfyUI_00005__extracted.png',
            '../images/characters/image_ComfyUI_00006__extracted.png',
            '../images/characters/image_ComfyUI_00007__extracted.png'
        ];
        
        this.wrongAudio = document.getElementById('wrongAudio');
        this.correctAudio = document.getElementById('correctAudio');
        
        this.init();
    }
    
    init() {
        this.parseURLParameters();
        this.updateLevelBadge();
        this.generateQuestion();
    }
    
    parseURLParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        this.level = urlParams.get('level') || 'easy';
        
        const levelRanges = {
            'easy': 5,
            'medium': 10,
            'hard': 20
        };
        
        this.maxCount = levelRanges[this.level];
    }
    
    updateLevelBadge() {
        const badge = document.getElementById('levelBadge');
        const levelColors = {
            'easy': 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)',
            'medium': 'linear-gradient(135deg, #FF9800 0%, #FFC107 100%)',
            'hard': 'linear-gradient(135deg, #F44336 0%, #E91E63 100%)'
        };
        
        badge.textContent = this.level.charAt(0).toUpperCase() + this.level.slice(1);
        badge.style.background = levelColors[this.level];
    }
    
    generateQuestion() {
        // Randomly select an object emoji
        const selectedObject = this.objects[Math.floor(Math.random() * this.objects.length)];
        
        // Generate a random count based on level
        this.correctAnswer = Math.floor(Math.random() * this.maxCount) + 1;
        
        // Update question text
        const objectNames = {
            '🍎': 'apples', '🍊': 'oranges', '🍌': 'bananas', '🍇': 'grapes',
            '🍓': 'strawberries', '🍒': 'cherries', '⚽': 'balls', '🏀': 'basketballs',
            '🎈': 'balloons', '🎁': 'gifts', '🧸': 'teddy bears', '🚗': 'cars',
            '⭐': 'stars', '🌟': 'stars', '💎': 'diamonds', '🎨': 'palettes'
        };
        
        const objectName = objectNames[selectedObject] || 'objects';
        document.getElementById('questionText').textContent = `How many ${objectName} do you see?`;
        
        // Display objects
        this.displayObjects(selectedObject);
        
        // Generate answer options
        this.generateAnswerOptions();
        
        // Update character
        this.updateCharacter();
        this.updateSpeechBubble(`Count carefully!`);
    }
    
    displayObjects(emoji) {
        const container = document.getElementById('objectsContainer');
        container.innerHTML = '';
        
        for (let i = 0; i < this.correctAnswer; i++) {
            const obj = document.createElement('div');
            obj.className = 'count-object';
            obj.textContent = emoji;
            obj.style.animationDelay = (i * 0.1) + 's';
            
            // Add click sound/animation
            obj.addEventListener('click', function() {
                this.style.transform = 'scale(1.3) rotate(15deg)';
                setTimeout(() => {
                    this.style.transform = 'scale(1)';
                }, 200);
            });
            
            container.appendChild(obj);
        }
    }
    
    generateAnswerOptions() {
        const options = [this.correctAnswer];
        
        // Generate 3 different options
        while (options.length < 4) {
            const dummy = Math.floor(Math.random() * this.maxCount) + 1;
            if (!options.includes(dummy)) {
                options.push(dummy);
            }
        }
        
        // Shuffle options
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }
        
        // Update buttons
        for (let i = 0; i < Math.min(4, options.length); i++) {
            const btn = document.getElementById(`btn${i + 1}`);
            if (btn) {
                btn.textContent = options[i];
                btn.classList.remove('correct', 'wrong');
                btn.disabled = false;
                btn.style.display = 'block';
            }
        }
    }
    
    updateCharacter() {
        const characterImg = document.getElementById('guideCharacter');
        const randomIndex = Math.floor(Math.random() * this.characters.length);
        characterImg.src = this.characters[randomIndex];
    }
    
    updateSpeechBubble(message) {
        const bubble = document.getElementById('speechBubble');
        bubble.textContent = message;
    }
    
    updateScore(points) {
        this.score += points;
        document.getElementById('score').textContent = this.score;
    }
    
    updateProgress() {
        this.currentQuestion++;
        document.getElementById('questionNum').textContent = this.currentQuestion;
        
        const progressPercent = ((this.currentQuestion - 1) / this.totalQuestions) * 100;
        document.getElementById('progressFill').style.width = progressPercent + '%';
        
        if (this.currentQuestion > this.totalQuestions) {
            setTimeout(() => this.showGameComplete(), 1000);
        }
    }
    
    showGameComplete() {
        const message = `Great job! You scored ${this.score} points! 🎉\n\nDo you want to play again?`;
        
        if (confirm(message)) {
            location.reload();
        } else {
            location.href = '../counting-menu.html';
        }
    }
}

// Global game instance
let countingGame;

// Initialize game
document.addEventListener('DOMContentLoaded', function() {
    countingGame = new CountingGame();
});

// Global check answer function
function checkCountingAnswer(selectedNumber) {
    const isCorrect = selectedNumber === countingGame.correctAnswer;
    
    // Find and highlight the clicked button
    for (let i = 1; i <= 4; i++) {
        const btn = document.getElementById(`btn${i}`);
        if (btn && parseInt(btn.textContent) === selectedNumber) {
            if (isCorrect) {
                btn.classList.add('correct');
                countingGame.updateScore(10);
                countingGame.updateSpeechBubble('Perfect! 🎉');
                
                if (countingGame.correctAudio) {
                    countingGame.correctAudio.play().catch(e => console.log('Audio play failed:', e));
                }
                
                // Disable all buttons
                for (let j = 1; j <= 4; j++) {
                    const b = document.getElementById(`btn${j}`);
                    if (b) b.disabled = true;
                }
                
                setTimeout(() => {
                    countingGame.updateProgress();
                    countingGame.generateQuestion();
                }, 1500);
                
            } else {
                btn.classList.add('wrong');
                countingGame.updateSpeechBubble('Try again! 💪');
                
                if (countingGame.wrongAudio) {
                    countingGame.wrongAudio.play().catch(e => console.log('Audio play failed:', e));
                }
                
                setTimeout(() => {
                    btn.classList.remove('wrong');
                }, 600);
            }
            break;
        }
    }
}
