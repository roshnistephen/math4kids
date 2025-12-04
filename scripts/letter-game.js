// Letter Matching Game Logic

class LetterGame {
    constructor() {
        this.score = 0;
        this.currentLetter = 1;
        this.totalLetters = 10;
        this.correctLetter = 'A';
        this.level = 'uppercase';
        
        this.uppercaseLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        this.lowercaseLetters = 'abcdefghijklmnopqrstuvwxyz'.split('');
        this.usedLetters = [];
        
        this.characters = [
            '../images/characters/image_ComfyUI_00009__extracted.png',
            '../images/characters/image_ComfyUI_00011__extracted.png',
            '../images/characters/image_ComfyUI_00013__extracted.png',
            '../images/characters/image_ComfyUI_00014__extracted.png'
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
        this.level = urlParams.get('level') || 'uppercase';
    }
    
    updateLevelBadge() {
        const badge = document.getElementById('levelBadge');
        const levelNames = {
            'uppercase': 'Uppercase (ABC)',
            'lowercase': 'Lowercase (abc)',
            'mixed': 'Mixed (Aa)'
        };
        
        badge.textContent = levelNames[this.level] || 'Uppercase';
    }
    
    generateQuestion() {
        const letters = this.level === 'lowercase' ? this.lowercaseLetters : 
                       this.level === 'uppercase' ? this.uppercaseLetters :
                       [...this.uppercaseLetters, ...this.lowercaseLetters];
        
        // Get available letters (not used yet)
        const availableLetters = letters.filter(l => !this.usedLetters.includes(l));
        
        // Reset if all used
        if (availableLetters.length === 0) {
            this.usedLetters = [];
            availableLetters.push(...letters);
        }
        
        // Pick random target letter
        this.correctLetter = availableLetters[Math.floor(Math.random() * availableLetters.length)];
        this.usedLetters.push(this.correctLetter);
        
        // Display target letter
        document.getElementById('targetLetter').textContent = this.correctLetter;
        
        // Generate options
        this.generateOptions();
        
        // Update character
        this.updateCharacter();
        this.updateSpeechBubble(`Find the letter ${this.correctLetter}!`);
    }
    
    generateOptions() {
        const letters = this.level === 'lowercase' ? this.lowercaseLetters : 
                       this.level === 'uppercase' ? this.uppercaseLetters :
                       [...this.uppercaseLetters, ...this.lowercaseLetters];
        
        const options = [this.correctLetter];
        
        // Generate 5 different options
        while (options.length < 6) {
            const randomLetter = letters[Math.floor(Math.random() * letters.length)];
            if (!options.includes(randomLetter)) {
                options.push(randomLetter);
            }
        }
        
        // Shuffle options
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }
        
        // Display options
        const container = document.getElementById('letterOptions');
        container.innerHTML = '';
        
        options.forEach((letter, index) => {
            const btn = document.createElement('button');
            btn.className = 'letter-btn';
            btn.textContent = letter;
            btn.style.animationDelay = (index * 0.1) + 's';
            btn.onclick = () => this.checkAnswer(letter, btn);
            container.appendChild(btn);
        });
    }
    
    updateCharacter() {
        const characterImg = document.querySelector('.guide-character');
        const randomIndex = Math.floor(Math.random() * this.characters.length);
        characterImg.src = this.characters[randomIndex];
    }
    
    updateSpeechBubble(message) {
        const bubble = document.getElementById('speechBubble');
        bubble.textContent = message;
    }
    
    checkAnswer(selectedLetter, button) {
        const isCorrect = selectedLetter === this.correctLetter;
        
        // Disable all buttons temporarily
        const allButtons = document.querySelectorAll('.letter-btn');
        allButtons.forEach(btn => btn.disabled = true);
        
        if (isCorrect) {
            button.classList.add('correct');
            this.score += 10;
            document.getElementById('score').textContent = this.score;
            this.updateSpeechBubble('Perfect! 🎉');
            
            if (this.correctAudio) {
                this.correctAudio.play().catch(e => console.log('Audio play failed:', e));
            }
            
            setTimeout(() => {
                this.updateProgress();
                this.generateQuestion();
            }, 1500);
            
        } else {
            button.classList.add('wrong');
            this.updateSpeechBubble('Try again! 💪');
            
            if (this.wrongAudio) {
                this.wrongAudio.play().catch(e => console.log('Audio play failed:', e));
            }
            
            setTimeout(() => {
                button.classList.remove('wrong');
                allButtons.forEach(btn => btn.disabled = false);
            }, 600);
        }
    }
    
    updateProgress() {
        this.currentLetter++;
        document.getElementById('letterNum').textContent = this.currentLetter;
        
        const progressPercent = ((this.currentLetter - 1) / this.totalLetters) * 100;
        document.getElementById('progressFill').style.width = progressPercent + '%';
        
        if (this.currentLetter > this.totalLetters) {
            setTimeout(() => this.showGameComplete(), 1000);
        }
    }
    
    showGameComplete() {
        const message = `Awesome! You scored ${this.score} points! 🎉\n\nYou know your letters!\n\nDo you want to play again?`;
        
        if (confirm(message)) {
            location.reload();
        } else {
            location.href = '../spelling-menu.html';
        }
    }
}

// Initialize game
document.addEventListener('DOMContentLoaded', function() {
    new LetterGame();
});
