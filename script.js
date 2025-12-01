class WineRater {
    constructor(setId) {
        this.setId = setId;
        this.wines = [];
        this.minWines = 10;
        this.maxWines = 20;
        this.targetScore = 10.0;

        this.isManualScore = false;

        this.wineListEl = document.getElementById(`wine-list-${setId}`);
        this.totalScoreEl = document.getElementById(`total-score-${setId}`);
        this.statusMessageEl = document.getElementById(`status-message-${setId}`);
        this.scoreSummaryEl = this.wineListEl.closest('.glass-container').querySelector('.score-summary');
        this.addBtn = document.getElementById(`add-wine-btn-${setId}`);
        this.copyBtn = document.getElementById(`copy-btn-${setId}`);
        this.helpBtn = document.getElementById('help-btn');

        this.init();
    }

    init() {
        // Initialize with minimum wines
        for (let i = 0; i < this.minWines; i++) {
            this.addWine(false); // false = no animation delay
        }

        this.addBtn.addEventListener('click', () => this.addWine());
        this.copyBtn.addEventListener('click', () => this.showCopyDialog());
        if (this.helpBtn) {
            this.helpBtn.addEventListener('click', () => this.showHelp());
        }
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
        if (this.wines.length <= this.minWines) {
            return;
        }

        const index = this.wines.findIndex(w => w.id === id);
        if (index !== -1) {
            const el = document.getElementById(`wine-${this.setId}-${id}`);
            el.style.opacity = '0';
            el.style.transform = 'translateY(10px)';

            setTimeout(() => {
                // Re-calculate index to ensure we remove the correct item
                // even if other items were removed during the animation
                const currentIndex = this.wines.findIndex(w => w.id === id);
                if (currentIndex !== -1) {
                    this.wines.splice(currentIndex, 1);
                    el.remove();
                    this.updateIndices();
                    this.checkAndDistributeScores();
                    this.updateUI();
                }
            }, 200);
        }
    }

    updateScore(id, change) {
        const wine = this.wines.find(w => w.id === id);
        if (wine) {
            this.isManualScore = true; // Mark as manually modified
            const newScore = Math.max(0, wine.score + change);
            wine.score = newScore;

            const wineItem = document.getElementById(`wine-${this.setId}-${id}`);
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
        // If scores have been manually adjusted, do not auto-distribute
        if (this.isManualScore) return;

        // Find wines that have a name entered
        const activeWines = this.wines.filter(w => w.name && w.name.trim() !== '');
        const count = activeWines.length;

        if (count === 0) {
            // Reset all to 0 if no names
            this.wines.forEach(w => {
                w.score = 0.0;
                this.updateWineScoreDisplay(w);
            });
            this.updateUI();
            return;
        }

        // Distribute 10 points among active wines
        const baseScore = Math.floor((this.targetScore / count) / 0.25) * 0.25;
        let currentTotal = baseScore * count;
        let remainder = this.targetScore - currentTotal;

        // Reset all scores first
        this.wines.forEach(w => w.score = 0.0);

        // Assign scores to active wines
        activeWines.forEach(wine => {
            let score = baseScore;
            if (remainder > 0.01) {
                score += 0.25;
                remainder -= 0.25;
            }
            wine.score = score;
        });

        // Update displays
        this.wines.forEach(w => this.updateWineScoreDisplay(w));
        this.updateUI();
    }

    updateWineScoreDisplay(wine) {
        const wineItem = document.getElementById(`wine-${this.setId}-${wine.id}`);
        if (wineItem) {
            const scoreDisplay = wineItem.querySelector('.score-display');
            if (scoreDisplay) scoreDisplay.textContent = wine.score.toFixed(2);
        }
    }

    calculateTotal() {
        return this.wines.reduce((sum, wine) => sum + wine.score, 0);
    }

    updateIndices() {
        const indices = this.wineListEl.querySelectorAll('.wine-index');
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
        const removeBtns = this.wineListEl.querySelectorAll('.btn-remove');
        removeBtns.forEach(btn => {
            btn.disabled = this.wines.length <= this.minWines;
        });

        // Update Summary Status
        if (Math.abs(total - this.targetScore) < 0.01) {
            this.scoreSummaryEl.classList.add('valid');
            this.scoreSummaryEl.classList.remove('invalid');
            this.statusMessageEl.textContent = '完璧！合計が10.00点です';
            this.statusMessageEl.style.color = 'var(--success)';
        } else {
            this.scoreSummaryEl.classList.remove('valid');
            this.scoreSummaryEl.classList.add('invalid');
            const diff = (this.targetScore - total).toFixed(2);
            const action = diff > 0 ? 'あと' : '';
            this.statusMessageEl.textContent = `${action}${Math.abs(diff)}点で10.00点になります`;
            this.statusMessageEl.style.color = 'var(--error)';
        }
    }

    renderWine(wine, animate) {
        const div = document.createElement('div');
        div.className = 'wine-item';
        div.id = `wine-${this.setId}-${wine.id}`;
        if (!animate) div.style.animation = 'none';

        div.innerHTML = `
            <span class="wine-index">${this.wines.length}</span>
            <div class="input-group">
                <input type="text"
                    class="wine-input"
                    data-wine-id="${wine.id}"
                    placeholder="ワイン名"
                    value="${wine.name}">
            </div>
            <div class="score-control">
                <button class="btn-icon" data-action="decrease" data-wine-id="${wine.id}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
                <span class="score-display">${wine.score.toFixed(2)}</span>
                <button class="btn-icon" data-action="increase" data-wine-id="${wine.id}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                </button>
            </div>
            <button class="btn-icon btn-remove" data-action="remove" data-wine-id="${wine.id}"
                ${this.wines.length <= this.minWines ? 'disabled' : ''}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        `;

        this.wineListEl.appendChild(div);

        // Add input listener
        const input = div.querySelector('.wine-input');
        input.addEventListener('input', (e) => {
            this.updateName(wine.id, e.target.value);
        });

        // Add Enter key listener to move to next input
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                const allInputs = Array.from(this.wineListEl.querySelectorAll('.wine-input'));
                const currentIndex = allInputs.indexOf(input);
                if (currentIndex < allInputs.length - 1) {
                    const nextInput = allInputs[currentIndex + 1];
                    setTimeout(() => {
                        nextInput.focus();
                        nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
                    }, 0);
                }
            }
        });

        // Add button listeners
        const decreaseBtn = div.querySelector('[data-action="decrease"]');
        const increaseBtn = div.querySelector('[data-action="increase"]');
        const removeBtn = div.querySelector('[data-action="remove"]');

        decreaseBtn.addEventListener('click', () => this.updateScore(wine.id, -0.25));
        increaseBtn.addEventListener('click', () => this.updateScore(wine.id, 0.25));
        removeBtn.addEventListener('click', () => this.removeWine(wine.id));
    }

    copyWineNamesFrom(sourceRater) {
        // Ensure we have enough slots
        while (this.wines.length < sourceRater.wines.length) {
            if (this.wines.length >= this.maxWines) break;
            this.addWine(false);
        }

        sourceRater.wines.forEach((sourceWine, index) => {
            if (this.wines[index]) {
                this.wines[index].name = sourceWine.name;
                // Update DOM
                const wineItem = document.getElementById(`wine-${this.setId}-${this.wines[index].id}`);
                if (wineItem) {
                    const input = wineItem.querySelector('.wine-input');
                    if (input) {
                        input.value = sourceWine.name;
                        // Dispatch input event to ensure UI updates and listeners trigger
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            }
        });
        this.checkAndDistributeScores();
    }

    showCopyDialog() {
        const otherSets = [1, 2, 3, 4].filter(id => id !== this.setId);
        const titles = otherSets.map(id => {
            const titleInput = document.getElementById(`title-${id}`);
            return titleInput ? titleInput.value : `セット${id}`;
        });

        const dialog = document.createElement('div');
        dialog.className = 'copy-dialog';
        dialog.innerHTML = `
            <div class="copy-dialog-content">
                <h3>コピー元を選択</h3>
                <div class="copy-dialog-buttons">
                    ${otherSets.map((id, index) => `
                        <button class="copy-dialog-btn" data-source="${id}">${titles[index]}</button>
                    `).join('')}
                    <button class="copy-dialog-btn cancel">キャンセル</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        // Add click handlers
        const buttons = dialog.querySelectorAll('.copy-dialog-btn:not(.cancel)');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const sourceId = btn.dataset.source;
                if (sourceId) {
                    const sourceRater = appInstances[sourceId];
                    if (sourceRater) {
                        this.copyWineNamesFrom(sourceRater);
                    }
                }
                dialog.remove();
            });
        });

        // Cancel button
        dialog.querySelector('.cancel').addEventListener('click', () => dialog.remove());

        // Close on background click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                dialog.remove();
            }
        });
    }

    showHelp() {
        const helpContent = `
            <div class="help-modal" id="help-modal">
                <div class="help-content">
                    <div class="help-header">
                        <h2>使い方</h2>
                        <button class="btn-close" onclick="document.getElementById('help-modal').remove()">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <div class="help-body">
                        <section>
                            <h3>📝 基本的な使い方</h3>
                            <ol>
                                <li>ワイン名を入力します（すべて入力すると自動で点数が割り振られます）</li>
                                <li>各ワインの <strong>+</strong> / <strong>−</strong> ボタンで0.25刻みで点数を調整</li>
                                <li>合計が <strong>10.00点</strong> になるよう調整してください</li>
                            </ol>
                        </section>
                        <section>
                            <h3>🍷 ワインの追加・削除</h3>
                            <ul>
                                <li><strong>ワインを追加</strong> ボタンで最大20個まで追加可能</li>
                                <li>ゴミ箱アイコンで削除（最低10個は残ります）</li>
                            </ul>
                        </section>
                        <section>
                            <h3>✨ 自動割り振り機能</h3>
                            <p>すべてのワイン名を入力すると、自動的に合計10点になるよう均等に点数が割り振られます。</p>
                        </section>
                        <section>
                            <h3>📋 ワイン名のコピー</h3>
                            <p>各セットのヘッダーにある<strong>コピーボタン</strong>をクリックすると、他のセットからワイン名をコピーできます。点数はコピーされません。</p>
                        </section>
                        <section>
                            <h3>💡 ヒント</h3>
                            <ul>
                                <li>合計が10.00点ピッタリになると緑色で表示されます</li>
                                <li>点数は0.25刻みで調整できます</li>
                                <li>Enterキーで次のワイン入力欄に移動します</li>
                                <li>セット名は編集可能です</li>
                            </ul>
                        </section>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', helpContent);

        // Close on background click
        const modal = document.getElementById('help-modal');
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

// Initialize 4 instances
const appInstances = {
    1: new WineRater(1),
    2: new WineRater(2),
    3: new WineRater(3),
    4: new WineRater(4)
};

// Keep backwards compatibility
const app = appInstances[1];

function generateCSVContent() {
    const rows = [['セット名', 'ワイン名', '点数']];

    Object.values(appInstances).forEach(rater => {
        const titleInput = document.getElementById(`title-${rater.setId}`);
        const setName = titleInput ? titleInput.value : `セット${rater.setId}`;

        rater.wines.forEach(wine => {
            // Escape quotes in name
            const name = (wine.name || '').replace(/"/g, '""');
            rows.push([`"${setName}"`, `"${name}"`, wine.score.toFixed(2)]);
        });
    });

    return rows.map(e => e.join(",")).join("\n");
}

function downloadCSV(csvContent) {
    // Generate filename with timestamp
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const filename = `wine_ratings_${timestamp}.csv`;

    // Try Blob method first (better for large files)
    try {
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // UTF-8 BOM
        const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (e) {
        console.warn('Blob download failed, trying data URI fallback...', e);
        // Fallback to data URI (better for file:// protocol in some browsers)
        const encodedUri = encodeURI("data:text/csv;charset=utf-8,\uFEFF" + csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function showExportModal() {
    const csvContent = generateCSVContent();

    // Generate filename with timestamp
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const filename = `wine_ratings_${timestamp}.csv`;

    // Create Blob URL
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // UTF-8 BOM
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const modal = document.createElement('div');
    modal.className = 'help-modal'; // Reuse help modal styling
    modal.id = 'export-modal';

    modal.innerHTML = `
        <div class="help-content" style="max-width: 600px;">
            <div class="help-header">
                <h2>CSV出力</h2>
                <button class="btn-close" id="close-export-modal">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="help-body">
                <p>以下のボタンからダウンロード、またはテキストをコピーしてください。</p>
                <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                    <a id="modal-download-btn" class="btn-primary" href="${url}" download="${filename}" style="flex: 1; text-decoration: none; display: flex; align-items: center; justify-content: center;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 5px;">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        CSVをダウンロード
                    </a>
                    <button id="modal-copy-btn" class="btn-secondary" style="flex: 1; background: white; border: 1px solid var(--primary); color: var(--primary);">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 5px;">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        クリップボードにコピー
                    </button>
                </div>
                <textarea id="csv-textarea" style="width: 100%; height: 200px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 12px;" readonly>${csvContent}</textarea>
                <p id="copy-status" style="margin-top: 5px; font-size: 0.9em; color: var(--success); height: 1.2em;"></p>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Cleanup function
    const cleanup = () => {
        URL.revokeObjectURL(url);
        modal.remove();
    };

    // Event Listeners
    document.getElementById('close-export-modal').addEventListener('click', cleanup);

    document.getElementById('modal-copy-btn').addEventListener('click', () => {
        const textarea = document.getElementById('csv-textarea');
        textarea.select();
        document.execCommand('copy');

        const status = document.getElementById('copy-status');
        status.textContent = 'コピーしました！';
        setTimeout(() => status.textContent = '', 2000);
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            cleanup();
        }
    });
}

document.getElementById('export-btn').addEventListener('click', showExportModal);
