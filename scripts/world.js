document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const worldId = params.get('world') || 'animal';
    const requestedActivityId = params.get('activity');
    const world = window.WORLD_DATA[worldId] || window.WORLD_DATA.animal;

    const state = {
        world,
        activity: null,
        index: 0,
        score: 0,
        awaitingNext: false,
        openCards: [],
        matchedPairs: 0,
        collectorSelection: []
    };

    const elements = {
        worldEyebrow: document.getElementById('worldEyebrow'),
        worldTitle: document.getElementById('worldTitle'),
        worldSubtitle: document.getElementById('worldSubtitle'),
        activityHeadline: document.getElementById('activityHeadline'),
        mascotMessage: document.getElementById('mascotMessage'),
        mascotAvatar: document.getElementById('mascotAvatar'),
        activityRail: document.getElementById('activityRail'),
        activityKicker: document.getElementById('activityKicker'),
        activityTitle: document.getElementById('activityTitle'),
        progressCount: document.getElementById('progressCount'),
        promptHelper: document.getElementById('promptHelper'),
        promptArt: document.getElementById('promptArt'),
        promptText: document.getElementById('promptText'),
        optionsGrid: document.getElementById('optionsGrid'),
        collectorBoard: document.getElementById('collectorBoard'),
        memoryBoard: document.getElementById('memoryBoard'),
        feedbackBanner: document.getElementById('feedbackBanner'),
        primaryAction: document.getElementById('primaryAction'),
        secondaryAction: document.getElementById('secondaryAction')
    };

    document.body.dataset.theme = world.id;
    document.title = `${world.title} - Math4Kids`;
    elements.worldEyebrow.textContent = world.eyebrow;
    elements.worldTitle.textContent = world.title;
    elements.worldSubtitle.textContent = world.subtitle;
    elements.activityHeadline.textContent = world.title;
    elements.mascotMessage.textContent = world.message;
    elements.mascotAvatar.textContent = world.mascot;
    AdventureApp.updateRewardDisplays();

    const initialActivity = world.activities.find((item) => item.id === requestedActivityId) || world.activities[0];
    renderActivityRail(initialActivity.id);
    selectActivity(initialActivity.id);

    elements.primaryAction.addEventListener('click', () => {
        if (elements.primaryAction.dataset.mode === 'next') {
            goToNextQuestion();
        } else if (elements.primaryAction.dataset.mode === 'restart') {
            selectActivity(state.activity.id);
        } else if (elements.primaryAction.dataset.mode === 'continue') {
            const currentIndex = world.activities.findIndex((item) => item.id === state.activity.id);
            const nextActivity = world.activities[currentIndex + 1] || world.activities[0];
            selectActivity(nextActivity.id);
        }
    });

    elements.secondaryAction.addEventListener('click', () => {
        if (elements.secondaryAction.dataset.mode === 'retry-activity') {
            selectActivity(state.activity.id);
        } else {
            location.href = 'home.html';
        }
    });

    function renderActivityRail(activeId) {
        elements.activityRail.innerHTML = '';
        world.activities.forEach((activity) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `activity-pill${activity.id === activeId ? ' is-active' : ''}`;
            button.textContent = activity.navLabel;
            button.addEventListener('click', () => selectActivity(activity.id));
            elements.activityRail.appendChild(button);
        });
    }

    function selectActivity(activityId) {
        const activity = world.activities.find((item) => item.id === activityId) || world.activities[0];
        state.activity = activity;
        state.index = 0;
        state.score = 0;
        state.awaitingNext = false;
        state.openCards = [];
        state.matchedPairs = 0;
        state.collectorSelection = [];
        renderActivityRail(activity.id);
        renderActivity();
    }

    function renderActivity() {
        elements.feedbackBanner.className = 'feedback-banner';
        elements.feedbackBanner.textContent = 'Pick a card to start.';
        elements.activityKicker.textContent = state.activity.navLabel;
        elements.activityTitle.textContent = state.activity.title;
        elements.activityHeadline.textContent = state.activity.title;
        elements.promptHelper.textContent = state.activity.helper;
        elements.primaryAction.hidden = true;
        elements.secondaryAction.hidden = false;
        elements.secondaryAction.textContent = 'Back home';
        elements.secondaryAction.dataset.mode = 'home';

        if (state.activity.type === 'memory') {
            renderMemoryGame();
            return;
        }

        renderQuestion();
    }

    function renderQuestion() {
        const question = state.activity.questions[state.index];
        elements.optionsGrid.hidden = false;
        elements.collectorBoard.hidden = true;
        elements.memoryBoard.hidden = true;
        elements.optionsGrid.innerHTML = '';
        elements.collectorBoard.innerHTML = '';
        elements.promptArt.textContent = question.art;
        elements.promptText.textContent = question.prompt;
        elements.progressCount.textContent = `${state.index + 1} / ${state.activity.questions.length}`;
        elements.primaryAction.hidden = true;

        if (state.activity.type === 'collector') {
            renderCollector(question);
            return;
        }

        question.options.forEach((option) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = state.activity.type === 'balloon' ? 'balloon-card' : 'option-card';
            button.innerHTML = `
                <span class="option-card__icon">${option.icon || '🎯'}</span>
                <span class="option-card__label">${option.label}</span>
                ${option.note ? `<span class="option-card__note">${option.note}</span>` : ''}
            `;
            button.addEventListener('click', () => handleChoice(button, option.value, question));
            elements.optionsGrid.appendChild(button);
        });
    }

    function handleChoice(button, value, question) {
        if (state.awaitingNext) return;
        state.awaitingNext = true;

        const allButtons = [...elements.optionsGrid.querySelectorAll('button')];
        const isCorrect = value === question.answer;

        if (isCorrect) {
            state.score += 1;
            button.classList.add('is-correct');
            elements.feedbackBanner.className = 'feedback-banner is-success';
            elements.feedbackBanner.textContent = question.success;
            elements.mascotMessage.textContent = 'Yay! You got it right.';
            AdventureApp.playSound('success');
            AdventureApp.celebrate({ emoji: world.mascot, title: 'Great job!', detail: question.success });
        } else {
            button.classList.add('is-wrong');
            const correctButton = allButtons.find((item, index) => question.options[index].value === question.answer);
            if (correctButton) correctButton.classList.add('is-correct');
            elements.feedbackBanner.className = 'feedback-banner is-warning';
            elements.feedbackBanner.textContent = `Nice try! ${question.success}`;
            elements.mascotMessage.textContent = 'Let’s try the next one together.';
            AdventureApp.playSound('wrong');
        }

        allButtons.forEach((item) => {
            item.disabled = true;
        });

        elements.primaryAction.hidden = false;
        elements.primaryAction.dataset.mode = 'next';
        elements.primaryAction.textContent = state.index === state.activity.questions.length - 1 ? 'See my reward' : 'Next round';
    }

    function renderCollector(question) {
        elements.optionsGrid.hidden = true;
        elements.collectorBoard.hidden = false;
        elements.collectorBoard.className = 'collector-board';
        elements.promptArt.textContent = question.art;
        elements.promptText.textContent = question.prompt;
        elements.progressCount.textContent = `${state.index + 1} / ${state.activity.questions.length}`;
        state.collectorSelection = [];

        const status = document.createElement('div');
        status.className = 'collector-status';
        status.innerHTML = `<strong>Target: ${question.target}</strong><span id="collectorCount">In basket: 0</span>`;

        const zones = document.createElement('div');
        zones.className = 'collector-zones';
        zones.innerHTML = `
            <div class="collector-zone">
                <h4>Tap to add</h4>
                <div class="collector-pool" id="collectorPool"></div>
            </div>
            <div class="collector-zone">
                <h4>Basket</h4>
                <div class="collector-basket" id="collectorBasket"></div>
            </div>
        `;

        const actions = document.createElement('div');
        actions.className = 'collector-actions';
        actions.innerHTML = `
            <button class="collector-action collector-action--check" type="button" id="collectorCheck">Check basket</button>
            <button class="collector-action collector-action--reset" type="button" id="collectorReset">Reset basket</button>
        `;

        elements.collectorBoard.innerHTML = '';
        elements.collectorBoard.append(status, zones, actions);

        const pool = document.getElementById('collectorPool');
        const basket = document.getElementById('collectorBasket');
        const countNode = document.getElementById('collectorCount');

        const updateCollectorCount = () => {
            countNode.textContent = `In basket: ${state.collectorSelection.length}`;
        };

        const renderCollectorPool = () => {
            pool.innerHTML = '';
            basket.innerHTML = '';

            for (let index = 0; index < question.pool; index += 1) {
                if (!state.collectorSelection.includes(index)) {
                    const item = document.createElement('button');
                    item.type = 'button';
                    item.className = 'collector-item';
                    item.textContent = question.item;
                    item.addEventListener('click', () => {
                        state.collectorSelection.push(index);
                        renderCollectorPool();
                    });
                    pool.appendChild(item);
                }
            }

            state.collectorSelection.forEach((value, order) => {
                const item = document.createElement('button');
                item.type = 'button';
                item.className = 'collector-item';
                item.textContent = question.item;
                item.addEventListener('click', () => {
                    state.collectorSelection.splice(order, 1);
                    renderCollectorPool();
                });
                basket.appendChild(item);
            });

            updateCollectorCount();
        };

        renderCollectorPool();

        document.getElementById('collectorReset').addEventListener('click', () => {
            state.collectorSelection = [];
            renderCollectorPool();
        });

        document.getElementById('collectorCheck').addEventListener('click', () => {
            if (state.awaitingNext) return;
            const isCorrect = state.collectorSelection.length === question.target;
            state.awaitingNext = true;
            if (isCorrect) {
                state.score += 1;
                elements.collectorBoard.classList.add('is-correct');
                elements.feedbackBanner.className = 'feedback-banner is-success';
                elements.feedbackBanner.textContent = question.success;
                AdventureApp.playSound('success');
                AdventureApp.celebrate({ emoji: '🧺', title: 'Basket complete!', detail: question.success });
            } else {
                elements.collectorBoard.classList.add('is-wrong');
                elements.feedbackBanner.className = 'feedback-banner is-warning';
                elements.feedbackBanner.textContent = `Try again next round. We needed ${question.target} items.`;
                AdventureApp.playSound('wrong');
            }
            elements.primaryAction.hidden = false;
            elements.primaryAction.dataset.mode = 'next';
            elements.primaryAction.textContent = state.index === state.activity.questions.length - 1 ? 'See my reward' : 'Next round';
        });
    }

    function renderMemoryGame() {
        elements.optionsGrid.hidden = true;
        elements.collectorBoard.hidden = true;
        elements.memoryBoard.hidden = false;
        elements.promptArt.textContent = '🃏';
        elements.promptText.textContent = 'Find all the matching pairs.';
        elements.progressCount.textContent = `${state.matchedPairs} / ${state.activity.pairs.length}`;
        elements.primaryAction.hidden = true;
        elements.secondaryAction.hidden = false;
        elements.secondaryAction.textContent = 'Back home';
        elements.secondaryAction.dataset.mode = 'home';
        elements.feedbackBanner.className = 'feedback-banner';
        elements.feedbackBanner.textContent = 'Flip two cards to begin.';

        const deck = [...state.activity.pairs, ...state.activity.pairs]
            .map((symbol, index) => ({ id: `${symbol}-${index}`, symbol, open: false, matched: false }))
            .sort(() => Math.random() - 0.5);

        state.memoryDeck = deck;
        drawMemoryDeck();
    }

    function drawMemoryDeck() {
        const grid = document.createElement('div');
        grid.className = 'memory-grid';
        state.memoryDeck.forEach((card) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `memory-card${card.open ? ' is-open' : ''}${card.matched ? ' is-matched' : ''}`;
            button.textContent = card.open || card.matched ? card.symbol : '❓';
            button.disabled = card.matched;
            button.addEventListener('click', () => flipMemoryCard(card.id));
            grid.appendChild(button);
        });
        elements.memoryBoard.innerHTML = '';
        elements.memoryBoard.appendChild(grid);
    }

    function flipMemoryCard(cardId) {
        if (state.openCards.length === 2) return;
        const card = state.memoryDeck.find((item) => item.id === cardId);
        if (!card || card.open || card.matched) return;

        card.open = true;
        state.openCards.push(card);
        drawMemoryDeck();

        if (state.openCards.length === 2) {
            const [first, second] = state.openCards;
            if (first.symbol === second.symbol) {
                first.matched = true;
                second.matched = true;
                state.openCards = [];
                state.matchedPairs += 1;
                state.score = state.matchedPairs;
                elements.progressCount.textContent = `${state.matchedPairs} / ${state.activity.pairs.length}`;
                elements.feedbackBanner.className = 'feedback-banner is-success';
                elements.feedbackBanner.textContent = 'You found a pair!';
                AdventureApp.playSound('success');
                if (state.matchedPairs === state.activity.pairs.length) {
                    AdventureApp.celebrate({ emoji: '🧠', title: 'Memory master!', detail: 'You found every pair.' });
                    finishActivity();
                }
            } else {
                elements.feedbackBanner.className = 'feedback-banner is-warning';
                elements.feedbackBanner.textContent = 'Not a match yet. Try again!';
                AdventureApp.playSound('wrong');
                window.setTimeout(() => {
                    first.open = false;
                    second.open = false;
                    state.openCards = [];
                    drawMemoryDeck();
                }, 700);
            }
        }
    }

    function goToNextQuestion() {
        if (state.index === state.activity.questions.length - 1) {
            finishActivity();
            return;
        }
        state.index += 1;
        state.awaitingNext = false;
        renderQuestion();
    }

    function finishActivity() {
        const maxScore = state.activity.type === 'memory' ? state.activity.pairs.length : state.activity.questions.length;
        const reward = AdventureApp.completeActivity({
            worldId: world.id,
            activityId: state.activity.id,
            score: state.score,
            maxScore,
            badge: state.activity.badge || world.badge
        });

        AdventureApp.updateRewardDisplays();
        elements.optionsGrid.hidden = false;
        elements.collectorBoard.hidden = true;
        elements.memoryBoard.hidden = true;
        elements.optionsGrid.innerHTML = `
            <div class="result-panel" style="grid-column:1 / -1;">
                <div class="prompt-art">${world.mascot}</div>
                <h4 class="result-title">You finished ${state.activity.navLabel}!</h4>
                <p class="feedback-banner is-success">You answered ${state.score} out of ${maxScore}. You earned ${reward.starsEarned} stars.</p>
                <p class="prompt-helper">${reward.badgeUnlocked ? `New badge unlocked: ${reward.badgeUnlocked}.` : 'Keep exploring for more rewards.'}</p>
            </div>
        `;
        elements.promptArt.textContent = world.mascot;
        elements.promptText.textContent = 'Adventure complete!';
        elements.progressCount.textContent = `${maxScore} / ${maxScore}`;
        elements.feedbackBanner.className = 'feedback-banner is-success';
        elements.feedbackBanner.textContent = `Amazing work! Total stars: ${reward.totalStars}.`;
        elements.primaryAction.hidden = false;
        elements.primaryAction.dataset.mode = 'continue';
        elements.primaryAction.textContent = 'Play another mini game';
        elements.secondaryAction.hidden = false;
        elements.secondaryAction.textContent = 'Play again';
        elements.secondaryAction.dataset.mode = 'retry-activity';
        elements.mascotMessage.textContent = 'You did it! Let’s try another game.';
    }
});
