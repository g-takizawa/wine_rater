# 🍷 10-Point Tasting Calculator (Wine Rater)

ワインのテイスティング評価を効率化するためのWebアプリケーションです。
10点満点法での採点をサポートし、複数の投票部門（セット）を並行して評価できます。

## ✨ 主な機能

### 📝 評価・採点
- **自動割り振り**: ワイン名を入力すると、合計が10点になるように自動的に点数を割り振ります。
- **一括入力**: ワイン名のリストをコピー＆ペーストするだけで、自動的に複数の入力欄に振り分けられます。
- **手動調整**: `+` / `-` ボタンで0.25点刻みの微調整が可能です。
- **均等割り振りリセット**: 手動調整後でも、ボタン一つで均等割り振り（合計10点）に戻せます。
- **4つの投票部門**: 最大4つのセット（投票部門）をタブ切り替えなしで同時に管理できます。

### 💾 データ管理
- **自動保存**: 入力内容はブラウザのローカルストレージに即座に保存されます。リロードしてもデータは消えません。
- **データ復元**: ページを開き直すと、前回の作業状態が自動的に復元されます。
- **リセット機能**: 全データを削除して初期状態に戻す機能があります（誤操作防止の確認画面あり）。

### 📤 エクスポート・共有
- **CSVダウンロード**: 評価結果をCSVファイルとしてダウンロードできます。
- **クリップボードコピー**: Excelやスプレッドシートに直接貼り付けられる形式（TSV）でコピーできます。
- **ワイン名コピー**: 他のセットからワイン名をコピーして、入力の手間を省けます。

### 📱 モバイル対応
- スマートフォンでも使いやすいレスポンシブデザイン。
- 入力フォームの最適化（「次へ」ボタンでのスムーズな移動）。

## 🚀 使い方

1. **ワイン名の入力**: 評価するワインの名前を入力します。
2. **点数の調整**: 必要に応じて点数を調整し、合計が10.00点になるようにします（合計が合うと緑色になります）。
3. **セットの活用**: 複数の投票部門がある場合は、横にスクロールしてSet 2, Set 3...を使用します。
4. **保存・出力**: 作業は自動保存されます。完了したら「結果をCSV出力」からデータを保存してください。

## 🛠 技術スタック

- HTML5
- CSS3 (Vanilla CSS, Responsive Grid/Flexbox)
- JavaScript (Vanilla JS, LocalStorage API)
- Google Fonts (Inter, Outfit)

## 📄 ライセンス

This project is open source and available under the [MIT License](LICENSE).

---

# 🍷 10-Point Tasting Calculator (Wine Rater)

A web application designed to streamline wine tasting evaluations.
It supports the 10-point scoring system and allows for parallel evaluation of multiple Voting Departments (sets).

## ✨ Key Features

### 📝 Evaluation & Scoring
- **Auto-Distribution**: Automatically distributes scores to sum up to 10 points when wine names are entered.
- **Bulk Entry**: Simply copy and paste a list of wine names to automatically populate multiple input fields.
- **Manual Adjustment**: Fine-tune scores in 0.25 increments using `+` / `-` buttons.
- **Even Distribution Reset**: Reset scores to an even distribution (totaling 10 points) with a single click, even after manual adjustments.
- **4 Voting Departments**: Manage up to 4 sets (Voting Departments) simultaneously without switching tabs.

### 💾 Data Management
- **Auto-Save**: Input is instantly saved to the browser's local storage. Data persists even after reloading.
- **Data Restoration**: Previous work state is automatically restored when reopening the page.
- **Reset Function**: Feature to clear all data and return to the initial state (with a confirmation dialog to prevent accidental deletion).

### 📤 Export & Share
- **CSV Download**: Download evaluation results as a CSV file.
- **Clipboard Copy**: Copy data in a format (TSV) that can be directly pasted into Excel or Google Sheets.
- **Wine Name Copy**: Copy wine names from other sets to save typing effort.

### 📱 Mobile Friendly
- Responsive design that works well on smartphones.
- Optimized input forms (smooth navigation with the "Next" button).

## 🚀 How to Use

1. **Enter Wine Names**: Input the names of the wines you are evaluating.
2. **Adjust Scores**: Adjust scores as needed to ensure the total is 10.00 points (the total turns green when correct).
3. **Use Sets**: If you have multiple Voting Departments, scroll horizontally to use Set 2, Set 3, etc.
4. **Save & Export**: Work is auto-saved. When finished, use "Export Results" to save your data.

## 🛠 Tech Stack

- HTML5
- CSS3 (Vanilla CSS, Responsive Grid/Flexbox)
- JavaScript (Vanilla JS, LocalStorage API)
- Google Fonts (Inter, Outfit)

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
