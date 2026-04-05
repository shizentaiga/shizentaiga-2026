# 02_詳細設計書 (Internal Implementation Detail) v1.1

本ドキュメントは、shizentaiga-2026 プロジェクトにおける各機能の具体的な実装仕様、および「Aletheia Core v1.8」に基づく運用監視ルールを定義する。

---

## 1. システム監視 (Observability & Reliability)

### 1.1 死活監視 (Uptime Robot / Cloudflare Health Checks)
- **監視対象**: 
  - メインサイト: `https://shizentaiga.com/`
  - Webhookエンドポイント: `https://shizentaiga.com/api/webhook` (POST 401/405応答を正常として監視)
- **監視間隔**: 5分
- **検知内容**: HTTPステータス 200系以外の応答、またはタイムアウト。
- **目的**: 
  - Cloudflare Workers のルーティング異常の早期発見。
  - Stripeからの通知受取口（Webhook）の生存確認。決済不達リスクを最小化する。

### 1.2 ログ管理と例外検知
- **ツール**: Cloudflare Workers Logs (Tail / Analytics)
- **監視項目**:
  - `D1_QUOTA_EXCEEDED`: データベース容量制限の監視。
  - `STRIPE_SIGNATURE_ERROR`: Webhook署名検証失敗のログ（セキュリティ警告）。
  - `RECONCILIATION_LOG`: 5分間隔のCron Triggerによる在庫修復実行ログ。

---

## 2. 自動更新・データ整合性制御

### 2.1 更新日時の管理ロジック
- **サイト全体（静的）**: `constants/info.ts` の最終更新、またはビルド時の `process.env.BUILD_TIME` をフッターに反映。
- **予約枠（動的）**: D1 内の `slots.updated_at` に基づく。
- **実装規約**: 
  - Cloudflare Workers 上で `new Date()` を取得する際、比較計算はすべて **Unix Timestamp (Seconds)** で行う。
  - 表示用の変換が必要な場合のみ、`Asia/Tokyo` タイムゾーンへオフセット加算を行う。

### 2.2 SEO & メタ情報制御 (renderer.tsx)
- **ロジック**: `c.render(children, props)` 経由で各ページからメタデータを動的に受信。
- **JST正規化**: 予約確認画面等の日付表示において、サーバーサイドで `date_string`（YYYY-MM-DD）を生成し、一貫性を保持する。
- **パフォーマンス**: LCP対象画像への `fetchpriority="high"` 付与を継続し、エッジでのレンダリング速度を担保。

---

## 3. インフラ・デプロイ詳細 (CI/CD)

### 3.1 デプロイパイプライン
- **環境分離**:
  - **Preview**: GitHub PR 作成時に自動生成される一時URL。D1は `Preview Database`（隔離環境）を使用。
  - **Production**: `main` ブランチ合流後に自動デプロイ。本番用 D1 インスタンスに接続。

### 3.2 データベース（D1）運用ルール
- **マイグレーション**: 
  - `src/db/schema.sql` の変更は、必ず `wrangler d1 execute` によるローカル検証を経てから本番適用する。
  - `tenant_id` インデックスの有効性を定期的に `EXPLAIN QUERY PLAN` で確認する。

---

## 4. 特記事項・運用ルール

- **決済整合性の死守**: 
  - Stripeの `expires_at` (31分) と D1の `expires_at` (35分) の設定変更は、必ず本ドキュメントと `03_stripe_integration_guide.md` の両方を更新した上で行う。
- **検証手順**: 
  - デプロイ後、必ずプレビュー環境で「仮確保 -> 決済キャンセル -> 枠の自動開放」のライフサイクルが正常に回るかを確認する。
- **単一責任の原則**: 
  - ページ文言は `pages/`、ビジネスロジックは `lib/`、DB操作は `db/queries.ts` に集約し、スパゲッティコード化を防ぐ。

---
最終更新日: 2026-04-06
作成者: 清善 泰賀