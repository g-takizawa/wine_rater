class WineRater {
    constructor() {
        this.wines = [];
        this.minWines = 3;
        this.maxWines = 11;
        this.targetScore = 10.0;

        this.wineListEl = document.getElementById('wine-list');
        this.totalScoreEl = document.getElementById('total-score');
        this.statusMessageEl = document.getElementById('status-message');
        this.scoreSummaryEl = document.querySelector('.score-summary');
        this.addBtn = document.getElementById('add-wine-btn');

        this.init();
    }

    init() {
        // Initialize with minimum wines
        for (let i = 0; i < this.minWines; i++) {
            this.addWine(false); // false = no animation delay
        }

        this.addBtn.addEventListener('click', () => this.addWine());
        this.updateUI();
    }

    addWine(animate = true) {
        if (this.wines.length >= this.maxWines) return;

        const id = Date.now() + Math.random();
        const wine = {
            id,
            name: '',
            score: 0.0
        };

        this.wines.push(wine);
        this.renderWine(wine, animate);
        this.updateUI();
    }

    removeWine(id) {
        if (this.wines.length <= this.minWines) return;

        const index = this.wines.findIndex(w => w.id === id);
        if (index !== -1) {
            const el = document.getElementById(`wine-${id}`);
            el.style.opacity = '0';
            el.style.transform = 'translateY(10px)';

            setTimeout(() => {
                this.wines.splice(index, 1);
                el.remove();
                this.updateIndices();
                this.updateUI();
            }, 200);
        }
    }

    updateScore(id, change) {
        const wine = this.wines.find(w => w.id === id);
        if (wine) {
            const newScore = Math.max(0, wine.score + change);
            wine.score = newScore;

            const wineItem = document.getElementById(`wine-${id}`);
            const scoreDisplay = wineItem.querySelector('.score-display');
            scoreDisplay.textContent = newScore.toFixed(2);

            this.updateUI();
        }
    }

    updateName(id, name) {
        const wine = this.wines.find(w => w.id === id);
        if (wine) {
            wine.name = name;
            this.checkAndDistributeScores();
        }
    }

    checkAndDistributeScores() {
        const allNamesEntered = this.wines.every(w => w.name && w.name.trim() !== '');
        if (!allNamesEntered) return;

        if (this.calculateTotal() > 0) return;

        const count = this.wines.length;
        if (count === 0) return;

        const baseScore = Math.floor((this.targetScore / count) / 0.25) * 0.25;

        let currentTotal = baseScore * count;
        let remainder = this.targetScore - currentTotal;

        this.wines.forEach(wine => {
            let score = baseScore;
            if (remainder > 0.01) {
                score += 0.25;
                remainder -= 0.25;
            }
            wine.score = score;

            const wineItem = document.getElementById(`wine-${wine.id}`);
            if (wineItem) {
                const scoreDisplay = wineItem.querySelector('.score-display');
                if (scoreDisplay) scoreDisplay.textContent = score.toFixed(2);
            }
        });

        this.updateUI();
    }

    calculateTotal() {
        return this.wines.reduce((sum, wine) => sum + wine.score, 0);
    }

    updateIndices() {
        const indices = document.querySelectorAll('.wine-index');
        indices.forEach((el, i) => {
            el.textContent = i + 1;
        });
    }

    updateUI() {
        const total = this.calculateTotal();
        this.totalScoreEl.textContent = total.toFixed(2);

        // Update Add Button State
        this.addBtn.disabled = this.wines.length >= this.maxWines;

        // Update Remove Buttons State
        const removeBtns = document.querySelectorAll('.btn-remove');
        removeBtns.forEach(btn => {
            btn.disabled = this.wines.length <= this.minWines;
        });

        // Update Summary Status
        if (Math.abs(total - this.targetScore) < 0.01) {
            this.scoreSummaryEl.classList.add('valid');
            this.scoreSummaryEl.classList.remove('invalid');
            this.statusMessageEl.textContent = 'Perfect! Total score is 10.00';
            this.statusMessageEl.style.color = 'var(--success)';
        } else {
            this.scoreSummaryEl.classList.remove('valid');
            this.scoreSummaryEl.classList.add('invalid');
            const diff = (this.targetScore - total).toFixed(2);
            const action = diff > 0 ? 'Add' : 'Remove';
            this.statusMessageEl.textContent = `${action} ${Math.abs(diff)} points to reach 10.00`;
            this.statusMessageEl.style.color = 'var(--error)';
        }
    }

    renderWine(wine, animate) {
        const div = document.createElement('div');
        div.className = 'wine-item';
        div.id = `wine-${wine.id}`;
        if (!animate) div.style.animation = 'none';

        div.innerHTML = `
            <span class="wine-index">${this.wines.length}</span>
            <div class="input-group">
                <input type="text" placeholder="Wine Name" value="${wine.name}"
                    oninput="app.updateName(${wine.id}, this.value)">
            </div>
            <div class="score-control">
                <button class="btn-icon" onclick="app.updateScore(${wine.id}, -0.25)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
                <span class="score-display">${wine.score.toFixed(2)}</span>
                <button class="btn-icon" onclick="app.updateScore(${wine.id}, 0.25)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
            </div>
            <button class="btn-icon btn-remove" onclick="app.removeWine(${wine.id})"
                ${this.wines.length <= this.minWines ? 'disabled' : ''}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        `;

        this.wineListEl.appendChild(div);
    }
}

// Initialize App
const app = new WineRater();
