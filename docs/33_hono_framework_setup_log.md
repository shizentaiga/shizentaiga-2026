# 31_hono-setup-log.md

# Hono フレームワーク導入と環境構築記録 (Phase 1)

**実施日**: 2026-04-05  
**担当者**: 清善 泰賀  
**ツールバージョン**: create-hono v0.19.4 / Vite v6.4.1  
**技術スタック**: Hono, Cloudflare Workers + Vite, Node.js (npm)

## 1. 概要
本プロジェクトの動的基盤として [Hono](https://hono.dev/) を採用し、Cloudflare Workers 上で動作するフルスタック環境を構築した。既存の静的資産（HTML/CSS/画像）を継承しつつ、TypeScript による型安全な運用への移行を完了した。

## 2. セットアップ手順と実施ログ

### 2.1 Hono プロジェクトの初期化
プロジェクトルート（`shizentaiga-2026`）にて初期化を実施。

```bash
npm create hono@latest .
```

- **Template**: `cloudflare-workers+vite` を選択。
- **成果物**: `src/index.tsx`, `vite.config.ts`, `wrangler.jsonc` 等の基盤ファイルが生成された。

### 2.2 既存資産の再配置（Migration）
Vite の仕様に合わせ、静的ファイルを `public/` ディレクトリへ集約した。

- `public/`: `style.css`, `favicon.ico`, `images/`, `legal/`
- **ポイント**: 全ての内部リンクを `/style.css` のように「絶対パス（スラッシュ開始）」へ統一し、階層構造の変化に強い設計とした。

### 2.3 ローカル開発サーバーの起動確認
```bash
npm run dev
```
- **Local Access**: `http://localhost:5173/` にて動作確認。
- **操作メモ**: `Ctrl + C` (Mac/Windows 共通) で安全に停止できることを確認。

## 3. Cloudflare へのデプロイとテストドメイン発行

### 3.1 プレビュー環境の構築
ターミナルより Cloudflare Workers へのデプロイを実行。

```bash
npx wrangler deploy
```

- **テストドメイン**: `https://shizentaiga-2026.tshizen2506.workers.dev/`
- **Build Settings**: 最新の Cloudflare 環境では `Hono` / `npm run build` / `dist` 等の設定が自動最適化されており、手動選択なしで正常にビルド・デプロイが完了した。

### 3.2 運用上の留意点（認証トラブルシューティング）
Cloudflare へのログイン時、およびデプロイ時のワンタイムパスワード（OTP）認証において以下の事象を確認。
- **事象**: 同一デバイスの別タブでメールを確認しようとすると、セッションが切り替わり認証がリセットされる場合がある。
- **対策**: PCで認証画面を開き、スマートフォン等の別端末でメール（OTPコード）を確認することで、ブラウザのタブ切り替えを回避し、確実に認証を完了させる。

## 4. 実施後のフィードバック
- **メタタグの修正**: X（旧Twitter）用のメタタグ誤記を修正し、各リンクから Markdown 形式の不要な記号（`[]()`）を完全に除去。
- **アクセシビリティの調整**: LinkedIn リンクがログイン必須であったため、ユーザー体験を優先し、表示上のリンクからは除外（構造化データ内には本人証明として保持）。
- **デプロイの成功**: 手書き修正後の `src/index.tsx` が、エッジ環境（Workers）上でも CSS や画像を正しく読み込んでいることを確認。

---
**次なる課題（Phase 2）**:
1. **本番ドメイン（shizentaiga.com）の切り替え**: 既存の Pages プロジェクトから、新 Workers プロジェクトへのドメイン移行。
2. **ルーティングの拡張**: `/legal` ページの JSX 化による、完全な動的サイトへの移行。