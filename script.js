class WineRater {
    constructor(setId) {
        this.setId = setId;
        this.wines = [];
        this.minWines = 2;
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

        const distributeBtn = document.getElementById(`distribute-btn-${this.setId}`);
        if (distributeBtn) {
            distributeBtn.addEventListener('click', () => this.distributeScoresEvenly());
        }

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
        saveToLocalStorage(); // Auto-save
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
                    saveToLocalStorage(); // Auto-save
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
            saveToLocalStorage(); // Auto-save
        }
    }

    updateName(id, name) {
        const wine = this.wines.find(w => w.id === id);
        if (wine) {
            wine.name = name;
            this.checkAndDistributeScores();
            saveToLocalStorage(); // Auto-save
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

    distributeScoresEvenly() {
        // Reset manual score flag to allow auto-distribution
        this.isManualScore = false;

        // Trigger distribution
        this.checkAndDistributeScores();

        // Save changes
        saveToLocalStorage();

        // Visual feedback (optional but nice)
        const btn = document.getElementById(`distribute-btn-${this.setId}`);
        if (btn) {
            const originalColor = btn.style.color;
            btn.style.color = 'var(--success)';
            setTimeout(() => {
                btn.style.color = originalColor;
            }, 500);
        }
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
                    value="${wine.name}"
                    enterkeyhint="next">
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

        // Add Paste listener for bulk entry
        input.addEventListener('paste', (e) => {
            const pasteData = (e.clipboardData || window.clipboardData).getData('text');
            if (pasteData.includes('\n')) {
                e.preventDefault();
                const lines = pasteData.split(/\r?\n/).map(line => line.trim()).filter(line => line !== '');

                if (lines.length > 0) {
                    // Set current input
                    input.value = lines[0];
                    this.updateName(wine.id, lines[0]);

                    // Process remaining lines
                    let currentWineIndex = this.wines.findIndex(w => w.id === wine.id);

                    for (let i = 1; i < lines.length; i++) {
                        // Check if we need to add a new wine
                        if (currentWineIndex + i >= this.wines.length) {
                            if (this.wines.length < this.maxWines) {
                                this.addWine(false);
                            } else {
                                break; // Reached max limit
                            }
                        }

                        // Update the next wine
                        const nextWine = this.wines[currentWineIndex + i];
                        if (nextWine) {
                            nextWine.name = lines[i];

                            // Update DOM
                            const nextWineItem = document.getElementById(`wine-${this.setId}-${nextWine.id}`);
                            if (nextWineItem) {
                                const nextInput = nextWineItem.querySelector('.wine-input');
                                if (nextInput) {
                                    nextInput.value = lines[i];
                                }
                            }
                        }
                    }

                    this.checkAndDistributeScores();
                    saveToLocalStorage();
                }
            }
        });

        // Add Enter key listener to move to next input
        input.addEventListener('keydown', (e) => {
            // Ignore if IME composition is active
            if (e.isComposing) return;

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
                } else {
                    // Last item, add new wine if not at max
                    if (this.wines.length < this.maxWines) {
                        this.addWine();
                        // Focus on the new input
                        setTimeout(() => {
                            const newAllInputs = Array.from(this.wineListEl.querySelectorAll('.wine-input'));
                            const lastInput = newAllInputs[newAllInputs.length - 1];
                            if (lastInput) {
                                lastInput.focus();
                            }
                        }, 50);
                    }
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

    copyWineNamesFrom(sourceRater, selectedIndices = null) {
        // Filter wines if indices are provided
        let winesToCopy = sourceRater.wines;
        if (selectedIndices) {
            winesToCopy = selectedIndices.map(index => sourceRater.wines[index]).filter(w => w);
        }

        // Ensure we have enough slots
        while (this.wines.length < winesToCopy.length) {
            if (this.wines.length >= this.maxWines) break;
            this.addWine(false);
        }

        winesToCopy.forEach((sourceWine, index) => {
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
            <div class="copy-dialog-content" id="copy-step-1">
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

        // Step 1: Source Selection
        const buttons = dialog.querySelectorAll('.copy-dialog-btn:not(.cancel)');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const sourceId = btn.dataset.source;
                if (sourceId) {
                    this.showWineSelectionStep(dialog, sourceId);
                }
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

    showWineSelectionStep(dialog, sourceId) {
        const sourceRater = appInstances[sourceId];
        if (!sourceRater) return;

        const content = dialog.querySelector('.copy-dialog-content');

        // Generate wine list HTML
        const winesHtml = sourceRater.wines.map((wine, index) => `
            <div class="wine-select-item">
                <label>
                    <input type="checkbox" class="wine-select-checkbox" value="${index}" checked>
                    <span class="wine-select-name">${wine.name || '(名称未設定)'}</span>
                </label>
            </div>
        `).join('');

        content.innerHTML = `
            <h3>ワインを選択</h3>
            <div class="wine-select-list" style="max-height: 300px; overflow-y: auto; margin-bottom: 20px; text-align: left;">
                <div style="margin-bottom: 10px;">
                    <button id="select-all-btn" style="font-size: 0.8em; padding: 2px 8px;">すべて選択</button>
                    <button id="deselect-all-btn" style="font-size: 0.8em; padding: 2px 8px;">すべて解除</button>
                </div>
                ${winesHtml}
            </div>
            <div class="copy-dialog-buttons">
                <button class="copy-dialog-btn btn-primary" id="confirm-copy-btn">コピー実行</button>
                <button class="copy-dialog-btn cancel">キャンセル</button>
            </div>
        `;

        // Helper functions
        const checkboxes = content.querySelectorAll('.wine-select-checkbox');

        content.querySelector('#select-all-btn').addEventListener('click', () => {
            checkboxes.forEach(cb => cb.checked = true);
        });

        content.querySelector('#deselect-all-btn').addEventListener('click', () => {
            checkboxes.forEach(cb => cb.checked = false);
        });

        // Confirm Copy
        content.querySelector('#confirm-copy-btn').addEventListener('click', () => {
            const selectedIndices = Array.from(checkboxes)
                .filter(cb => cb.checked)
                .map(cb => parseInt(cb.value));

            if (selectedIndices.length > 0) {
                this.copyWineNamesFrom(sourceRater, selectedIndices);
            }
            dialog.remove();
        });

        // Cancel
        content.querySelector('.cancel').addEventListener('click', () => dialog.remove());
    }

    showHelp() {
        // Remove any existing help modal first
        const existingModal = document.getElementById('help-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const helpContent = `
            <div class="help-modal" id="help-modal">
                <div class="help-content">
                    <div class="help-header">
                        <h2>使い方</h2>
                        <button class="btn-close" id="help-close-btn">
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
                                <li>ゴミ箱アイコンで削除（最低2個は残ります）</li>
                                <li><strong>リストの一括貼り付け</strong>: ワイン名のリストをコピーして、入力欄に貼り付けると、自動的に複数の欄に入力されます</li>
                            </ul>
                        </section>
                        <section>
                            <h3>✨ 自動割り振り機能</h3>
                            <p>すべてのワイン名を入力すると、自動的に合計10点になるよう均等に点数が割り振られます。</p>
                        </section>
                        <section>
                            <h3>⚖️ 均等割り振りボタン</h3>
                            <p>各セットのヘッダーにある<strong>三本線アイコン</strong>をクリックすると、手動で点数を変更した後でも、強制的に均等割り振り（合計10点）にリセットできます。</p>
                        </section>
                        <section>
                            <h3>📋 ワイン名のコピー</h3>
                            <p>各セットのヘッダーにある<strong>コピーボタン</strong>をクリックすると、他のセットからワイン名をコピーできます。</p>
                            <ul>
                                <li>コピー元のセットを選択すると、ワインのリストが表示されます</li>
                                <li>必要なワインだけチェックを入れてコピーできます（点数はコピーされません）</li>
                            </ul>
                        </section>
                        <section>
                            <h3>📤 データのエクスポート</h3>
                            <p><strong>結果をCSV出力</strong>ボタンから2つの方法でデータを取得できます：</p>
                            <ul>
                                <li><strong>CSVをダウンロード</strong>: ファイルとして保存（Safari、Firefox、Edgeなどで推奨）</li>
                                <li><strong>クリップボードにコピー</strong>: タブ区切り形式でコピー。Excelやスプレッドシートに貼り付けると自動的に列に分かれます（<strong>Chrome推奨</strong>）</li>
                            </ul>
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
                        <section>
                            <h3>🔒 プライバシーとデータ</h3>
                            <p>入力されたデータは、お使いのブラウザ内（ローカルストレージ）にのみ保存されます。</p>
                            <ul>
                                <li>外部サーバーへ送信されることはありません</li>
                                <li>アプリ開発者がデータを閲覧することはできません</li>
                            </ul>
                        </section>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', helpContent);

        // Get the modal and close button
        const modal = document.getElementById('help-modal');
        const closeBtn = document.getElementById('help-close-btn');

        // Close button handler
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            modal.remove();
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

// Must be defined before instances are created and saved data is loaded
const STORAGE_KEY = 'wine-rater-data';
// Skip saving until initialization (including restore) has finished
let isAppReady = false;

// Initialize 4 instances
const appInstances = {
    1: new WineRater(1),
    2: new WineRater(2),
    3: new WineRater(3),
    4: new WineRater(4)
};

// Keep backwards compatibility
const app = appInstances[1];

// Load saved data from localStorage
loadFromLocalStorage();
isAppReady = true;

// Add listeners for title changes (auto-save)
[1, 2, 3, 4].forEach(setId => {
    const titleInput = document.getElementById(`title-${setId}`);
    if (titleInput) {
        titleInput.addEventListener('input', () => {
            saveToLocalStorage();
        });
    }
});

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

// ========================================
// LocalStorage Persistence
// ========================================

function saveToLocalStorage() {
    if (!isAppReady) return;
    try {
        const data = {
            sets: {},
            lastSaved: new Date().toISOString()
        };

        // Save each set's data
        Object.values(appInstances).forEach(rater => {
            const titleInput = document.getElementById(`title-${rater.setId}`);
            const setTitle = titleInput ? titleInput.value : `セット${rater.setId}`;

            data.sets[rater.setId] = {
                title: setTitle,
                isManualScore: rater.isManualScore,
                wines: rater.wines.map(wine => ({
                    name: wine.name,
                    score: wine.score
                }))
            };
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
    }
}

function loadFromLocalStorage() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (!savedData) return false;

        const data = JSON.parse(savedData);
        if (!data.sets) return false;

        // Restore each set's data
        Object.keys(data.sets).forEach(setId => {
            const savedSet = data.sets[setId];
            const rater = appInstances[setId];

            if (!rater || !savedSet) return;

            // Restore title
            const titleInput = document.getElementById(`title-${setId}`);
            if (titleInput && savedSet.title) {
                titleInput.value = savedSet.title;
            }

            // Restore isManualScore flag
            if (savedSet.isManualScore !== undefined) {
                rater.isManualScore = savedSet.isManualScore;
            }

            // Clear existing wines
            rater.wines = [];
            rater.wineListEl.innerHTML = '';

            // Restore wines
            if (savedSet.wines && savedSet.wines.length > 0) {
                savedSet.wines.forEach((savedWine, index) => {
                    const id = Date.now() + Math.random() + index;
                    const wine = {
                        id,
                        name: savedWine.name || '',
                        score: savedWine.score || 0.0
                    };
                    rater.wines.push(wine);
                    rater.renderWine(wine, false); // No animation on restore
                });
            } else {
                // If no saved wines, initialize with minimum
                for (let i = 0; i < rater.minWines; i++) {
                    rater.addWine(false);
                }
            }

            rater.updateUI();
        });

        return true;
    } catch (error) {
        console.error('Failed to load from localStorage:', error);
        return false;
    }
}

function showResetModal() {
    // Remove any existing modal
    const existingModal = document.getElementById('reset-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modalContent = `
        <div class="copy-dialog" id="reset-modal">
            <div class="copy-dialog-content">
                <h3 style="color: var(--error);">⚠️ データの削除</h3>
                <p style="margin-bottom: 20px; line-height: 1.5;">
                    すべての入力データと設定を削除して初期状態に戻します。<br>
                    <strong>この操作は取り消せません。</strong><br>
                    よろしいですか？
                </p>
                <div class="copy-dialog-buttons">
                    <button class="copy-dialog-btn" id="confirm-reset-btn" style="color: var(--error); border-color: var(--error);">
                        はい、すべて削除します
                    </button>
                    <button class="copy-dialog-btn cancel" id="cancel-reset-btn">
                        キャンセル
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalContent);

    const modal = document.getElementById('reset-modal');

    // Confirm Reset
    document.getElementById('confirm-reset-btn').addEventListener('click', () => {
        performReset();
    });

    // Cancel
    document.getElementById('cancel-reset-btn').addEventListener('click', () => {
        modal.remove();
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function performReset() {
    try {
        localStorage.removeItem(STORAGE_KEY);

        // Show feedback
        const btn = document.getElementById('confirm-reset-btn');
        btn.textContent = '削除中...';
        btn.disabled = true;

        setTimeout(() => {
            window.location.reload();
        }, 500);
    } catch (error) {
        console.error('Failed to clear localStorage:', error);
        alert('データのリセットに失敗しました。');
    }
}

function generateTSVContent() {
    const rows = [['セット名', 'ワイン名', '点数']];

    Object.values(appInstances).forEach(rater => {
        const titleInput = document.getElementById(`title-${rater.setId}`);
        const setName = titleInput ? titleInput.value : `セット${rater.setId}`;

        rater.wines.forEach(wine => {
            const name = wine.name || '';
            rows.push([setName, name, wine.score.toFixed(2)]);
        });
    });

    return rows.map(e => e.join("\t")).join("\n");
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
                    <button id="modal-download-btn" class="btn-primary" style="flex: 1; display: flex; align-items: center; justify-content: center;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 5px;">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        CSVをダウンロード
                    </button>
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

    // Event Listeners
    document.getElementById('close-export-modal').addEventListener('click', () => {
        modal.remove();
    });

    // Use downloadCSV for robust downloading with fallback
    document.getElementById('modal-download-btn').addEventListener('click', (e) => {
        // Generate filename with timestamp
        const now = new Date();
        const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
        const filename = `wine_ratings_${timestamp}.csv`;

        // Create download immediately in click handler to avoid Chrome blocking
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
        } catch (error) {
            console.warn('Blob download failed, trying data URI fallback...', error);
            // Fallback to data URI
            const encodedUri = encodeURI("data:text/csv;charset=utf-8,\uFEFF" + csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    });

    document.getElementById('modal-copy-btn').addEventListener('click', () => {
        // Use TSV format for clipboard (better for Excel/Sheets paste)
        const tsvContent = generateTSVContent();

        // Use modern Clipboard API if available
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(tsvContent).then(() => {
                const status = document.getElementById('copy-status');
                status.textContent = 'コピーしました！Excelなどに貼り付けできます';
                setTimeout(() => status.textContent = '', 2000);
            }).catch(err => {
                console.error('Clipboard copy failed:', err);
                // Fallback to old method
                fallbackCopy(tsvContent);
            });
        } else {
            // Fallback for older browsers
            fallbackCopy(tsvContent);
        }

        function fallbackCopy(text) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);

            const status = document.getElementById('copy-status');
            status.textContent = 'コピーしました！Excelなどに貼り付けできます';
            setTimeout(() => status.textContent = '', 2000);
        }
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

document.getElementById('export-btn').addEventListener('click', showExportModal);

// Reset button with proper event handling
const resetBtn = document.getElementById('reset-btn');
if (resetBtn) {
    resetBtn.addEventListener('click', showResetModal);
}
