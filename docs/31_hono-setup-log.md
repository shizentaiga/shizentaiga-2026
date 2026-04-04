# 31_hono-setup-log.md

# Hono フレームワーク導入と環境構築記録 (Phase 1)

**実施日**: 2026-04-05   
**担当者**: 清善 泰賀   
**ツールバージョン**: create-hono v0.19.4 / Vite v6.4.1   
**技術スタック**: Hono, Cloudflare Workers+Vite, Node.js (npm)

## 1. 概要
本プロジェクトの動的基盤として [Hono](https://hono.dev/) を採用し、Cloudflare 上で動作するフルスタック環境を構築する。TypeScript による厳密な型管理を導入し、将来的な決済・DB連携（Stripe / D1）の堅牢性を担保することを目的とする。

## 2. セットアップ手順 (実行ログ)

### 2.1 Hono プロジェクトの初期化
プロジェクトルート（`shizentaiga-2026`）にて、以下のコマンドを実行した。

```bash
# Hono の初期化（カレントディレクトリを指定）
npm create hono@latest .
```

**実際の選択プロセス:**
- **Target directory**: `.` (現在のディレクトリ)
- **Which template do you want to use?**: `cloudflare-workers+vite` (※)
- **Directory not empty. Continue?**: `Yes` (既存の `docs/` 等を保持)
- **Do you want to install project dependencies?**: `Yes`
- **Which package manager do you want to use?**: `npm`

※最新の `create-hono` では Vite 統合テンプレートが推奨されているため、当初予定の `cloudflare-pages` ではなく `cloudflare-workers+vite` を選択。

### 2.2 主要ディレクトリ構造の確認
初期化完了後、以下の構成で展開されたことを確認した。

- `src/index.tsx`: メインのエントリポイント（ロジック記述場所）
- `src/renderer.tsx`: Hono の JSX 描画定義
- `public/`: 静的ファイル（favicon.ico等）の配置場所
- `wrangler.jsonc`: Cloudflare 設定ファイル
- `vite.config.ts`: Vite ビルド設定ファイル
- `package.json`: 依存関係の定義

### 2.3 ローカル開発環境の起動確認
以下のコマンドでローカルサーバーを起動し、正常動作を確認した。

```bash
npm run dev
```

**動作確認詳細:**
- **起動時間**: 約1.8秒（Vite v6.4.1）
- **アクセス先**: `http://localhost:5173/` にて "Hello Hono!" の表示を確認。
- **操作メモ**: ターミナル上で **`Ctrl + C`** (Mac/Windows 共通) を押下することで、安全にサーバーを停止できることを確認済み。

## 3. Cloudflare Pages とのリポジトリ連携
Webブラウザで [Cloudflare Dashboard](https://dash.cloudflare.com/) にアクセスし、以下の設定を行う（予定）。

1. **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**
2. GitHub リポジトリ `shizentaiga-2026` を選択。
3. **Build settings**:
    - **Framework preset**: `Hono`
    - **Build command**: `npm run build`
    - **Build output directory**: `dist`
4. **Save and Deploy** をクリック。

## 4. 既存資産（静的HTML時代）の移植準備
Hono 環境への移行にあたり、以下の資産を順次 `public/` または `src/` へ移植する。

- `favicon.ico` → `public/`
- `style.css` → `src/style.css` (初期化時に自動生成されたものをベースに既存定義を統合)
- 構造化データ (JSON-LD) → `src/index.tsx` のヘッダー部へ実装
- `legal/index.html` → Hono のルーティング (`/legal`) として JSX 化

## 5. 実施後のフィードバックと修正点
- **テンプレートの変更**: 当初予定の単体 Pages テンプレートから、最新の Vite 統合版へ変更したことで、開発時のホットリロード（HMR）が非常に高速になった。
- **Git同期の完了**: `npm create` 後の初期状態を GitHub へプッシュ完了。
  - `git commit -m "feat: complete Hono setup and confirm local dev server"`
  - `13 files changed` が正常にリモートへ反映された。

---
**次なる課題**:
Hono の `index.tsx` 内で、既存の `index.html` および `legal/index.html` のセマンティックな構造を JSX として再定義し、外観とSEO性能を完全に再現する。