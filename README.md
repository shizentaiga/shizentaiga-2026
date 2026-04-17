# shizentaiga-2026

**清善 泰賀（Shizen Taiga）の次世代 Web サービス基盤。**

「つながりは、偶然から。」をコンセプトに、外部プラットフォームへの依存を解消し、Cloudflare エコシステムによるフルスタックな内製化を実現するプロジェクト。

---

## 🎯 プロジェクトの目的

| 目的 | 内容 |
|---|---|
| 決済・予約の内製化 | リザスト＋PayPal 構成から Stripe を活用した自社完結型システムへ移行 |
| 技術の刷新 | Hono (TypeScript) + Cloudflare Workers によるモダンな動的環境へ移行 |
| 安全な検証サイクル | プレビュー環境（`*.workers.dev`）を活用し、本番の安定性を担保した継続的開発 |
| データガバナンス | 顧客データ・予約履歴の自社管理と運用の透明性向上 |

---

## 🛠️ 技術スタック

| カテゴリ | 技術 |
|---|---|
| Framework | Hono v4.x (TypeScript) |
| Build Tool | Vite v6.x |
| Runtime | Cloudflare Workers（Vite 統合版） |
| Infrastructure | Cloudflare Network（DNS / WAF / Observability） |
| Database | Cloudflare D1（D1 Manager / SQL） |
| Payments | Stripe Checkout / Webhooks（Idempotent Implementation） |

---

## 📂 プロジェクト構成（Project Structure）

~~~
src/
├── index.tsx                # 【トップ】ルーティング・エントリポイント (Checkout /api 等)
├── renderer.tsx             # 【共通】HTML基盤・SEO・Tailwind
├── style.css                # 【外観】基本のリセット・フォント・共通変数
│
├── pages/                   # 【ページ構成】各画面のレイアウトとデータ統合
│   ├── Top.tsx / Services.tsx / Checkout.tsx / Success.tsx
│   └── Contact.tsx / Legal.tsx / Error.tsx
│
├── components/              # 【UI部品】
│   ├── Layout/              # 共通（Header, Footer, ConsultantSection 等）
│   ├── Booking/             # 予約フロー（Calendar, Slots, Plans 等）
│   └── Payment/             # 決済・コンタクト（StripeButton, ContactForm）
│
├── lib/                     # 【共有ロジック】
│   ├── calendar-logic.ts / slot-logic.ts / stripe-server.ts
│   └── id-utils.ts (ULID)
│
├── client/                  # 【ブラウザ側ロジック】Vite ビルド対象
│   └── stripe-client.ts / booking-interaction.ts
│
├── db/                      # 【データアクセス】
│   ├── schema.sql           # テーブル定義
│   ├── repositories/        # 関数化された DB 操作（booking-db.ts, plan-db.ts 等）
│   └── seeds/               # 初期データ（master, schedule, slots）
│
├── constants/               # 【静的定義】info.ts（価格、名称、定数）
└── _sandbox/                # 【検証エリア】実験場・単体テスト（00_admin 〜 14_db_flow）
~~~

> **Note**
> 本構成案は開発効率を最適化するため、柔軟に分割・統合される可能性があります。
> 実際のファイル配置が上記と一部異なる場合がある点をご留意ください。

---

## 📋 構成管理・運用ルール

| 項目 | 指針 |
|---|---|
| 分割のタイミング | 1ファイルが 150行超、または複数ページで同一 UI が必要になった際に検討 |
| 柔軟な運用 | スピード優先の局面では1ファイル完結を許容。新機能は `_sandbox` で検証後に移行 |
| スタイルの集約 | インラインスタイルが増えた場合は `style.css` へ抽出し PSI スコアを維持 |
| 依存関係 | `components/` は `lib/` の純粋なロジックのみに依存。ビジネスルールは `constants/` を参照 |

---

## 📂 ドキュメント体系（`docs/`）

本プロジェクトの設計思想・仕様・運用手順は `docs/` ディレクトリ内に集約されています。
詳細は当該フォルダ内の各 Markdown ファイルを参照してください。

- **戦略・計画**：プロジェクトマスタープラン、Grid Inventory Model 設計、予約システム構築計画
- **設計・仕様**：システムアーキテクチャ、プログラム詳細設計、DB クエリ設計、データベーススキーマ（ULID 規約）
- **外部連携**：Stripe 統合ガイド、Cloudflare 運用設定、各種構成ファイル仕様
- **運用・ログ**：緊急時の切り戻し手順、リポジトリ初期化手順、セットアップログ

---

## ⚠️ 緊急時・引き継ぎ重要事項

### 1. 緊急復旧（DR）

障害発生時は `docs/` 内の **緊急切り戻し運用手順書** を最優先で実行すること。

### 2. 環境変数（Secrets）

秘匿情報は Cloudflare Dashboard の **Settings > Variables** に格納。
ローカル開発時は `.dev.vars` を使用する。

### 3. デプロイ

~~~bash
npm run dev          # ローカル確認
npx wrangler deploy  # 本番反映（Cloudflare Workers）
~~~

### 4. データベース（D1）

スキーマ変更・確認は `docs/` 内の **データベーススキーマ資料** を参照。

---

## 🚀 開発ロードマップ（shizentaiga_db v3.0）

### Phase 1：基盤構築 & ドメイン移行（Done）

- [x] Hono + Vite 環境の初期化：パイプラインの確立
- [x] 本番ドメイン移行：`shizentaiga.com` の Workers 移行完了
- [x] ID・DB 規約の確立：D1 接続疎通と `id-utils.ts`（ULID）の導入

### Phase 2：コア機能実装 & 決済統合（Current）

「1日1タスク」を基準に、実装の堅牢性と証跡（Audit Trail）の確保を最優先。

#### 🔧 Step A：DB 基盤 & マスタ表示（Done）

- [x] D1 スキーマ刷新：`description` 追加、外部キー制約の厳格化
- [x] マスタデータ投入：店舗・プラン・スケジュールの初期化完了

#### 🧠 Step B：予約エンジン & ルーティング（Done）

- [x] 日時管理の統一：`date-fns` 導入（JST/UTC 管理の同期）
- [x] 動的スロット計算：稼働枠と予約済みデータの突合ロジック実装
- [x] ルーティング基盤の再整備：エラーページ確立とフロント・バック間の同期確認

#### 💳 Step C：決済連携 & 証跡の確保（Current）

- [x] Stripe SDK 導入：Checkout Session 作成の実装完了
- [ ] 決済成功ハンドリング：Webhook によるステータス自動更新（検証中）
- [ ] 非正規化スナップショット：確定時の価格・プラン名の永続化（監査証跡）
- [ ] 予約完了通知：Resend 連携による自動確認メール送信

### Phase 3：システム拡張

- [ ] 自動メンテナンス：Cron Triggers による期限切れ在庫の自動クリーンアップ
- [ ] プラットフォーム化：管理機能の統合と複数拠点対応への抽象化
- [ ] 知見の体系化：実装プロセスを通じたビジネス哲学の公開

---

## 💡 実装上の注意事項

| 原則 | 内容 |
|---|---|
| 単位の統一 | 時間操作はすべて `date-fns` を介し「分」で行う |
| 真実の口（SSOT） | 価格等は必ず `service_plans` テーブル（DB）を参照し、URL パラメータを信用しない |
| 証跡の不変性 | 予約確定後は、必要なデータを `reservations` 側にコピーして保持する |
| 安全なリリース | 新ロジックは `_sandbox` で十分に検証してから本番反映する |

---

*© 2026 Taiga Shizen.*