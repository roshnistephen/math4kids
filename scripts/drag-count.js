// Drag and Count Game Logic

class DragCountGame {
    constructor() {
        this.score = 0;
        this.targetNumber = 5;
        this.currentCount = 0;
        this.correctAudio = document.getElementById('correctAudio');
        
        this.objects = ['🍎', '🍊', '🍌', '🍇', '⚽', '🎈', '⭐', '🌟', '🎁', '🧸'];
        this.currentObject = this.objects[0];
        
        this.init();
    }
    
    init() {
        this.generateNewRound();
        this.setupDragAndDrop();
    }
    
    generateNewRound() {
        // Generate random target number (3-10)
        this.targetNumber = Math.floor(Math.random() * 8) + 3;
        document.getElementById('targetNumber').textContent = this.targetNumber;
        
        // Select random object
        this.currentObject = this.objects[Math.floor(Math.random() * this.objects.length)];
        
        // Generate pool of objects (target + 5 extra)
        const poolSize = this.targetNumber + 5;
        const pool = document.getElementById('objectsPool');
        pool.innerHTML = '';
        
        for (let i = 0; i < poolSize; i++) {
            const obj = document.createElement('div');
            obj.className = 'draggable-object';
            obj.textContent = this.currentObject;
            obj.draggable = true;
            obj.dataset.id = i;
            obj.style.animationDelay = (i * 0.1) + 's';
            pool.appendChild(obj);
        }
        
        // Reset drop zone
        document.getElementById('droppedItems').innerHTML = '';
        this.currentCount = 0;
        this.updateCount();
    }
    
    setupDragAndDrop() {
        const dropZone = document.getElementById('dropZone');
        const objectsPool = document.getElementById('objectsPool');
        
        // Drag start on pool objects
        objectsPool.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('draggable-object') && 
                !e.target.classList.contains('in-zone')) {
                e.target.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', e.target.innerHTML);
                e.dataTransfer.setData('objectId', e.target.dataset.id);
            }
        });
        
        objectsPool.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
        });
        
        // Drop zone events
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            dropZone.classList.add('drag-over');
        });
        
        dropZone.addEventListener('dragleave', (e) => {
            if (e.target === dropZone) {
                dropZone.classList.remove('drag-over');
            }
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            
            const objectId = e.dataTransfer.getData('objectId');
            const sourceElement = document.querySelector(`[data-id="${objectId}"]`);
            
            if (sourceElement && !sourceElement.classList.contains('in-zone')) {
                this.addObjectToZone(sourceElement);
            }
        });
        
        // Mobile touch support (simplified)
        this.addTouchSupport();
    }
    
    addTouchSupport() {
        const pool = document.getElementById('objectsPool');
        
        pool.addEventListener('click', (e) => {
            if (e.target.classList.contains('draggable-object') && 
                !e.target.classList.contains('in-zone')) {
                this.addObjectToZone(e.target);
            }
        });
    }
    
    addObjectToZone(sourceElement) {
        // Mark as used
        sourceElement.classList.add('in-zone');
        sourceElement.style.opacity = '0.3';
        sourceElement.draggable = false;
        
        // Create clone in drop zone
        const droppedItems = document.getElementById('droppedItems');
        const clone = document.createElement('div');
        clone.className = 'draggable-object';
        clone.textContent = this.currentObject;
        clone.dataset.sourceId = sourceElement.dataset.id;
        clone.style.animation = 'bounceIn 0.5s ease';
        
        // Allow removing from zone
        clone.addEventListener('click', () => {
            this.removeObjectFromZone(clone, sourceElement);
        });
        
        droppedItems.appendChild(clone);
        this.currentCount++;
        this.updateCount();
    }
    
    removeObjectFromZone(cloneElement, sourceElement) {
        cloneElement.remove();
        sourceElement.classList.remove('in-zone');
        sourceElement.style.opacity = '1';
        sourceElement.draggable = true;
        this.currentCount--;
        this.updateCount();
    }
    
    updateCount() {
        document.getElementById('currentCount').textContent = this.currentCount;
    }
}

// Global game instance
let dragGame;

// Initialize game
document.addEventListener('DOMContentLoaded', function() {
    dragGame = new DragCountGame();
});

// Global functions
function checkAnswer() {
    if (dragGame.currentCount === dragGame.targetNumber) {
        // Correct!
        dragGame.score += 10;
        document.getElementById('score').textContent = dragGame.score;
        
        if (dragGame.correctAudio) {
            dragGame.correctAudio.play().catch(e => console.log('Audio play failed:', e));
        }
        
        // Show success message
        const dropZone = document.getElementById('dropZone');
        dropZone.style.background = 'rgba(76, 175, 80, 0.3)';
        dropZone.style.borderColor = '#4CAF50';
        
        setTimeout(() => {
            dropZone.style.background = 'rgba(255, 255, 255, 0.9)';
            dropZone.style.borderColor = '#E91E63';
            dragGame.generateNewRound();
            dragGame.setupDragAndDrop();
        }, 1500);
    } else {
        // Wrong - give feedback
        const dropZone = document.getElementById('dropZone');
        dropZone.style.background = 'rgba(244, 67, 54, 0.2)';
        dropZone.style.borderColor = '#F44336';
        
        const countDisplay = document.getElementById('currentCount');
        countDisplay.style.color = '#F44336';
        countDisplay.style.fontSize = '2.5em';
        
        setTimeout(() => {
            dropZone.style.background = 'rgba(255, 255, 255, 0.9)';
            dropZone.style.borderColor = '#E91E63';
            countDisplay.style.color = '#333';
            countDisplay.style.fontSize = '1em';
        }, 1000);
    }
}

function resetRound() {
    dragGame.generateNewRound();
    dragGame.setupDragAndDrop();
}
