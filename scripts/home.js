document.addEventListener('DOMContentLoaded', () => {
    AdventureApp.updateRewardDisplays();

    document.querySelectorAll('.world-card, .feature-card').forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(18px)';
        window.setTimeout(() => {
            card.style.transition = 'opacity 0.45s ease, transform 0.45s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 90 * index);
    });
});
