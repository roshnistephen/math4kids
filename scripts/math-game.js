// Enhanced Math Game with Levels and Character Animations

class EnhancedMathGame {
    constructor() {
        this.score = 0;
        this.questionsAnswered = 0;
        this.totalQuestions = 10;
        this.currentAnswer = 0;
        this.level = 'easy';
        this.operation = 'add';
        this.characters = [
            '../images/characters/image_ComfyUI_00001__extracted.png',
            '../images/characters/image_ComfyUI_00004__extracted.png',
            '../images/characters/image_ComfyUI_00005__extracted.png',
            '../images/characters/image_ComfyUI_00006__extracted.png',
            '../images/characters/image_ComfyUI_00007__extracted.png'
        ];
        this.currentCharacterIndex = 0;
        
        this.wrongAudio = document.getElementById('wrongAudio');
        this.correctAudio = document.getElementById('correctAudio');
        
        this.init();
    }
    
    init() {
        this.parseURLParameters();
        this.updateLevelBadge();
        this.generateQuestion();
        this.updateCharacter();
        this.showSpeechBubble("Let's solve this!");
    }
    
    parseURLParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        this.operation = urlParams.get('op') || 'add';
        this.level = urlParams.get('level') || 'easy';
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
        let num1, num2, result;
        const ranges = {
            'easy': { min: 1, max: 10 },
            'medium': { min: 10, max: 20 },
            'hard': { min: 20, max: 50 }
        };
        
        const range = ranges[this.level];
        
        switch(this.operation) {
            case 'add':
                num1 = this.randomInRange(range.min, range.max);
                num2 = this.randomInRange(range.min, range.max);
                result = num1 + num2;
                document.getElementById('operator').textContent = '+';
                break;
                
            case 'sub':
                num1 = this.randomInRange(range.min + 5, range.max);
                num2 = this.randomInRange(range.min, Math.min(num1, range.max));
                result = num1 - num2;
                document.getElementById('operator').textContent = '−';
                break;
                
            case 'mul':
                const mulRange = this.level === 'easy' ? { min: 1, max: 5 } :
                                this.level === 'medium' ? { min: 2, max: 10 } :
                                { min: 5, max: 12 };
                num1 = this.randomInRange(mulRange.min, mulRange.max);
                num2 = this.randomInRange(mulRange.min, mulRange.max);
                result = num1 * num2;
                document.getElementById('operator').textContent = '×';
                break;
                
            case 'div':
                const divRange = this.level === 'easy' ? { min: 1, max: 5 } :
                                this.level === 'medium' ? { min: 2, max: 10 } :
                                { min: 5, max: 12 };
                num2 = this.randomInRange(divRange.min, divRange.max);
                result = this.randomInRange(divRange.min, divRange.max);
                num1 = num2 * result;
                document.getElementById('operator').textContent = '÷';
                break;
        }
        
        this.currentAnswer = result;
        
        document.getElementById('num1').textContent = num1;
        document.getElementById('num2').textContent = num2;
        
        this.generateOptions(result);
    }
    
    randomInRange(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    generateOptions(correctAnswer) {
        const options = [correctAnswer];
        const range = Math.max(10, Math.floor(correctAnswer * 0.5));
        
        while(options.length < 3) {
            let dummy = correctAnswer + this.randomInRange(-range, range);
            if (dummy > 0 && !options.includes(dummy)) {
                options.push(dummy);
            }
        }
        
        // Shuffle options
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }
        
        document.getElementById('option1').querySelector('.option-number').textContent = options[0];
        document.getElementById('option2').querySelector('.option-number').textContent = options[1];
        document.getElementById('option3').querySelector('.option-number').textContent = options[2];
        
        // Remove any previous classes
        ['option1', 'option2', 'option3'].forEach(id => {
            const btn = document.getElementById(id);
            btn.classList.remove('correct', 'wrong');
            btn.disabled = false;
        });
    }
    
    updateCharacter() {
        const characterImg = document.getElementById('gameCharacter');
        this.currentCharacterIndex = Math.floor(Math.random() * this.characters.length);
        characterImg.src = this.characters[this.currentCharacterIndex];
    }
    
    showSpeechBubble(message) {
        const bubble = document.getElementById('speechBubble');
        bubble.textContent = message;
        bubble.classList.add('show');
        
        setTimeout(() => {
            bubble.classList.remove('show');
        }, 2000);
    }
    
    updateScore(points) {
        this.score += points;
        document.getElementById('score').textContent = this.score;
        
        // Update stars based on score
        const starsDisplay = document.getElementById('stars');
        if (this.score >= 80) {
            starsDisplay.textContent = '⭐⭐⭐';
        } else if (this.score >= 50) {
            starsDisplay.textContent = '⭐⭐';
        } else if (this.score >= 20) {
            starsDisplay.textContent = '⭐';
        } else {
            starsDisplay.textContent = '';
        }
    }
    
    updateProgress() {
        this.questionsAnswered++;
        document.getElementById('questionsAnswered').textContent = this.questionsAnswered;
        
        const progressPercent = (this.questionsAnswered / this.totalQuestions) * 100;
        document.getElementById('progressFill').style.width = progressPercent + '%';
        
        if (this.questionsAnswered >= this.totalQuestions) {
            setTimeout(() => this.showGameComplete(), 1000);
        }
    }
    
    showGameComplete() {
        const stars = this.score >= 80 ? 3 : this.score >= 50 ? 2 : this.score >= 20 ? 1 : 0;
        const starsText = '⭐'.repeat(stars);
        
        const message = stars >= 2 ? 
            `Amazing! You scored ${this.score}! ${starsText}` :
            `Good job! You scored ${this.score}! ${starsText}`;
        
        if (confirm(message + '\n\nDo you want to play again?')) {
            location.reload();
        } else {
            location.href = '../math-menu.html';
        }
    }
}

// Global game instance
let game;

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', function() {
    game = new EnhancedMathGame();
});

// Global checkAnswer function for button onclick
function checkAnswer(button) {
    const selectedValue = parseInt(button.querySelector('.option-number').textContent);
    const isCorrect = selectedValue === game.currentAnswer;
    
    // Disable all buttons temporarily
    ['option1', 'option2', 'option3'].forEach(id => {
        document.getElementById(id).disabled = true;
    });
    
    if (isCorrect) {
        button.classList.add('correct');
        game.updateScore(10);
        game.showSpeechBubble('Great job! 🎉');
        
        if (game.correctAudio) {
            game.correctAudio.play().catch(e => console.log('Audio play failed:', e));
        }
        
        setTimeout(() => {
            game.updateProgress();
            game.generateQuestion();
            game.updateCharacter();
        }, 1000);
        
    } else {
        button.classList.add('wrong');
        game.showSpeechBubble('Try again! 💪');
        
        if (game.wrongAudio) {
            game.wrongAudio.play().catch(e => console.log('Audio play failed:', e));
        }
        
        // Re-enable buttons after animation
        setTimeout(() => {
            ['option1', 'option2', 'option3'].forEach(id => {
                const btn = document.getElementById(id);
                btn.classList.remove('wrong');
                btn.disabled = false;
            });
        }, 600);
    }
}
