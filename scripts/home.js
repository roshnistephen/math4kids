// Home Page Interactions and Animations

document.addEventListener('DOMContentLoaded', function() {
    // Add entrance animations to cards
    animateCards();
    
    // Add hover sound effects (optional)
    addCardInteractions();
    
    // Create floating emojis
    createFloatingEmojis();
});

function animateCards() {
    const cards = document.querySelectorAll('.game-card');
    
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(50px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 200 * (index + 1));
    });
}

function addCardInteractions() {
    const cards = document.querySelectorAll('.game-card');
    
    cards.forEach(card => {
        // Add pulse animation on hover
        card.addEventListener('mouseenter', function() {
            const icon = this.querySelector('.card-icon');
            icon.style.animation = 'none';
            setTimeout(() => {
                icon.style.animation = 'wiggle 0.5s ease';
            }, 10);
        });
        
        // Add click ripple effect
        card.addEventListener('click', function(e) {
            if (e.target.classList.contains('play-btn') || e.target.closest('.play-btn')) {
                return; // Let the button handle its own click
            }
            
            const btn = this.querySelector('.play-btn');
            if (btn) {
                btn.click();
            }
        });
    });
}

function createFloatingEmojis() {
    const emojis = ['⭐', '🌟', '✨', '🎈', '🎨', '🎵', '🎪'];
    const container = document.querySelector('.stars-background');
    
    // Create 15 random floating emojis
    for (let i = 0; i < 15; i++) {
        setTimeout(() => {
            const emoji = document.createElement('div');
            emoji.className = 'floating-emoji';
            emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            emoji.style.cssText = `
                position: absolute;
                font-size: ${Math.random() * 20 + 15}px;
                left: ${Math.random() * 100}%';
                top: ${Math.random() * 100}%;
                opacity: ${Math.random() * 0.5 + 0.3};
                animation: float ${Math.random() * 4 + 4}s infinite ease-in-out;
                animation-delay: ${Math.random() * 2}s;
                pointer-events: none;
            `;
            container.appendChild(emoji);
        }, i * 200);
    }
}

// Add keyboard navigation support
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const focusedElement = document.activeElement;
        if (focusedElement.classList.contains('play-btn')) {
            focusedElement.click();
        }
    }
});
