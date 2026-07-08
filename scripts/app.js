(() => {
    const STORAGE_KEY = 'math4kids-adventure-state';
    const defaultState = {
        stars: 0,
        badges: [],
        completed: {}
    };

    function readState() {
        try {
            const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
            return parsed ? { ...defaultState, ...parsed } : { ...defaultState };
        } catch (error) {
            return { ...defaultState };
        }
    }

    function writeState(state) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        return state;
    }

    function getState() {
        return readState();
    }

    function updateRewardDisplays(root = document) {
        const state = getState();
        root.querySelectorAll('[data-stars]').forEach((node) => {
            node.textContent = state.stars;
        });
        root.querySelectorAll('[data-badges]').forEach((node) => {
            node.textContent = state.badges.length;
        });
        root.querySelectorAll('[data-completed]').forEach((node) => {
            node.textContent = Object.keys(state.completed).length;
        });
    }

    function completeActivity({ worldId, activityId, score, maxScore, badge }) {
        const state = getState();
        const key = `${worldId}:${activityId}`;
        const previous = state.completed[key];
        const firstWin = !previous;
        const perfect = score === maxScore;
        const starsEarned = firstWin ? Math.max(2, score) + (perfect ? 1 : 0) : 1;

        state.stars += starsEarned;
        state.completed[key] = {
            score: Math.max(previous?.score || 0, score),
            maxScore,
            perfect: previous?.perfect || perfect
        };

        if (badge && firstWin && !state.badges.includes(badge)) {
            state.badges.push(badge);
        }

        writeState(state);
        updateRewardDisplays();
        return { starsEarned, totalStars: state.stars, badgeUnlocked: badge && firstWin ? badge : null };
    }

    function playSound(type) {
        const audioId = type === 'success' ? 'correctAudio' : 'wrongAudio';
        const audio = document.getElementById(audioId);
        if (!audio) return;
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }

    function celebrate({ emoji = '🎉', title = 'Great job!', detail = '' } = {}) {
        const burst = document.createElement('div');
        burst.className = 'celebration-burst';
        burst.style.position = 'fixed';
        burst.style.inset = '0';
        burst.style.pointerEvents = 'none';
        burst.style.zIndex = '20';
        burst.innerHTML = `
            <div style="position:absolute;inset:0;display:grid;place-items:center;">
                <div style="background:rgba(255,255,255,0.92);padding:18px 22px;border-radius:28px;box-shadow:0 18px 40px rgba(84,100,180,0.18);text-align:center;max-width:320px;">
                    <div style="font-size:3rem;">${emoji}</div>
                    <div style="font-family:'Luckiest Guy',cursive;font-size:1.8rem;color:#2f3056;">${title}</div>
                    <div style="margin-top:8px;color:#6b6d9c;font-weight:600;">${detail}</div>
                </div>
            </div>
        `;

        for (let index = 0; index < 26; index += 1) {
            const confetti = document.createElement('span');
            confetti.textContent = ['⭐', '✨', '🎈', '🌈'][index % 4];
            confetti.style.position = 'absolute';
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.top = '-10px';
            confetti.style.fontSize = `${18 + Math.random() * 18}px`;
            confetti.style.animation = `confettiFall ${1.2 + Math.random() * 1.2}s ease-in forwards`;
            burst.appendChild(confetti);
        }

        if (!document.getElementById('celebration-style')) {
            const style = document.createElement('style');
            style.id = 'celebration-style';
            style.textContent = '@keyframes confettiFall {0%{transform:translateY(0) rotate(0deg);opacity:1;}100%{transform:translateY(110vh) rotate(260deg);opacity:0;}}';
            document.head.appendChild(style);
        }

        document.body.appendChild(burst);
        window.setTimeout(() => burst.remove(), 1700);
    }

    function resetState() {
        writeState({ ...defaultState });
        updateRewardDisplays();
    }

    window.AdventureApp = {
        getState,
        updateRewardDisplays,
        completeActivity,
        celebrate,
        playSound,
        resetState
    };
})();
