# shizentaiga-2026

清善 泰賀（Shizen Taiga）の次世代 Web サービス基盤。  
「つながりは、偶然から。」をコンセプトに、外部プラットフォームへの依存を解消し、Cloudflare エコシステムによるフルスタックな内製化を実現するプロジェクト。

---

## 🎯 プロジェクトの目的

| 目的 | 内容 |
|---|---|
| 決済・予約の内製化 | リザスト＋PayPal 構成から Stripe を活用した自社完結型システムへ移行 |
| 技術の刷新 | Hono (TypeScript) + Cloudflare Workers によるモダンな動的環境へ移行 |
| 安全な検証サイクル | プレビュー環境（*.workers.dev）を活用し、本番の安定性を担保した継続的開発 |
| データガバナンス | 顧客データ・予約履歴の自社管理と運用の透明性向上 |

---

## 🛠️ 技術スタック

| カテゴリ | 技術 |
|---|---|
| Framework | [Hono](https://hono.dev/) v4.x (TypeScript) |
| Build Tool | Vite v6.x |
| Runtime | Cloudflare Workers (Vite 統合版) |
| Infrastructure | Cloudflare Network (DNS / WAF / Observability) |
| Database | Cloudflare D1 (D1 Manager / SQL) |
| Payments | Stripe Checkout / Webhooks (Idempotent Implementation) |

---

## 📂 ファイル構成 (Architecture)

修正時の参照ガイドとして活用すること。

~~~
src/
├── index.tsx               # 【司令塔】ルーティング・エントリポイント
├── renderer.tsx            # 【共通の額縁】HTML基盤・SEO・外部資産管理
├── style.css               # 【外観】共通デザイン・独自クラス (PSI対策済み)
│
├── pages/                  # 【ページ本体】各画面のレイアウトを記述
│   ├── Top.tsx             # トップページ
│   ├── Services.tsx        # ★ コンポーネントを組み合わせて画面を構築
│   ├── Legal.tsx           # 特定商取引法に基づく表記
│   └── Thanks.tsx          # 完了ページ
│
├── components/             # 【部品】再利用可能・または巨大化したパーツの切り出し
│   ├── Header.tsx          # 共通ナビゲーション
│   ├── Footer.tsx          # 共通フッター
│   ├── CalendarSection.tsx # ★新規：日時選択（グリッド描画・時間スロット表示）
│   ├── ServicePlanCard.tsx # ★新規：プラン選択の各カード
│   └── BookingFooter.tsx   # ★新規：画面下部の固定金額・予約ボタン
│
├── lib/                    # 【ロジック】計算・通信・外部API
│   ├── calendar-logic.ts   # カレンダーの日付・曜日計算
│   ├── google-cal.ts       # Google カレンダー連携
│   └── stripe.ts           # 決済処理
│
├── constants/              # 【静的データ】
│   └── info.ts             # サービス名・価格・住所・営業時間等のマスタ
│
└── db/                     # 【永続化】
    ├── schema.sql          # D1 テーブル定義
    └── queries.ts          # 予約データの CRUD 処理
~~~

---

## 📋 構成管理・運用ルール

| 項目 | 指針 |
|---|---|
| 分割のタイミング | 1ファイルが 150行超、または複数ページで同一UIが必要になった際に検討 |
| 柔軟な運用 | 本番トラブル対応・プロトタイプ作成等、スピード優先の局面では1ファイル完結を許容 |
| スタイルの集約 | インラインスタイルが増えた場合は `style.css` へクラスとして抽出し PSI スコアを維持 |
| 依存関係 | `components/` は `lib/` の純粋なロジックのみに依存。価格等のビジネスルールは `constants/info.ts` を参照 |

---

## 📂 ドキュメント体系 (`doc/`)

ファイル名は英語、内容は日本語で記述する。

| ファイル名 | 内容 |
|---|---|
| `00_project_master_plan.md` | 次世代基盤移行および決済内製化の全体計画書 |
| `00-2_project_reserve_plan.md` | v1.8 予約決済基盤の「正典」設計図 |
| `01_system_architecture.md` | システム構造・ディレクトリ設計・データフロー等の定義 |
| `02_implementation_detail.md` | 死活監視・自動更新・各コンポーネントの挙動等の詳細仕様 |
| `03_stripe_integration_guide.md` | 決済フローとセキュリティ・PCI DSS 準拠に関する設計 |
| `11_phase1_completion_report.md` | 基盤構築および本番ドメイン移行完了報告書 |
| `90_development_log.md` | 開発・検証の作業記録・デバッグログ（内部用） |

---

## 🚀 開発ロードマップ

### Phase 1：基盤構築 & ドメイン移行（Done）

- [x] Hono + Vite 環境の初期化と GitHub 同期
- [x] shizentaiga.com 本番ドメインの Workers 移行完了
- [x] `.gitignore` および `wrangler.json` のセキュリティ強化

### Phase 2：公式 HP 改善 & サービス実装（Current）

- [x] プレビュー URL（*.workers.dev）を活用した安全な検証フローの運用
- [x] アーキテクチャの刷新（`renderer.tsx` / `info.ts` の導入）
- [x] メール送信のテスト（Resend）
- [ ] プラン一覧ページ（`/services`）の動的表示実装
- [ ] D1 による予約枠の仮確保・在庫管理ロジックの実装
- [ ] Stripe Checkout による決済ボタンの実装とテスト
- [ ] 管理者導線（`/admin`）・認証基盤（Google ログイン + Cloudflare Access 連携）

### Phase 3：Aletheia システム開発（独立プロジェクト）

- [ ] 「つながりは、偶然から。」を体現する検索・予約・決済プラットフォームの構築
- [ ] D1 データベースを用いた複数拠点・複数業種対応基盤の実装
- [ ] Webhook による自動通知システムの統合

---

© 2026 Taiga Shizen.