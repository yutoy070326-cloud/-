# Lingo Reader — Claude Code 用メモ

好きな文章を貼って読み、タップで単語を調べて単語帳に保存し、忘却曲線で復習する、スマホ向け語学学習アプリ（Vite + React 19 / 素のCSS / バックエンドなし）。
全仕様は `SPEC.md`、履歴は `README.md`（v0.2〜v1.4）を参照。

## コマンド
- `npm install` → `npm run dev`（開発）/ `npm run build`（本番）。通知・PWA は https か localhost でのみ動作
- UI文言は日本語。変更時は既存の操作感（タップ／長押し／選択翻訳）を壊さないこと

## 守るルール
- 永続化は localStorage（`lingo-reader:*:v1` はバックアップ対象）。`lingo-reader-tutorial:v1` / `lingo-reader-notify:v1` / `lingo-reader-study:v1` / `lingo-reader-settings:v1`（色分け・詳しく見る等の設定。`src/lib/settings.js`）は端末設定でバックアップ対象外（意図的にハイフン区切り）
- 復習ロジックは `src/lib/srs.js` に集約（間隔 20分/1時間/1日/1週間/1か月、step5 で習得）
- 辞書・翻訳・AI物語は現状モック（`dictionary.js` `translate.js` `storyAI.js`）。実APIに差し替える場合も関数の形を維持
- 本物のWebプッシュは未実装（サーバー＋VAPID が必要）。現状は Service Worker の showNotification
- テストが無いので、変更時は Playwright で主要フロー（タップ→保存→復習→バックアップ）を確認すること
