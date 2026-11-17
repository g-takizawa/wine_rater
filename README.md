# 🍷 10-Point Tasting Calculator (Wine Rater)

ワインのテイスティング評価を効率化するためのWebアプリケーションです。
10点満点法での採点をサポートし、複数の投票部門（セット）を並行して評価できます。

## ✨ 主な機能

### 📝 評価・採点
- **自動割り振り**: ワイン名を入力すると、合計が10点になるように自動的に点数を割り振ります。
- **一括入力**: ワイン名のリストをコピー＆ペーストするだけで、自動的に複数の入力欄に振り分けられます。
- **手動調整**: `+` / `-` ボタンで0.25点刻みの微調整が可能です。
- **均等割り振りリセット**: 手動調整後でも、ボタン一つで均等割り振り（合計10点）に戻せます。
- **感想メモ**: 各ワインに自由記述の感想欄（色調・香り・味わい・総評など）があります。同じ名前のワインには、どのセットでも同じ感想が表示されます。感想はCSV出力とバックアップにも含まれます。
- **4つの投票部門**: 最大4つのセット（投票部門）をタブ切り替えなしで同時に管理できます。

### 💾 データ管理
- **自動保存**: 入力内容はブラウザのローカルストレージに即座に保存されます。リロードしてもデータは消えません。
- **データ復元**: ページを開き直すと、前回の作業状態が自動的に復元されます。
- **リセット機能**: 全データを削除して初期状態に戻す機能があります（誤操作防止の確認画面あり）。
- **バックアップ**: 全セットの入力内容をファイル（JSON）に保存し、あとで読み込んで復元できます。プライベートブラウズやサイトデータの削除に備える場合や、別の端末・ブラウザへデータを移す場合に使えます。

### 📤 エクスポート・共有
- **感想・人気投票の文面**: 感想と各セットの採点をまとめたメール用の文面を作成し、コピーまたはメールアプリで開けます。
- **CSVダウンロード**: 評価結果をCSVファイルとしてダウンロードできます。
- **クリップボードコピー**: Excelやスプレッドシートに直接貼り付けられる形式（TSV）でコピーできます。
- **ワイン名コピー**: 他のセットからワイン名をコピーして、入力の手間を省けます（特定のワインだけ選んでコピーも可能）。
- **プライバシー保護**: データはブラウザ内のみに保存され、外部サーバーへの送信や開発者による閲覧は一切行われません。

### 📱 モバイル対応
- スマートフォンでも使いやすいレスポンシブデザイン。
- 入力フォームの最適化（「次へ」ボタンでのスムーズな移動）。
- ホーム画面に追加すると、アイコンから全画面のアプリとして開けます（iPhone の Safari では共有ボタン →「ホーム画面に追加」）。

## 🚀 使い方

1. **ワイン名の入力**: 評価するワインの名前を入力します。
2. **点数の調整**: 必要に応じて点数を調整し、合計が10.00点になるようにします（合計が合うと緑色になります）。
3. **セットの活用**: 複数の投票部門がある場合は、横にスクロールしてSet 2, Set 3...を使用します。
4. **保存・出力**: 作業は自動保存されます。完了したら「結果を出力」から、感想と採点をまとめたメール用の文面やCSVを出力できます。入力内容を残しておきたい場合は「バックアップ」からファイルに保存できます。

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
- **Tasting Notes**: Each wine has a free-text notes field (color, aroma, palate, overall impression, etc.). Wines with the same name share the same note across all sets. Notes are included in CSV export and backups.
- **4 Voting Departments**: Manage up to 4 sets (Voting Departments) simultaneously without switching tabs.

### 💾 Data Management
- **Auto-Save**: Input is instantly saved to the browser's local storage. Data persists even after reloading.
- **Data Restoration**: Previous work state is automatically restored when reopening the page.
- **Reset Function**: Feature to clear all data and return to the initial state (with a confirmation dialog to prevent accidental deletion).
- **Backup**: Save all sets to a file (JSON) and load it later to restore your data. Useful in case of private browsing or cleared site data, or for moving data to another device or browser.

### 📤 Export & Share
- **Notes & Voting Summary**: Generate a text summarizing your notes and the scores for each set, then copy it or open it in your mail app.
- **CSV Download**: Download evaluation results as a CSV file.
- **Clipboard Copy**: Copy data in a format (TSV) that can be directly pasted into Excel or Google Sheets.
- **Wine Name Copy**: Copy wine names from other sets to save typing effort (selective copying available).
- **Privacy Protection**: Data is stored locally in your browser. No data is sent to external servers or accessible by the developer.

### 📱 Mobile Friendly
- Responsive design that works well on smartphones.
- Optimized input forms (smooth navigation with the "Next" button).
- Add it to your home screen to open it full-screen like an app (on iPhone Safari: Share → "Add to Home Screen").

## 🚀 How to Use

1. **Enter Wine Names**: Input the names of the wines you are evaluating.
2. **Adjust Scores**: Adjust scores as needed to ensure the total is 10.00 points (the total turns green when correct).
3. **Use Sets**: If you have multiple Voting Departments, scroll horizontally to use Set 2, Set 3, etc.
4. **Save & Export**: Work is auto-saved. When finished, use "Export Results" to get an email-ready summary of your notes and scores, or a CSV file. To keep your input, save it to a file with "Backup".

## 🛠 Tech Stack

- HTML5
- CSS3 (Vanilla CSS, Responsive Grid/Flexbox)
- JavaScript (Vanilla JS, LocalStorage API)
- Google Fonts (Inter, Outfit)

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
