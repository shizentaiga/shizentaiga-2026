# 02_詳細設計書 (Internal Implementation Detail)

本ドキュメントは、shizentaiga-2026 プロジェクトにおける各機能の具体的な実装仕様および運用監視ルールを定義する。

---

## 1. システム監視 (Observability)

### 1.1 死活監視 (Uptime Robot)
- **監視対象**: `https://shizentaiga.com/`
- **監視間隔**: 5分（推奨）
- **検知内容**: HTTPステータスコード 200 OK 以外の応答を異常として検知。
- **通知先**: 登録済みメールアドレス / 各種通知連携。
- **目的**: Cloudflare Workers のデプロイミスや、ドメインルーティングの異常を早期発見し、コンサルティングサービスの窓口停止時間を最小化する。

### 1.2 ログ管理
- **ツール**: Cloudflare Workers Logs (Tail)
- **用途**: デプロイ直後のランタイムエラーおよび、Stripe Webhook（予定）の実行ログ確認。

---

## 2. 自動更新・メタデータ制御

### 2.1 更新日時の自動更新（Last Updated Logic）
- **現状の仕様**: `constants/info.ts` または `pages/` 以下のコンポーネントにおける更新日時の自動反映を検討中。
- **実装ステータス**: 
  - 現在はソースコード上の静的記述（例: `© 2026`）が優先されている。
  - **将来的なスクリプト案**: GitHub Actions または Vite Build Hook を利用し、ビルド時に `env.LAST_MODIFIED` を注入し、フッター等に反映させるロジックを想定。
  - **課題**: Workers はエッジで動くため、`new Date()` は「リクエスト時間」を指す。サイトの「最終更新日」を表示するには、ビルド時のタイムスタンプを定数化する必要がある。

### 2.2 SEO & メタ情報制御 (renderer.tsx)
- **ロジック**: `c.render(children, props)` 経由で、各ページコンポーネントからメタデータを動的に受け取る。
- **フォールバック**: `props` が未指定の場合、`renderer.tsx` 内に定義された `defaultDesc` および `siteName` を採用する。
- **パフォーマンス**: 画像（LCP対象）に対し、`fetchpriority="high"` を付与することで、エッジコンピューティング環境下での表示速度を最大化している。

---

## 3. インフラ・デプロイ詳細 (CI/CD)

### 3.1 デプロイパイプライン
- **トリガー**: GitHub `main` ブランチへの Push。
- **環境分離**:
  - **Preview**: GitHub PR 作成時に自動生成される一時URL（`*.pages.dev` または `*.workers.dev`）。
  - **Production**: `main` 合流後に自動デプロイされる `shizentaiga.com`。

### 3.2 独自ドメインルーティング
- **プロバイダー**: Cloudflare
- **DNS設定**: `shizentaiga.com` の A/AAAA/CNAME レコードを Workers にプロキシ（オレンジ雲マーク）状態で接続。
- **SSL/TLS**: Cloudflare Edge Certificate (Full) により常時 HTTPS 化。

---

## 4. 特記事項・運用ルール

- **単一責任の原則**: 文言修正は `info.ts` または各 `pages/` ファイルに限定し、`index.tsx`（ルーティング）や `renderer.tsx`（基盤）の変更は慎重に行う。
- **検証手順**: GitHub 更新後、必ずプレビュー環境で `/legal` へのルーティングが生きているか、CSSが剥がれていないかを確認してから本番反映を確約する。

---
最終更新日: 2026-04-06
作成者: 清善 泰賀