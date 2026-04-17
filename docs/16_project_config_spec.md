# プロジェクト構成ファイル定義書 (JSON Settings)

このドキュメントは、コメントを記述できない各JSONファイルの設定意図を記録したものです。

---

## 1. package.json
プロジェクトの依存関係と実行スクリプトを定義します。

| 項目 | 設定値 / 意図 |
| :--- | :--- |
| `type` | `module` : モダンなES Modules（import/export）を使用するために必須です。 |
| `scripts.dev` | `vite` : ローカル開発環境を起動します。ホットリロードが有効です。 |
| `scripts.deploy` | `vite build` 後に `wrangler deploy` を実行。ビルド成果物をCloudflareへ転送します。 |
| `dependencies` | `hono` : Webフレームワークの本体です。 |
| `devDependencies` | `vite`, `wrangler` : 開発時のみ使用するビルドツールおよびデプロイツールです。 |

---

## 2. tsconfig.json
TypeScriptのコンパイルルールを定義します。

| 項目 | 設定値 / 意図 |
| :--- | :--- |
| `target / module` | `ESNext` : 最新のJavaScript仕様で出力し、Cloudflareランタイムの性能を最大化します。 |
| `moduleResolution` | `Bundler` : Viteなどのモダンなツールに適したモジュール解決方式です。 |
| `strict` | `true` : 厳格な型チェックを行い、実行時のバグを未然に防ぎます。 |
| `jsx` | `react-jsx` : JSX記法を使用可能にします。 |
| `jsxImportSource` | `hono/jsx` : Reactではなく、Hono独自の軽量なJSXエンジンを使用するよう指定しています。 |

---

## 3. wrangler.json
Cloudflareのインフラ設定を定義します。

| 項目 | 設定値 / 意図 |
| :--- | :--- |
| `compatibility_date` | `2026-04-01` : 使用するランタイムのバージョンを固定し、将来のアップデートによる破壊的変更を防ぎます。 |
| `assets` | `./dist` : ビルドされた静的ファイル（CSS/画像）の配信元ディレクトリです。 |
| `routes` | `shizentaiga.com` : 本番ドメインの紐付け設定です。 |
| `observability` | `enabled: true` : Cloudflareダッシュボードで詳細なエラーログや統計を確認可能にします。 |

---

## 運用上の注意
- **JSONの直接編集**: JSONファイル内にコメント（`//` や `/* */`）を記述するとビルドエラーが発生します。変更が必要な場合は、まずこのドキュメントを更新し、整合性を確認してからJSON本体を書き換えてください。
- **依存関係の更新**: `npm update` 等を実行した際は、`package.json` のバージョン番号の変化を確認してください。