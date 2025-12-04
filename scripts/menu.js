// Menu Page Script

function startGame(operation, level) {
    // Store the level in session storage
    sessionStorage.setItem('gameLevel', level);
    
    // Navigate to the appropriate game page
    const gamePages = {
        'add': 'games/math-game.html?op=add&level=',
        'sub': 'games/math-game.html?op=sub&level=',
        'mul': 'games/math-game.html?op=mul&level=',
        'div': 'games/math-game.html?op=div&level='
    };
    
    if (gamePages[operation]) {
        window.location.href = gamePages[operation] + level;
    }
}

// Add entrance animations
document.addEventListener('DOMContentLoaded', function() {
    const levelCards = document.querySelectorAll('.level-card');
    
    levelCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateX(-50px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateX(0)';
        }, 200 * (index + 1));
    });
});
