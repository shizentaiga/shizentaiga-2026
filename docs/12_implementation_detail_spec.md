# 02_詳細設計書 (Internal Implementation Detail) v1.2

**最終更新日**: 2026-04-07
**作成者**: 清善 泰賀

---

## 1. システム監視 (Observability & Reliability)

### 1.1 死活監視

| 項目 | 内容 |
|---|---|
| 監視ツール | Uptime Robot / Cloudflare Health Checks |
| 監視間隔 | 5分 |
| 検知内容 | HTTP 200系以外の応答、またはタイムアウト |

**監視対象**

| エンドポイント | 正常応答 | 目的 |
|---|---|---|
| `https://shizentaiga.com/` | 200 | Workers ルーティング異常の早期発見 |
| `https://shizentaiga.com/api/webhook` | 401 / 405 | Stripe 通知受取口の生存確認。決済不達リスクを最小化 |

### 1.2 ログ管理と例外検知

**ツール**: Cloudflare Workers Logs（Tail / Analytics）

| ログキー | 内容 |
|---|---|
| `D1_QUOTA_EXCEEDED` | データベース容量制限の監視 |
| `STRIPE_SIGNATURE_ERROR` | Webhook 署名検証失敗（セキュリティ警告） |
| `RECONCILIATION_LOG` | Cron Trigger による在庫修復実行ログ（5分間隔） |

---

## 2. Services.tsx における動的リンク生成ロジック

### 2.1 プラン選択時の DOM 操作仕様

ページリロードを発生させず、URLパラメータとUI状態をリアルタイムに同期させる。

~~~
[プランカード選択]
     |
     +--[単発・スポット]-->  カレンダーセクション: 表示
     |                       href 書き換え:
     |                       /api/checkout?plan=spot&date={date}&slot={slot}
     |
     +--[顧問契約]------->  カレンダーセクション: 非表示（または無効化）
                             href 強制変更:
                             /contact
~~~

**実装規約**

| 項目 | 規約 |
|---|---|
| href 書き換え | `URLSearchParams` を使用してパラメータを構築する |
| カレンダー制御 | `display:none` または `disabled` 属性で制御。CSSクラスの付け外しを推奨 |
| ボタン状態 | スロット未選択時は送信ボタンを `disabled` にし、誤送信を防止 |

### 2.2 サーバー側バリデーション（URLパラメータ改ざん対策）

クライアント側の `href` はユーザーが改ざん可能なため、**サーバー側で必ず再検証する**。

~~~
POST /api/checkout?plan=spot&date=2026-04-07&slot=slot_001
     |
     v
[Hono ハンドラ]
     |
     +-- plan  が BUSINESS_INFO に存在するか検証
     +-- slot  が D1 に存在し status='available' か検証
     +-- 金額  を BUSINESS_INFO から直接取得（URLの金額は一切参照しない）
     |
     +--[検証失敗]--> 400 Bad Request を返却
     |
     +--[検証成功]--> Stripe セッション生成へ進む
~~~

**重要**: 決済金額は必ず `constants/info.ts`（`BUSINESS_INFO`）から取得する。URLに金額パラメータを含めない設計を厳守する。

---

## 3. 自動更新・データ整合性制御

### 3.1 更新日時の管理ロジック

| 対象 | ソース | 規約 |
|---|---|---|
| サイト全体（静的） | `constants/info.ts` の最終更新 / ビルド時の `BUILD_TIME` | フッターに反映 |
| 予約枠（動的） | D1 の `slots.updated_at` | Unix Timestamp (Seconds) で管理 |

**時刻処理規約**: Workers 上での `new Date()` による比較は全て Unix Timestamp で行う。表示が必要な場合のみ `Asia/Tokyo` へオフセット変換する。

### 3.2 SEO & メタ情報制御 (`renderer.tsx`)

| 項目 | 仕様 |
|---|---|
| メタデータ受信 | `c.render(children, props)` 経由で各ページから動的に受信 |
| JST正規化 | 日付表示はサーバーサイドで `date_string`（YYYY-MM-DD）を生成し一貫性を保持 |
| パフォーマンス | LCP対象画像に `fetchpriority="high"` を付与し、エッジでのレンダリング速度を担保 |

---

## 4. インフラ・デプロイ詳細 (CI/CD)

### 4.1 デプロイパイプライン

| 環境 | トリガー | D1 接続先 |
|---|---|---|
| Preview | GitHub PR 作成時に自動生成される一時 URL | Preview Database（隔離環境） |
| Production | `main` ブランチ合流後に自動デプロイ | 本番 D1 インスタンス |

### 4.2 データベース（D1）運用ルール

- `src/db/schema.sql` の変更は、`wrangler d1 execute` によるローカル検証を経てから本番適用する。
- `tenant_id` インデックスの有効性を定期的に `EXPLAIN QUERY PLAN` で確認する。

---

## 5. 特記事項・運用ルール

| 項目 | 規約 |
|---|---|
| 決済整合性の死守 | Stripe `expires_at`（31分）と D1 `expires_at`（35分）の変更は、本ドキュメントと `03_stripe_integration_guide.md` を必ず同時更新する |
| 検証手順 | デプロイ後、プレビュー環境で「仮確保 → 決済キャンセル → 枠の自動開放」のライフサイクルを必ず確認する |
| 単一責任の原則 | ページ文言は `pages/`、ビジネスロジックは `lib/`、DB操作は `db/queries.ts` に集約する |
| 金額の参照元 | 決済金額は必ず `constants/info.ts` から取得する。URL・フォームの金額値は一切信頼しない |

## 6.メモ
・1. 指摘事項：カレンダーの「ダブルクリック（連打）」対策：予約ボタンが押下されたら、すぐにボタンをdisabledに変更する(連打によるエラー防止)

・2. カレンダーの「非表示」と「初期化」の挙動（2.1項）：顧問契約前にカレンダーをん選択していた場合は、選択状態をクリア

・3. Uptime Robot による Webhook 監視（1.1項）
https://shizentaiga.com/api/webhook に対して GET を送ると、Hono の実装上はおそらく 405 Method Not Allowed（POSTのみ許可しているため）

・4. LCP 画像の fetchpriority="high"（3.2項）
