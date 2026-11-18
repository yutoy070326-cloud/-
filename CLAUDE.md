# Lingo Reader — Claude Code 用メモ

好きな文章を貼って読み、タップで単語を調べて単語帳に保存し、忘却曲線で復習する、スマホ向け語学学習アプリ（Vite + React 19 / 素のCSS / バックエンドなし）。
全仕様は `SPEC.md`、履歴は `README.md`（v0.2〜v1.4）を参照。

## コマンド
- `npm install` → `npm run dev`（開発）/ `npm run build`（本番）。通知・PWA は https か localhost でのみ動作
- UI文言は日本語。変更時は既存の操作感（タップ／長押し／選択翻訳）を壊さないこと

## 守るルール
- 永続化は localStorage（`lingo-reader:*:v1` はバックアップ対象）。`lingo-reader-tutorial:v1` / `lingo-reader-notify:v1` / `lingo-reader-study:v1` / `lingo-reader-settings:v1`（色分け・詳しく見る等の設定。`src/lib/settings.js`）/ `lingo-reader-session:v1`（今回の学習の開始時刻とキャラクター）は端末設定でバックアップ対象外（意図的にハイフン区切り）
- 達成ノート・メダルは `lingo-reader:notes:v1` / `lingo-reader:medals:v1`、山の並び順・積み木・スタンプは `lingo-reader:shelf:v1`（いずれもバックアップ対象。`src/lib/diary.js` `src/lib/shelf.js`）
- Playwright でログインボーナスのモーダル（`login-bonus` / `bonus-close`）が起動時に出ることがある
- 起動時はスタート画面（トグル）→開始演出。「学習を終える」で達成ノート→メダル→お見送り。Playwright で確認するときは `gate-switch` をクリックし `intro-skip` で進める
- 多言語対応: `t('key', '日本語の文言', {params})`（`src/lib/i18n.js`）。日本語はソースの文言、英語などは `src/locales/<言語>.js`。言語を足すときは locales にファイルを作り i18n.js に登録。いま英語化済みは、ホーム・設定・ライブラリ・ノート・メダル・スタンプ・各画面の使い方・前後移動。単語帳・復習・リーダー・登録フォーム等の本文は日本語のまま（順次 t() 化）
- 設定の「データのリセット」（`src/lib/reset.js`）は学習データ系のキーだけを消す（設定・使い方の既読は残す）。学習データ用の新しい localStorage キーを足したら `LEARNING_KEYS` にも足すこと
- 画面ごとの使い方は `src/lib/tutorials.js`（初回は必ず表示、`lingo-reader-tutorial-seen:v1`）
- 復習ロジックは `src/lib/srs.js` に集約（間隔 20分/1時間/1日/1週間/1か月、step5 で習得）
- 辞書・翻訳・AI物語は現状モック（`dictionary.js` `translate.js` `storyAI.js`）。実APIに差し替える場合も関数の形を維持
- 本物のWebプッシュは未実装（サーバー＋VAPID が必要）。現状は Service Worker の showNotification
- テストが無いので、変更時は Playwright で主要フロー（タップ→保存→復習→バックアップ）を確認すること
