# 31_hono-setup-log.md

# Hono フレームワーク導入と環境構築記録 (Phase 1)

**実施日**: 2026-04-05

**担当者**: 清善 泰賀

**技術スタック**: Hono, Cloudflare Pages, Node.js (npm)

## 1. 概要
本プロジェクトの動的基盤として [Hono](https://hono.dev/) を採用し、Cloudflare Pages 上で動作するフルスタック環境を構築する。TypeScript による厳密な型管理を導入し、将来的な決済・DB連携の堅牢性を担保する。

## 2. セットアップ手順 (実行ログ)

### 2.1 Hono プロジェクトの初期化
プロジェクトルート（`shizentaiga-2026`）にて、以下のコマンドを実行する。

```bash
# Hono の初期化（カレントディレクトリを指定）
npm create hono@latest .
```

**選択肢の指定:**
- **Target directory**: `.` (現在のディレクトリ)
- **Which template do you want to use?**: `cloudflare-pages`
- **Do you want to install project dependencies?**: `yes`
- **Which package manager do you want to use?**: `npm`

### 2.2 ディレクトリ構造の確認
初期化完了後、以下の構成になっていることを確認する。

- `src/index.tsx`: メインのエントリポイント（ロジック記述場所）
- `public/`: 静的ファイル（画像、既存のstyle.css等）の配置場所
- `wrangler.jsonc` (または `wrangler.toml`): Cloudflare の設定ファイル
- `package.json`: 依存関係の定義

### 2.3 ローカル開発サーバーの起動
以下のコマンドで、ローカル環境（`http://localhost:5173` 等）で Hello Hono! が表示されるか確認する。

```bash
npm run dev
```

## 3. Cloudflare Pages とのリポジトリ連携
Webブラウザで [Cloudflare Dashboard](https://dash.cloudflare.com/) にアクセスし、以下の設定を行う。

1. **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**
2. GitHub リポジトリ `shizentaiga-2026` を選択。
3. **Build settings**:
   - **Framework preset**: `Hono` (自動認識されない場合は手動選択)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. **Save and Deploy** をクリック。

## 4. 既存資産（静的HTML時代）の移植準備
Hono 環境への移行にあたり、以下のファイルを順次 `public/` または `src/` へ移植する。

- `favicon.ico` → `public/`
- `style.css` → `public/` (または CSS-in-JS への変換検討)
- 構造化データ (JSON-LD) → `src/index.tsx` のヘッダー部へ実装

## 5. 実施後のフィードバックと修正点
*(ここに実行時のエラーや、設定の変更箇所を追記する)*

---
**次なる課題**:
Hono の `index.tsx` 内で、既存の `index.html` のセマンティックな構造を JSX として再定義し、外観を完全に再現する。