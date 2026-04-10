# システム全体設計書 (System Architecture Design)

**プロジェクト名**: shizentaiga-2026  
**設計者**: 清善 泰賀  

---

## 1. 設計思想と技術選定

### 1.1 基本思想

| 思想 | 内容 |
|---|---|
| Edge First | Cloudflare のエッジネットワークで処理を完結させ、レイテンシを最小化 |
| JavaScript 最小化 | HTMX による部分更新を採用し、クライアント側のコード複雑性を排除 |
| 型安全 | TypeScript を全レイヤーで統一し、仕様変更の影響範囲を型で明確化 |

### 1.2 技術スタック

| レイヤー | 技術 | 役割・特徴 |
|---|---|---|
| Core Language | TypeScript | 全レイヤーで型安全性を担保。仕様変更時の影響範囲を明確化 |
| Runtime | Cloudflare Workers + Hono | エッジ環境で動作する軽量 Web フレームワーク |
| Rendering | Hono JSX（SSR） | サーバーサイドで型安全に HTML を生成。SEO と初期表示速度を最適化 |
| Dynamic UI | HTMX | HTML 拡張による部分更新。JS 依存を最小化し、SPA 不使用 |
| Styling | Tailwind CSS | ユーティリティファーストによる高速・一貫性のある UI 実装 |
| Database | Cloudflare D1（SQLite） | Workers と高い親和性を持つサーバーレス RDB |
| Payments | Stripe Checkout / Webhooks | 決済処理と Webhook による非同期な整合性担保（冪等性対応） |
| Email | Resend | トランザクションメール（予約確認・通知）を高到達率で配信 |

### 1.3 レイヤー構成図

~~~
Browser
  │
  │  HTML + HTMX（部分更新）
  ▼
Cloudflare Workers（Edge Runtime）
  │
  ├── Hono（ルーティング・ミドルウェア）
  │      └── Hono JSX（SSR・HTML生成）
  │
  ├── Cloudflare D1（SQLite）      ← 予約枠・冪等性管理
  │
  ├── Stripe（Checkout / Webhook） ← 決済・非同期整合性
  │
  └── Resend                       ← トランザクションメール
~~~

---

## 2. 技術選定の補足（Rationale）

### Hono JSX（SSR）を選んだ理由

React 等のクライアントサイドレンダリングを採用せず、サーバー側で HTML を完成させて返す。
初期表示の高速化・SEO 対応・クライアント側の JS バンドルサイズ削減を同時に実現する。

### HTMX を選んだ理由

予約フローのような「部分的な画面更新」に SPA は過剰である。HTMX により、複雑な JavaScript ロジックを記述することなく動的な UI を実現し、フレームワークの寿命に左右されない長期的な保守コストの低減を図る。

### Tailwind CSS を選んだ理由

独自の CSS ファイル肥大化を防ぎ、HTML クラス名のみで一貫性のあるデザインを完結させる。
レンダリングをブロックする CSS の読み込みを最小限に抑え、PSI スコアの維持と開発スピードを両立する。

### Stripe Webhook + 冪等性対応

決済通知は非同期で届くため、ネットワーク障害や重複配信への耐性が不可欠である。
`processed_events` テーブルによる冪等性管理を行い、二重予約等の致命的な整合性エラーを技術的に封鎖する。

---

## 3. ソフトウェア設計

### 3.1 URL Schema（URL-Driven Architecture）

状態管理をサーバーセッションに依存させず、URL パラメータで引き回す。
在庫がプランに縛られないため、オフセット（開始位置）を考慮した設計とする。

~~~
/services?plan={plan_id}&slot={slot_id}&offset={minutes}
~~~

| パラメータ | 型 | 用途 |
|---|---|---|
| `plan` | string | プラン識別子（`service_plans` の PK） |
| `slot` | string | 在庫枠識別子（`slots` の PK） |
| `offset` | number | 枠の開始地点から何分後に予約を開始するか（スライディング・ブロック対応） |

### 3.2 外部連携の方針

Google カレンダー連携については今後の検討課題とする。当面は、管理者による DB 操作（SQL）または管理画面からの入力によって予約枠の投稿・在庫管理を行う運用とする。

---

## 4. データベース設計（Cloudflare D1）

### 4.1 主要テーブル構成（v1.8 案）

**`service_plans`（プラン定義）**

| カラム名 | 内容 |
|---|---|
| `id` (PK) | プラン識別子 |
| `service_duration` | 所要時間（分） |
| `buffer_duration` | 前後バッファ（分） |
| `price` | 販売価格 |

**`slots`（在庫・予約管理）**

| カラム名 | 内容 |
|---|---|
| `id` (PK) | 枠識別子 |
| `date_string` (INDEX) | JST 日付（`YYYY-MM-DD`） |
| `start_at_unix` | 枠の開始点（Unix Timestamp） |
| `slot_duration` | 枠全体の長さ（分） |
| `status` | `available` / `pending` / `booked` |
| `last_event_id` | 最後に処理した Stripe Event ID |
| `updated_at` | 最終更新日時（順序制御用） |

---

## 5. 決済・予約整合性ロジック

### 5.1 タイムスロット制御

| 項目 | 内容 |
|---|---|
| アトミック更新 | DB 更新時は `WHERE status='available'` を条件とし、エッジ環境での競合を防止 |
| 期限管理 | DB 仮確保期限（35分）を Stripe セッション期限（31分）より長く設定し、Stripe 側の失効が先行することを保証 |

### 5.2 Webhook 異常系への対応

Stripe Webhook については、成功・失効イベントの逆転到達など、あらゆる異常パターンがあり得る。
実装時に `updated_at` による順序保証等の統一的なガードロジックを検討・集約し、整合性を死守する。

---

## メモ（実装時の確認事項）

- `offset` パラメータはスライディング・ブロック対応の設計だが、初期リリースでは固定値運用も可。複雑化する前に動作確認を優先する。
- `service_plans` テーブルは現段階では `constants/info.ts` で代替できる。DB 化は予約フローが安定してから検討で十分。
- `last_event_id` による順序保証は Webhook 異常系の対策として有効だが、`updated_at` との併用ロジックは実装時に一本化すること。
- `slots` テーブルに `tenant_id` が含まれていない。

---

© 2026 Taiga Shizen.