// Reusable Math Game Engine for Kids (Ages 4-6)
class MathGame {
    constructor(operation) {
        this.operation = operation;
        this.answer = 0;
        this.option1 = document.getElementById("option1");
        this.option2 = document.getElementById("option2");
        this.option3 = document.getElementById("option3");
        this.wrongAudio = document.getElementById("wrongAudio");
        this.correctAudio = document.getElementById("correctAudio");
        
        this.init();
    }

    init() {
        // Add click event listeners
        [this.option1, this.option2, this.option3].forEach(option => {
            option.addEventListener("click", () => this.checkAnswer(option));
            
            // Add visual feedback animations
            option.addEventListener("mousedown", () => {
                option.style.transform = "scale(0.95)";
            });
            option.addEventListener("mouseup", () => {
                option.style.transform = "scale(1)";
            });
        });

        // Generate first equation
        this.generateEquation();
    }

    generateEquation() {
        let num1, num2, result;
        
        // Generate appropriate numbers based on operation and age group (4-6 years)
        switch(this.operation) {
            case 'add':
                num1 = Math.floor(Math.random() * 10) + 1; // 1-10
                num2 = Math.floor(Math.random() * 10) + 1; // 1-10
                result = num1 + num2;
                break;
            case 'subtract':
                num1 = Math.floor(Math.random() * 10) + 5; // 5-14
                num2 = Math.floor(Math.random() * num1) + 1; // Ensure positive result
                result = num1 - num2;
                break;
            case 'multiply':
                num1 = Math.floor(Math.random() * 5) + 1; // 1-5
                num2 = Math.floor(Math.random() * 5) + 1; // 1-5
                result = num1 * num2;
                break;
            case 'divide':
                // Generate multiplication pairs for division
                num2 = Math.floor(Math.random() * 5) + 1; // 1-5
                result = Math.floor(Math.random() * 5) + 1; // 1-5
                num1 = num2 * result;
                break;
        }

        this.answer = result;
        
        // Update equation display
        document.getElementById('num1').innerHTML = num1;
        document.getElementById('num2').innerHTML = num2;
        
        // Generate answer options
        this.generateAnswerOptions();
    }

    generateAnswerOptions() {
        const options = [this.answer];
        const MIN_DUMMY_OPTIONS = 2;
        const RANGE_MULTIPLIER = 2;
        
        // Generate 2 different dummy answers
        while(options.length < MIN_DUMMY_OPTIONS + 1) {
            let dummy;
            const range = Math.max(5, this.answer);
            dummy = Math.floor(Math.random() * (range * RANGE_MULTIPLIER)) + 1;
            
            // Ensure dummy is different from answer and other dummies
            if (!options.includes(dummy) && dummy > 0) {
                options.push(dummy);
            }
        }
        
        // Shuffle options randomly
        const shuffled = [];
        while(options.length > 0) {
            const index = Math.floor(Math.random() * options.length);
            shuffled.push(options.splice(index, 1)[0]);
        }
        
        // Display options
        this.option1.innerHTML = shuffled[0];
        this.option2.innerHTML = shuffled[1];
        this.option3.innerHTML = shuffled[2];
    }

    checkAnswer(selectedOption) {
        const selected = parseInt(selectedOption.innerHTML);
        
        if (selected === this.answer) {
            // Correct answer
            this.animateCorrect(selectedOption);
            if (this.correctAudio) {
                this.correctAudio.play().catch(e => console.log('Audio play failed:', e));
            }
            
            // Generate new equation after animation
            setTimeout(() => {
                this.generateEquation();
            }, 600);
        } else {
            // Wrong answer
            this.animateWrong(selectedOption);
            if (this.wrongAudio) {
                this.wrongAudio.play().catch(e => console.log('Audio play failed:', e));
            }
        }
    }

    animateCorrect(option) {
        const originalBg = option.style.backgroundColor;
        option.style.backgroundColor = "#4CAF50";
        option.style.transform = "scale(1.1)";
        
        setTimeout(() => {
            option.style.backgroundColor = originalBg;
            option.style.transform = "scale(1)";
        }, 500);
    }

    animateWrong(option) {
        const originalBg = option.style.backgroundColor;
        let shakes = 0;
        const shakeInterval = setInterval(() => {
            option.style.transform = shakes % 2 === 0 ? "translateX(-10px)" : "translateX(10px)";
            shakes++;
            if (shakes >= 4) {
                clearInterval(shakeInterval);
                option.style.transform = "translateX(0)";
                option.style.backgroundColor = originalBg;
            }
        }, 100);
        
        option.style.backgroundColor = "#FF6B6B";
    }
}

// Initialize game based on page
function initGame() {
    // Try to get operation from body data attribute first
    const bodyElement = document.body;
    let operation = bodyElement.getAttribute('data-operation');
    
    // Fallback to path-based detection if no data attribute
    if (!operation) {
        const path = window.location.pathname;
        if (path.includes('add.html') || path.includes('index.html') || path === '/') {
            operation = 'add';
        } else if (path.includes('sub.html')) {
            operation = 'subtract';
        } else if (path.includes('mul.html')) {
            operation = 'multiply';
        } else if (path.includes('div.html')) {
            operation = 'divide';
        } else {
            operation = 'add'; // default fallback
        }
    }
    
    new MathGame(operation);
}

// Start game when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}
