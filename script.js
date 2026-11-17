// Escape text before inserting it into HTML (names and titles can come from backup files)
function escapeHtml(text) {
    return String(text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// YYYYMMDDhhmmss in the device's local time (toISOString() would give UTC)
function localTimestamp(date) {
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
        `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

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

        // "Distribute by my scores" button next to "Add wine"
        const myScoreBtn = document.createElement('button');
        myScoreBtn.type = 'button';
        myScoreBtn.className = 'btn-secondary btn-my-distribute';
        myScoreBtn.textContent = '自分の点数で配分';
        myScoreBtn.title = '各ワインの「自分の点数」から10点を配分します';
        myScoreBtn.addEventListener('click', () => this.distributeByMyScores());
        this.addBtn.parentElement.appendChild(myScoreBtn);
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
            const oldName = wine.name;
            wine.name = name;
            moveNoteOnRename(oldName, name);
            this.refreshNoteUI(wine);
            this.checkAndDistributeScores();
            saveToLocalStorage(); // Auto-save
        }
    }

    // Split 10 points in proportion to each wine's personal score minus a baseline
    // (85, or 1 below the lowest score if lower), in 0.25 steps that add up to 10.00.
    distributeByMyScores() {
        const named = this.wines.filter(w => noteKey(w.name));
        if (named.length === 0) return;

        const parsed = named.map(w => ({ wine: w, value: parseMyScore(getMyScore(w.name)) }));
        const missing = parsed.filter(p => p.value === null).map(p => noteKey(p.wine.name));
        if (missing.length > 0) {
            window.alert(`自分の点数が入っていないワインがあります：\n${missing.join('\n')}\n\n各ワインの「感想」ボタンから「自分の点数」を入れてください。`);
            return;
        }

        const lowest = Math.min(...parsed.map(p => p.value));
        const baseline = Math.min(85, lowest - 1);
        const weights = parsed.map(p => p.value - baseline);
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        const totalUnits = Math.round(this.targetScore / 0.25); // 40 units of 0.25

        const raw = weights.map(w => totalUnits * w / totalWeight);
        const units = raw.map(Math.floor);
        let rest = totalUnits - units.reduce((a, b) => a + b, 0);
        raw.map((r, i) => ({ i, frac: r - units[i], w: weights[i] }))
            .sort((a, b) => b.frac - a.frac || b.w - a.w)
            .forEach(({ i }) => { if (rest > 0) { units[i]++; rest--; } });

        this.wines.forEach(w => w.score = 0);
        parsed.forEach((p, i) => { p.wine.score = units[i] * 0.25; });
        this.isManualScore = true;
        this.wines.forEach(w => this.updateWineScoreDisplay(w));
        this.updateUI();
        saveToLocalStorage();
    }

    // Sync the note button state (and open note field) of one wine with its name
    refreshNoteUI(wine) {
        const wineItem = document.getElementById(`wine-${this.setId}-${wine.id}`);
        if (!wineItem) return;
        const noteBtn = wineItem.querySelector('.btn-note');
        const notePanel = wineItem.querySelector('.note-panel');
        const noteEl = wineItem.querySelector('.wine-note');
        const myScoreEl = wineItem.querySelector('.my-score-input');
        const key = noteKey(wine.name);
        const note = getNote(wine.name);
        const myScore = getMyScore(wine.name);

        noteBtn.disabled = !key;
        noteBtn.classList.toggle('has-note', note !== '' || myScore !== '');
        noteBtn.querySelector('.btn-note-label').textContent = myScore ? `感想 ${myScore}` : '感想';
        if (!key) {
            notePanel.hidden = true;
        } else if (!notePanel.hidden) {
            if (document.activeElement !== noteEl) noteEl.value = note;
            if (document.activeElement !== myScoreEl) myScoreEl.value = myScore;
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

        // Update note buttons (names may have been changed by paste or copy)
        this.wines.forEach(wine => this.refreshNoteUI(wine));

        // Update Summary Status
        const hasNamedWine = this.wines.some(w => noteKey(w.name));
        if (!hasNamedWine) {
            // Unused set: neutral instead of a red warning
            this.scoreSummaryEl.classList.remove('valid', 'invalid');
            this.statusMessageEl.textContent = 'ワイン名を入力すると点数が割り振られます';
            this.statusMessageEl.style.color = 'var(--text-muted)';
        } else if (Math.abs(total - this.targetScore) < 0.01) {
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
                    value="${escapeHtml(wine.name)}"
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
            <button class="btn-note" data-action="note" data-wine-id="${wine.id}" title="感想を書く">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path>
                </svg>
                <span class="btn-note-label">感想</span>
            </button>
            <button class="btn-icon btn-remove" data-action="remove" data-wine-id="${wine.id}"
                ${this.wines.length <= this.minWines ? 'disabled' : ''}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
            <div class="note-panel" hidden>
                <div class="note-tools">
                    <label class="my-score-label">自分の点数
                        <input type="text" class="my-score-input" maxlength="8" placeholder="例 93+" autocomplete="off">
                    </label>
                    <button type="button" class="btn-time" title="今の時刻を感想に入れる">時刻を入れる</button>
                </div>
                <textarea class="wine-note" rows="3" placeholder="感想（色調・香り・味わい・総評など）"></textarea>
            </div>
        `;

        this.wineListEl.appendChild(div);

        // Note panel (impression + personal score): shared by wine name across all sets
        const noteBtn = div.querySelector('.btn-note');
        const notePanel = div.querySelector('.note-panel');
        const noteEl = div.querySelector('.wine-note');
        const myScoreEl = div.querySelector('.my-score-input');
        noteBtn.addEventListener('click', () => {
            if (!noteKey(wine.name)) return;
            notePanel.hidden = !notePanel.hidden;
            if (!notePanel.hidden) {
                noteEl.value = getNote(wine.name);
                myScoreEl.value = getMyScore(wine.name);
                noteEl.focus();
            }
        });
        noteEl.addEventListener('input', () => {
            setNote(wine.name, noteEl.value);
            refreshAllNoteUI();
            saveToLocalStorage();
        });
        myScoreEl.addEventListener('input', () => {
            setMyScore(wine.name, myScoreEl.value);
            refreshAllNoteUI();
            saveToLocalStorage();
        });
        div.querySelector('.btn-time').addEventListener('click', () => {
            const now = new Date();
            const stamp = `（${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}）`;
            const pos = noteEl.selectionStart ?? noteEl.value.length;
            noteEl.value = noteEl.value.slice(0, pos) + stamp + noteEl.value.slice(noteEl.selectionEnd ?? pos);
            noteEl.focus();
            noteEl.setSelectionRange(pos + stamp.length, pos + stamp.length);
            noteEl.dispatchEvent(new Event('input', { bubbles: true }));
        });
        this.refreshNoteUI(wine);

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
        const otherSets = setIds().filter(id => id !== this.setId);
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
                        <button class="copy-dialog-btn" data-source="${id}">${escapeHtml(titles[index])}</button>
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
                    <span class="wine-select-name">${wine.name ? escapeHtml(wine.name) : '(名称未設定)'}</span>
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
                            <h3>📝 基本の流れ</h3>
                            <ol>
                                <li>各セット（投票部門）にワイン名を入力します。名前を入れると合計10点になるよう自動で点数が割り振られます</li>
                                <li><strong>+</strong> / <strong>−</strong> ボタンで0.25刻みに調整し、合計を <strong>10.00点</strong> にします（合うと緑色になります）</li>
                                <li>必要に応じて各ワインの <strong>感想</strong> ボタンから感想と自分の点数を書きます（<strong>自分の点数で配分</strong> ボタンで10点の配分を自動で作れます）</li>
                                <li><strong>結果を出力</strong> ボタンで、感想と採点をまとめた文面をコピー、またはメールアプリで開きます</li>
                            </ol>
                        </section>
                        <section>
                            <h3>🍷 ワインの入力</h3>
                            <ul>
                                <li><strong>一括貼り付け</strong>: 1行に1本ずつ書いたワイン名のリストを入力欄に貼り付けると、複数の欄にまとめて入ります</li>
                                <li><strong>ワインを追加</strong> ボタンで最大20本まで追加、ゴミ箱アイコンで削除できます（最低2本は残ります）</li>
                                <li>各セット右上の<strong>コピーボタン</strong>で、他のセットからワイン名をコピーできます。必要なワインだけ選ぶこともできます（点数はコピーされません）</li>
                                <li>Enterキーで次の入力欄に移動します。セット名（投票部門名）も書き換えられます</li>
                                <li>投票部門が5つ以上あるときは、一番下の <strong>投票部門を追加</strong> で増やせます（最大8つ）。追加した部門は右上のゴミ箱アイコンで削除できます</li>
                            </ul>
                        </section>
                        <section>
                            <h3>⚖️ 点数</h3>
                            <ul>
                                <li>手動で調整した後でも、各セット右上の<strong>三本線アイコン</strong>で均等割り振り（合計10点）に戻せます</li>
                                <li>合計が10.00点ちょうどになると緑色、過不足があると赤色で表示されます</li>
                                <li><strong>自分の点数で配分</strong>: 各ワインの「自分の点数」（例：93、94+）に応じて10点を配分します。点数の差が配分の差になります（85点を基準に、それを上回った分の比で配分）。配分後に + / − で調整できます</li>
                            </ul>
                        </section>
                        <section>
                            <h3>✏️ 感想</h3>
                            <ul>
                                <li>各ワインの <strong>感想</strong> ボタンで入力欄が開きます。色調・香り・味わい・総評などを自由に書けます</li>
                                <li><strong>自分の点数</strong>（100点満点など自由な形式。例：93+）も入れられます。入れるとボタンに表示されます</li>
                                <li><strong>時刻を入れる</strong> ボタンで、今の時刻（例：（19:40））を感想に書き込めます。時間による変化の記録に使えます</li>
                                <li>感想か自分の点数を入れたワインは、ボタンが紺色になります</li>
                                <li>同じ名前のワインには、どのセットでも同じ感想が表示されます（1本につき1回書けば済みます）</li>
                            </ul>
                        </section>
                        <section>
                            <h3>📤 結果の出力</h3>
                            <ul>
                                <li><strong>感想・人気投票の文面</strong>: 感想と各セットの採点（「3.50｜1. ワイン名」の形）をまとめた文面です。「メール用」と「Markdown」（見出しと表の形式）を切り替えられます。欄の中で書き足してから、コピーまたはメールアプリで開けます</li>
                                <li>合計が10.00でない部門があると、出力画面の上に警告が出ます</li>
                                <li><strong>ワイン会名</strong>を入れると、メールの件名（例：「2026年11月ワイン会 感想・人気投票」）に使われます。<strong>自分の点数を文面に含める</strong>にチェックすると、感想の見出しに自分の点数が付きます</li>
                                <li><strong>CSV</strong>: ファイルとしてダウンロード、またはExcel・スプレッドシートに貼り付けられる形でコピーできます（自分の点数と感想の列も含みます）</li>
                            </ul>
                        </section>
                        <section>
                            <h3>💾 バックアップとデータ</h3>
                            <ul>
                                <li>入力内容は、お使いのブラウザ内（ローカルストレージ）にのみ自動保存されます。外部サーバーへの送信や、開発者による閲覧はありません</li>
                                <li>プライベートブラウズやサイトデータの削除でデータは消えます。<strong>バックアップ</strong>ボタンからファイルに保存しておくと、あとで読み込んで元に戻せます</li>
                                <li>バックアップファイルを別の端末やブラウザで読み込むと、データを移せます（読み込むと現在の入力内容は置き換えられます）</li>
                                <li><strong>リセット</strong>ボタンで全データを削除して初期状態に戻せます</li>
                                <li>ページ一番下の <strong>最新版を確認</strong> で、アプリの新しい版があれば読み込み直します（ホーム画面に追加したときの再読み込みにも使えます。入力内容はそのまま残ります）</li>
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

// Notes (impressions) and personal scores, keyed by wine name and shared across all sets
let wineNotes = {};
let wineMyScores = {};
// Name of the tasting event (used in the email subject)
let eventName = '';

function noteKey(name) {
    return (name || '').trim();
}

function getNote(name) {
    const key = noteKey(name);
    return key ? (wineNotes[key] || '') : '';
}

function setNote(name, text) {
    const key = noteKey(name);
    if (!key) return;
    if (text.trim() === '') {
        delete wineNotes[key];
    } else {
        wineNotes[key] = text;
    }
}

// "93" -> 93, "93+" -> 93.3, "94++" -> 94.6, "92-" -> 91.7; null if no number
function parseMyScore(text) {
    const match = String(text || '').match(/\d+(\.\d+)?/);
    if (!match) return null;
    const plus = (text.match(/[+＋]/g) || []).length;
    const minus = (text.slice(match.index + match[0].length).match(/[-−ー]/g) || []).length;
    return parseFloat(match[0]) + 0.3 * plus - 0.3 * minus;
}

function getMyScore(name) {
    const key = noteKey(name);
    return key ? (wineMyScores[key] || '') : '';
}

function setMyScore(name, text) {
    const key = noteKey(name);
    if (!key) return;
    const value = text.trim();
    if (value === '') {
        delete wineMyScores[key];
    } else {
        wineMyScores[key] = value;
    }
}

function isNameInUse(key) {
    return Object.values(appInstances).some(rater =>
        rater.wines.some(wine => noteKey(wine.name) === key)
    );
}

// When a wine is renamed (e.g. a typo fixed), carry its note and personal score over
// to the new name as long as no other wine still uses the old name.
function moveNoteOnRename(oldName, newName) {
    const oldKey = noteKey(oldName);
    const newKey = noteKey(newName);
    if (!oldKey || !newKey || oldKey === newKey) return;
    if (isNameInUse(oldKey)) return;
    [wineNotes, wineMyScores].forEach(map => {
        if (map[oldKey] && !map[newKey]) {
            map[newKey] = map[oldKey];
            delete map[oldKey];
        }
    });
}

function refreshAllNoteUI() {
    Object.values(appInstances).forEach(rater => {
        rater.wines.forEach(wine => rater.refreshNoteUI(wine));
    });
}

// Entries of a name-keyed map whose wine names currently exist in any set
function usedEntries(map) {
    const result = {};
    Object.keys(map).forEach(key => {
        if (isNameInUse(key)) result[key] = map[key];
    });
    return result;
}

function usedNotes() {
    return usedEntries(wineNotes);
}

// ========================================
// Sets (voting categories)
// ========================================

const BASE_SETS = 4;   // sets 1-4 are always shown
const MAX_SETS = 8;

function defaultSetTitle(setId) {
    return setId === 1 ? '総合評価' : `投票部門${setId - 1}`;
}

function setIds() {
    return Object.keys(appInstances).map(Number).sort((a, b) => a - b);
}

function attachTitleListener(setId) {
    const titleInput = document.getElementById(`title-${setId}`);
    if (titleInput) {
        titleInput.addEventListener('input', () => saveToLocalStorage());
    }
}

// Build the HTML of an extra set (same structure as sets 1-4 in index.html)
function createSetElement(setId) {
    const el = document.createElement('div');
    el.className = 'glass-container';
    el.id = `set-${setId}`;
    el.innerHTML = `
        <header>
            <div class="header-content">
                <div>
                    <input type="text" class="set-title" id="title-${setId}" value="${escapeHtml(defaultSetTitle(setId))}" placeholder="セット名">
                    <p class="subtitle">10点満点で評価</p>
                </div>
                <div class="header-buttons">
                    <button id="copy-btn-${setId}" class="btn-copy" title="ワイン名をコピー">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                    <button id="distribute-btn-${setId}" class="btn-icon-header" title="点数を均等に割り振る">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h18"></path>
                            <path d="M3 12h18"></path>
                            <path d="M3 18h18"></path>
                        </svg>
                    </button>
                    <button id="remove-set-btn-${setId}" class="btn-icon-header btn-remove-set" title="この投票部門を削除">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </header>
        <main>
            <div class="score-summary">
                <div class="score-card">
                    <span class="label">合計点</span>
                    <span class="value" id="total-score-${setId}">0.00</span>
                    <span class="target">/ 10.00</span>
                </div>
                <div class="status-message" id="status-message-${setId}"></div>
            </div>
            <div class="wine-list" id="wine-list-${setId}"></div>
            <div class="controls">
                <button id="add-wine-btn-${setId}" class="btn-primary">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    ワインを追加
                </button>
            </div>
        </main>
    `;
    return el;
}

// Add an extra set. Returns the new rater, or null if the limit is reached.
function addSet(setId = null) {
    const ids = setIds();
    if (ids.length >= MAX_SETS) return null;
    const id = setId || Math.max(...ids) + 1;
    if (appInstances[id]) return appInstances[id];

    const container = document.querySelector('.sets-container');
    const addCard = document.getElementById('add-set-card');
    container.insertBefore(createSetElement(id), addCard);

    appInstances[id] = new WineRater(id);
    attachTitleListener(id);
    document.getElementById(`remove-set-btn-${id}`).addEventListener('click', () => {
        const title = document.getElementById(`title-${id}`).value || defaultSetTitle(id);
        if (window.confirm(`「${title}」を削除します。この部門のワインと点数は消えます（感想は残ります）。よろしいですか？`)) {
            removeSet(id);
        }
    });
    updateAddSetCard();
    return appInstances[id];
}

function removeSet(setId) {
    if (setId <= BASE_SETS || !appInstances[setId]) return;
    delete appInstances[setId];
    const el = document.getElementById(`set-${setId}`);
    if (el) el.remove();
    updateAddSetCard();
    saveToLocalStorage();
}

function updateAddSetCard() {
    const btn = document.getElementById('add-set-btn');
    if (!btn) return;
    const full = setIds().length >= MAX_SETS;
    btn.disabled = full;
    btn.querySelector('.add-set-label').textContent = full
        ? `投票部門は${MAX_SETS}つまでです`
        : '投票部門を追加';
}

// Initialize the 4 base sets
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
[1, 2, 3, 4].forEach(attachTitleListener);

const addSetBtn = document.getElementById('add-set-btn');
if (addSetBtn) {
    addSetBtn.addEventListener('click', () => {
        const rater = addSet();
        if (rater) {
            saveToLocalStorage();
            document.getElementById(`set-${rater.setId}`).scrollIntoView({ behavior: 'smooth', block: 'center' });
            document.getElementById(`title-${rater.setId}`).select();
        }
    });
}
updateAddSetCard();

function generateCSVContent() {
    const rows = [['セット名', 'ワイン名', '点数', '自分の点数', '感想']];

    Object.values(appInstances).forEach(rater => {
        const titleInput = document.getElementById(`title-${rater.setId}`);
        const setName = titleInput ? titleInput.value : `セット${rater.setId}`;

        rater.wines.forEach(wine => {
            // Escape quotes in name, personal score and note
            const name = (wine.name || '').replace(/"/g, '""');
            const myScore = getMyScore(wine.name).replace(/"/g, '""');
            const note = getNote(wine.name).replace(/"/g, '""');
            rows.push([`"${setName}"`, `"${name}"`, wine.score.toFixed(2), `"${myScore}"`, `"${note}"`]);
        });
    });

    return rows.map(e => e.join(",")).join("\n");
}

// ========================================
// LocalStorage Persistence
// ========================================

// Collect the current state of all sets (used for localStorage and backup files)
function collectAppData() {
    const data = {
        sets: {},
        notes: { ...wineNotes },
        myScores: { ...wineMyScores },
        eventName,
        lastSaved: new Date().toISOString()
    };

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

    return data;
}

function saveToLocalStorage() {
    if (!isAppReady) return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(collectAppData()));
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

        applyAppData(data);
        return true;
    } catch (error) {
        console.error('Failed to load from localStorage:', error);
        return false;
    }
}

// Restore all sets from a data object ({ sets: { 1: {...}, ... } })
function applyAppData(data) {
    // Restore notes and personal scores first so that rendered wines show their state
    wineNotes = (data.notes && typeof data.notes === 'object') ? { ...data.notes } : {};
    wineMyScores = (data.myScores && typeof data.myScores === 'object') ? { ...data.myScores } : {};
    eventName = typeof data.eventName === 'string' ? data.eventName : '';

    // Match the extra sets (5+) to the data: create missing ones, remove ones not in the data
    setIds().filter(id => id > BASE_SETS && !(id in data.sets)).forEach(id => removeSet(id));
    Object.keys(data.sets).map(Number).sort((a, b) => a - b)
        .filter(id => id > BASE_SETS && id <= MAX_SETS)
        .forEach(id => addSet(id));

    // Base sets missing from the data are reset to empty (loading replaces everything)
    const sets = { ...data.sets };
    for (let id = 1; id <= BASE_SETS; id++) {
        if (!(id in sets)) sets[id] = { title: defaultSetTitle(id), isManualScore: false, wines: [] };
    }

    // Restore each set's data
    Object.keys(sets).forEach(setId => {
        const savedSet = sets[setId];
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
    const rows = [['セット名', 'ワイン名', '点数', '自分の点数', '感想']];

    Object.values(appInstances).forEach(rater => {
        const titleInput = document.getElementById(`title-${rater.setId}`);
        const setName = titleInput ? titleInput.value : `セット${rater.setId}`;

        rater.wines.forEach(wine => {
            const name = wine.name || '';
            // Tabs and line breaks would split cells when pasted, so flatten them
            const note = getNote(wine.name).replace(/[\t\r\n]+/g, ' ');
            rows.push([setName, name, wine.score.toFixed(2), getMyScore(wine.name), note]);
        });
    });

    return rows.map(e => e.join("\t")).join("\n");
}

function downloadCSV(csvContent) {
    // Generate filename with timestamp
    const now = new Date();
    const timestamp = localTimestamp(now);
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
                <h2>結果の出力</h2>
                <button class="btn-close" id="close-export-modal">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="help-body">
                <div id="total-warning" class="total-warning" hidden></div>
                <h3 style="margin: 0 0 6px;">感想・人気投票の文面</h3>
                <p>感想と各セットの採点をまとめた文面です。下の欄で書き足してからコピーできます。</p>
                <div class="report-options">
                    <label class="event-name-label">ワイン会名（メールの件名に使います）
                        <input type="text" id="event-name-input" placeholder="例：2026年11月ワイン会" autocomplete="off">
                    </label>
                    <label class="report-check">
                        <input type="checkbox" id="include-my-scores"> 自分の点数を文面に含める
                    </label>
                </div>
                <div style="display: flex; gap: 8px; margin: 10px 0;" role="group" aria-label="文面の形式">
                    <button id="report-format-email" class="btn-secondary report-format" aria-pressed="true">メール用</button>
                    <button id="report-format-md" class="btn-secondary report-format" aria-pressed="false">Markdown</button>
                </div>
                <textarea id="report-textarea" class="report-textarea"></textarea>
                <div style="display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap;">
                    <button id="report-copy-btn" class="btn-primary" style="flex: 1; display: flex; align-items: center; justify-content: center;">
                        文面をコピー
                    </button>
                    <button id="report-mail-btn" class="btn-secondary" style="flex: 1; justify-content: center; background: white; border: 1px solid var(--primary); color: var(--primary);">
                        メールアプリで開く
                    </button>
                </div>
                <p id="report-status" style="margin-top: 5px; font-size: 0.9em; min-height: 1.2em;"></p>

                <h3 style="margin: 18px 0 6px;">CSV</h3>
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
                <textarea id="csv-textarea" style="width: 100%; height: 200px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 12px;" readonly>${escapeHtml(csvContent)}</textarea>
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
        const timestamp = localTimestamp(now);
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

    // Report text (notes + voting) for email
    const reportTextarea = document.getElementById('report-textarea');
    const reportStatus = document.getElementById('report-status');
    const includeMyScoresEl = document.getElementById('include-my-scores');
    const eventNameEl = document.getElementById('event-name-input');

    // Warn about sets whose total is not 10.00 (easy to miss before sending)
    const offSets = collectReportData().sets.filter(set => Math.abs(set.total - 10) > 0.001);
    const warningEl = document.getElementById('total-warning');
    if (offSets.length > 0) {
        warningEl.textContent = '合計が10.00でない部門があります：' +
            offSets.map(set => `（${set.index}）${set.title} ${set.total.toFixed(2)}`).join('、');
        warningEl.hidden = false;
    }

    eventNameEl.value = eventName;
    eventNameEl.addEventListener('input', () => {
        eventName = eventNameEl.value.trim();
        saveToLocalStorage();
    });

    const formatButtons = {
        email: document.getElementById('report-format-email'),
        markdown: document.getElementById('report-format-md')
    };
    let reportFormat = 'email';

    function showReport() {
        const include = includeMyScoresEl.checked;
        reportTextarea.value = reportFormat === 'markdown'
            ? generateMarkdownReport(include)
            : generateEmailReport(include);
        Object.entries(formatButtons).forEach(([key, btn]) => {
            btn.setAttribute('aria-pressed', String(key === reportFormat));
        });
    }

    formatButtons.email.addEventListener('click', () => { reportFormat = 'email'; showReport(); });
    formatButtons.markdown.addEventListener('click', () => { reportFormat = 'markdown'; showReport(); });
    includeMyScoresEl.addEventListener('change', showReport);
    showReport();

    document.getElementById('report-copy-btn').addEventListener('click', () => {
        copyTextToClipboard(reportTextarea.value).then(ok => {
            reportStatus.style.color = ok ? 'var(--success)' : 'var(--error)';
            reportStatus.textContent = ok ? 'コピーしました。メールやメモに貼り付けできます' : 'コピーに失敗しました。欄の文面を選択してコピーしてください';
            setTimeout(() => reportStatus.textContent = '', 3000);
        });
    });

    document.getElementById('report-mail-btn').addEventListener('click', () => {
        const subject = eventName ? `${eventName} 感想・人気投票` : 'ワイン会の感想と人気投票';
        const body = reportTextarea.value.replace(/\r?\n/g, '\r\n');
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

document.getElementById('export-btn').addEventListener('click', showExportModal);

// ========================================
// Report text (notes + voting results)
// ========================================

// Collect wines (unique by name, in order of first appearance) and per-set results
function collectReportData() {
    const wines = [];
    const numberByName = {};

    Object.values(appInstances).forEach(rater => {
        rater.wines.forEach(wine => {
            const key = noteKey(wine.name);
            if (key && !(key in numberByName)) {
                numberByName[key] = wines.length + 1;
                wines.push({ name: key, note: getNote(key).trim(), myScore: getMyScore(key) });
            }
        });
    });

    // Names that already start with a number (e.g. "① ..." or "3. ...") are used as-is
    const label = name => /^[0-9０-９①-⑳]/.test(name) ? name : `${numberByName[name]}. ${name}`;

    const sets = [];
    Object.values(appInstances).forEach(rater => {
        const named = rater.wines.filter(wine => noteKey(wine.name));
        if (named.length === 0) return;
        const rows = named.map(wine => ({ label: label(noteKey(wine.name)), score: wine.score.toFixed(2) }));
        const titleInput = document.getElementById(`title-${rater.setId}`);
        const title = (titleInput && titleInput.value.trim()) || `セット${rater.setId}`;
        sets.push({ index: sets.length + 1, title, rows, total: rater.calculateTotal() });
    });

    return {
        wines: wines.map(wine => ({ label: label(wine.name), note: wine.note, myScore: wine.myScore })),
        sets
    };
}

function generateEmailReport(includeMyScores = false) {
    const { wines, sets } = collectReportData();
    const lines = [];

    const noted = wines.filter(wine => wine.note || (includeMyScores && wine.myScore));
    if (noted.length > 0) {
        lines.push('■ 感想', '');
        noted.forEach(wine => {
            const heading = includeMyScores && wine.myScore ? `${wine.label}（${wine.myScore}）` : wine.label;
            lines.push(heading);
            if (wine.note) lines.push(wine.note);
            lines.push('');
        });
    }

    lines.push('以下、採点リストになります。', '', '■ 人気投票', '');
    sets.forEach((set, i) => {
        lines.push(`（${i + 1}）${set.title}`);
        // Score first: it always has the same width, so it lines up in any mail app
        set.rows.forEach(row => lines.push(`${row.score}｜${row.label}`));
        lines.push('');
    });

    return lines.join('\n').trim() + '\n';
}

// Markdown version: bold wine headings with notes, then one table per set
function generateMarkdownReport(includeMyScores = false) {
    const { wines, sets } = collectReportData();
    const cell = text => text.replace(/\|/g, '｜');
    const lines = [];

    wines.forEach(wine => {
        const heading = includeMyScores && wine.myScore ? `${wine.label}（${wine.myScore}）` : wine.label;
        lines.push(`**${heading}**`, '');
        if (wine.note) lines.push(wine.note, '');
    });

    lines.push('***', '');
    sets.forEach(set => {
        lines.push(`（${set.index}）${set.title}`, '', '| ワイン | 点数 |', '| --- | --- |');
        set.rows.forEach(row => lines.push(`| ${cell(row.label)} | ${row.score} |`));
        lines.push('');
    });

    return lines.join('\n').trim() + '\n';
}

function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopyText(text));
    }
    return Promise.resolve(fallbackCopyText(text));
}

function fallbackCopyText(text) {
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        return ok;
    } catch (error) {
        console.error('Copy failed:', error);
        return false;
    }
}

// Reset button with proper event handling
const resetBtn = document.getElementById('reset-btn');
if (resetBtn) {
    resetBtn.addEventListener('click', showResetModal);
}

// ========================================
// Backup (save to / load from a JSON file)
// ========================================

const BACKUP_APP_ID = 'wine-rater';
const BACKUP_VERSION = 1;

function downloadBackup() {
    const data = collectAppData();
    const backup = {
        app: BACKUP_APP_ID,
        version: BACKUP_VERSION,
        exportedAt: data.lastSaved,
        sets: data.sets,
        notes: usedNotes(),
        myScores: usedEntries(wineMyScores),
        eventName
    };

    // Local time for the filename (e.g. wine_rater_backup_20261117_2130.json)
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
    const filename = `wine_rater_backup_${stamp}.json`;

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);

    return filename;
}

// Validate a parsed backup file and return clean data, or null if invalid
function normalizeBackupData(raw) {
    if (!raw || typeof raw !== 'object' || !raw.sets || typeof raw.sets !== 'object') {
        return null;
    }

    const sets = {};
    Object.keys(raw.sets).forEach(setId => {
        const savedSet = raw.sets[setId];
        const id = Number(setId);
        if (!Number.isInteger(id) || id < 1 || id > MAX_SETS) return;
        if (!savedSet || !Array.isArray(savedSet.wines)) return;

        sets[setId] = {
            title: typeof savedSet.title === 'string' ? savedSet.title : '',
            isManualScore: savedSet.isManualScore === true,
            wines: savedSet.wines.map(wine => {
                const score = Number(wine && wine.score);
                return {
                    name: wine && wine.name != null ? String(wine.name) : '',
                    score: Number.isFinite(score) ? score : 0
                };
            })
        };
    });

    const notes = {};
    if (raw.notes && typeof raw.notes === 'object') {
        Object.keys(raw.notes).forEach(name => {
            const key = noteKey(name);
            const text = raw.notes[name];
            if (key && typeof text === 'string' && text.trim() !== '') {
                notes[key] = text;
            }
        });
    }

    const myScores = {};
    if (raw.myScores && typeof raw.myScores === 'object') {
        Object.keys(raw.myScores).forEach(name => {
            const key = noteKey(name);
            const value = raw.myScores[name];
            if (key && (typeof value === 'string' || typeof value === 'number') && String(value).trim() !== '') {
                myScores[key] = String(value).trim();
            }
        });
    }

    const name = typeof raw.eventName === 'string' ? raw.eventName.trim() : '';

    return Object.keys(sets).length > 0 ? { sets, notes, myScores, eventName: name } : null;
}

function importBackupFile(file, statusEl) {
    const reader = new FileReader();

    reader.onload = () => {
        let data;
        try {
            data = normalizeBackupData(JSON.parse(reader.result));
        } catch (error) {
            data = null;
        }

        if (!data) {
            statusEl.style.color = 'var(--error)';
            statusEl.textContent = 'このファイルは読み込めません。このアプリで保存したバックアップファイルを選んでください。';
            return;
        }

        const wineCount = Object.values(data.sets).reduce(
            (sum, set) => sum + set.wines.filter(wine => wine.name.trim() !== '').length, 0
        );
        const ok = window.confirm(
            `バックアップ（ワイン ${wineCount} 件）を読み込みます。\n現在の入力内容はすべて置き換えられます。よろしいですか？`
        );
        if (!ok) return;

        applyAppData(data);
        saveToLocalStorage();

        statusEl.style.color = 'var(--success)';
        statusEl.textContent = 'バックアップを読み込みました。';
    };

    reader.onerror = () => {
        statusEl.style.color = 'var(--error)';
        statusEl.textContent = 'ファイルの読み込みに失敗しました。';
    };

    reader.readAsText(file);
}

function showBackupModal() {
    const existingModal = document.getElementById('backup-modal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'help-modal'; // Reuse help modal styling
    modal.id = 'backup-modal';

    modal.innerHTML = `
        <div class="help-content" style="max-width: 600px;">
            <div class="help-header">
                <h2>バックアップ</h2>
                <button class="btn-close" id="close-backup-modal">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="help-body">
                <p>入力内容（全セットのワイン名・点数・感想・セット名）をファイルに保存し、あとで読み込んで元に戻せます。別の端末やブラウザへデータを移すときにも使えます。</p>
                <div style="display: flex; gap: 10px; margin: 15px 0; flex-wrap: wrap;">
                    <button id="backup-save-btn" class="btn-primary" style="flex: 1; display: flex; align-items: center; justify-content: center;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 5px;">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        ファイルに保存
                    </button>
                    <button id="backup-load-btn" class="btn-secondary" style="flex: 1; justify-content: center; background: white; border: 1px solid var(--primary); color: var(--primary);">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 5px;">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        ファイルから読み込み
                    </button>
                    <input type="file" id="backup-file-input" accept=".json,application/json" style="display: none;">
                </div>
                <p id="backup-status" style="font-size: 0.9em; min-height: 1.2em;"></p>
                <p style="font-size: 0.85em; color: var(--text-muted);">読み込むと現在の入力内容は置き換えられます。iPhone では保存したファイルは「ファイル」アプリの「ダウンロード」に入ります。</p>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const statusEl = document.getElementById('backup-status');
    const fileInput = document.getElementById('backup-file-input');

    document.getElementById('close-backup-modal').addEventListener('click', () => {
        modal.remove();
    });

    document.getElementById('backup-save-btn').addEventListener('click', () => {
        try {
            const filename = downloadBackup();
            statusEl.style.color = 'var(--success)';
            statusEl.textContent = `${filename} を保存しました。`;
        } catch (error) {
            console.error('Backup download failed:', error);
            statusEl.style.color = 'var(--error)';
            statusEl.textContent = 'バックアップの保存に失敗しました。';
        }
    });

    document.getElementById('backup-load-btn').addEventListener('click', () => {
        fileInput.value = '';
        fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        const file = fileInput.files && fileInput.files[0];
        if (file) {
            importBackupFile(file, statusEl);
        }
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

const backupBtn = document.getElementById('backup-btn');
if (backupBtn) {
    backupBtn.addEventListener('click', showBackupModal);
}

// ========================================
// Check for a newer version (home-screen apps have no reload button)
// ========================================

async function checkForUpdate() {
    const btn = document.getElementById('update-check-btn');
    const statusEl = document.getElementById('update-status');
    const current = document.getElementById('app-version').textContent.trim();

    btn.disabled = true;
    statusEl.textContent = '確認しています…';
    try {
        // Fetch the page from the server, bypassing the browser cache
        const html = await fetch(`./?t=${Date.now()}`, { cache: 'no-store' }).then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.text();
        });
        const match = html.match(/id="app-version">([^<]+)</);
        const latest = match ? match[1].trim() : null;

        if (!latest) throw new Error('version not found');
        if (latest === current) {
            statusEl.textContent = `最新版です（${current}）`;
            btn.disabled = false;
            return;
        }

        statusEl.textContent = `新しい版（${latest}）を読み込んでいます…`;
        saveToLocalStorage();
        // Refresh the cached copies of the app files, then reload
        await Promise.all(['./', 'index.html', 'script.js', 'style.css', 'manifest.webmanifest']
            .map(f => fetch(f, { cache: 'reload' }).catch(() => null)));
        window.location.reload();
    } catch (error) {
        console.error('Update check failed:', error);
        statusEl.textContent = '確認できませんでした。通信状態を確かめて、もう一度押してください';
        btn.disabled = false;
    }
}

const updateCheckBtn = document.getElementById('update-check-btn');
if (updateCheckBtn) {
    updateCheckBtn.addEventListener('click', checkForUpdate);
}
