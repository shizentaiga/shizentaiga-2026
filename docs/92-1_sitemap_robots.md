# メタファイル（Sitemap / Robots）運用ガイドライン

---

## 1. 前提条件とシステム構成

| 項目 | 内容 |
|---|---|
| スタック | Hono + Vite + Cloudflare Workers |
| ビルド成果物 | `dist/client/`（Cloudflare の公開ルート） |
| モジュール方式 | ES Modules（`"type": "module"`） |

---

## 2. 設定と自動更新の流れ

手動更新による漏れを防ぐため、ビルドパイプラインに組み込まれた**自動生成方式**を採用する。

### ① 自動生成スクリプト（`scripts/generate-meta.cjs`）

| 項目 | 内容 |
|---|---|
| 役割 | 実行時の日付を `lastmod` にセットし、ファイルを生成する |
| 拡張子が `.cjs` の理由 | プロジェクトが ESM 形式のため、CommonJS として明示する必要がある |
| 出力先 | `dist/client/` に直接書き出す |

### ② ビルドパイプラインへの統合（`package.json`）

`build` コマンドに連結することで、更新忘れというヒューマンエラーを物理的に排除する。

~~~json
{
  "build": "vite build && node ./scripts/generate-meta.cjs"
}
~~~

---

## 3. ローカル環境と本番環境の違い

| 項目 | ローカル（Vite Dev） | 本番（Cloudflare） |
|---|---|---|
| 配信の仕組み | Vite 開発サーバー | Cloudflare エッジ配信（アセット機能） |
| 参照ルート | プロジェクトのルートディレクトリ | `dist/client/` ディレクトリ |
| Hono との関係 | ソースコードの変更が必要な場合あり | Hono を介さずエッジで直接配信 |

**⚠️ 注意**: `wrangler.json` の `assets` 設定により、`dist/client/` 内のファイルは Cloudflare のエッジで直接配信される。もし Hono のルート定義（`app.get('/sitemap.xml', ...)`）が存在する場合、**Hono 側のロジックが優先される可能性がある**ため、ルート定義の重複に注意すること。

---

## 4. 不具合発生時の切り分けフロー

本番環境で「ファイルが見つからない」「更新されていない」場合は、以下の順でチェックする。

### STEP 1：物理ファイルとパスの確認

- [ ] ビルド後、`dist/client/sitemap.xml` が存在するか
- [ ] `scripts/generate-meta.cjs` の書き出し先が `dist/client/` になっているか

### STEP 2：コンテンツの整合性チェック

- [ ] `robots.txt` の末尾に `Sitemap: https://shizentaiga.com/sitemap.xml` が正しく記述されているか
- [ ] `lastmod` が UTC になっていないか

**タイムゾーン補足**: GitHub Actions 等のビルド環境では UTC になる場合がある。JST を厳密に保証する場合は、スクリプト内で時差計算（+9時間）を明示すること。

~~~javascript
// JST 固定での日付生成例
const jstDate = new Date(Date.now() + 9 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);
~~~

### STEP 3：配信設定の確認

- [ ] `wrangler.json` の `assets.directory` が `./dist/client` を指しているか
- [ ] ターミナルに `[SUCCESS] Meta files generated...` のログが出ているか

---

## 5. 運用上のメリット

| 項目 | 内容 |
|---|---|
| リスク管理 | 切り分けフローを手順化しているため、万が一の際も迅速な復旧が可能 |
| 効率化 | `package.json` でビルドと生成をセットにし、更新作業という概念そのものをなくす |

---

## 6. 懸念事項・注意点

### ⚠️ CI/CD 環境でのタイムゾーン

GitHub Actions 等のクラウドビルド環境はデフォルトで UTC のため、
`lastmod` が意図せず前日付になるケースがある。
スクリプト内での +9時間補正を**必ず実装し、ローカルとCI環境の両方で動作確認**すること。

### ⚠️ Hono ルート定義との競合

`app.get('/sitemap.xml', ...)` のようなルートが Hono 側に存在すると、
エッジ配信より Hono のロジックが優先される。
**メタファイルは静的ファイルとして配信することを前提とし、Hono 側にルート定義を置かない**設計を徹底する。

### ⚠️ `dist/client/` の Git 管理

ビルド成果物を `.gitignore` で除外している場合、
`sitemap.xml` と `robots.txt` はデプロイ時にビルドが走らないと生成されない。
CI/CD パイプライン（GitHub Actions 等）で `npm run build` が確実に実行される構成になっているか確認すること。