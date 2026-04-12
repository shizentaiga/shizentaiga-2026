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

~~~
src/
├── index.tsx                # 【司令塔】ルーティング・エントリポイント
├── renderer.tsx             # 【共通の額縁】HTML基盤・SEO・外部資産管理
├── style.css                # 【外観】共通デザイン（Tailwind/独自クラス）
│
├── pages/                   # 【ページレイアウト】各画面の構成・データ統合
│   ├── Top.tsx
│   ├── Services.tsx         # サービス一覧・予約メイン（SSR/HTMX統合）
│   └── (Legal.tsx 等)
│
├── components/              # 【UI部品】再利用可能な純粋コンポーネント
│   ├── Booking/             # 予約フロー（CalendarSection, SlotList, PlanCard 等）
│   ├── Layout/              # 共通パーツ（Footer, ConsultantSection 等）
│   └── Stripe/              # ★今後追加：決済・Checkout関連コンポーネント
│
├── lib/                     # 【共有ロジック】計算・外部API連携の純粋関数
│   ├── calendar-logic.ts    # カレンダーの日付・曜日計算（date-fns活用）
│   ├── slot-logic.ts        # ★重要：予約枠確保・Expire判定アルゴリズム
│   └── stripe.ts            # Stripe Checkout 連携・署名検証ロジック
│
├── db/                      # 【データアクセス】D1 永続化層との通信
│   ├── schema.sql           # テーブル定義
│   ├── queries.ts           # SQLクエリの集約・管理
│   ├── seeds/               # 初期データ投入用SQLスクリプト群
│   └── (booking-db.ts 等)    # 各種DB操作関数
│
├── client/                  # 【ブラウザ側ロジック】HTMX外の補完的インタラクション
│   └── booking-interaction.ts
│
├── constants/               # 【静的定義】サービス価格・基本マスタデータ
└── _sandbox/                # 【検証エリア】機能別のサンドボックス・テスト実装群

public/                      # 【静的資産】
└── (favicon.ico, images 等)  ※ JS処理は原則 HTMX へ移行済み
~~~

[!NOTE]
※ 本構成案は、今後の機能拡張やソースコードの増大に伴い、開発効率を最適化するため柔軟に分割・統合される可能性があります。そのため、実際のファイル配置が上記と一部異なる場合がある点をご留意ください。

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
| ファイル名 | 内容 |
|---|---|
| `01_system_architecture.md` | システム構造・ディレクトリ設計・データフロー等の定義 |
| `02_implementation_detail.md` | 死活監視・自動更新・各コンポーネントの挙動等の詳細仕様 |
| `03_stripe_integration_guide.md` | 決済フローとセキュリティ・PCI DSS 準拠に関する設計 |

※プロジェクトの全容、設計、手順はすべて `/docs` フォルダ内に集約されています。

---
---

## ⚠️ 緊急時・引き継ぎ重要事項（ここだけは読む）

### 1. 緊急復旧 (DR)
障害発生時は [00-1_emergency_reboot_guide.md](./docs/00-1_emergency_rebert_guide.md) を最優先で実行してください。

### 2. 環境変数 (Secrets)
本番環境の秘匿情報は Cloudflare Dashboard の `Settings > Variables` に格納されています。
ローカル開発時は `.dev.vars` を使用します。

### 3. デプロイ
- `npm run dev`: ローカル確認
- `npx wrangler deploy`: 本番反映（Cloudflare Workers）

### 4. データベース (D1)
スキーマ変更や確認は [04_database_schema.md](./docs/04_database_schema.md) を参照。


## 🚀 開発ロードマップ（shizentaiga_db v2.6 準拠）

### Phase 1：基盤構築 & ドメイン移行（Done）
- [x] Hono + Vite 環境の初期化と GitHub 同期
- [x] shizentaiga.com 本番ドメインの Workers 移行完了
- [x] .gitignore / wrangler.json のセキュリティ強化
- [x] D1接続疎通と id-utils.ts (ULID規約) の確立

### Phase 2：コア機能実装 & 決済統合（Current）
「1日1タスク」を基準に、実装の堅牢性と証跡（Audit Trail）の確保を最優先。

#### 🔧 Step A：DB基盤の完成とマスタ表示
- [x] D1スキーマ刷新(v2.6)（description追加、外部キー制約設定）
- [x] マスタデータ投入（seed_01による店舗・プラン投入完了）
- [x] プラン一覧(/services)本番実装（test10のロジックを正規画面へ統合）

#### 🧠 Step B：予約エンジン・コアロジック
- [x] Day 4: date-fns 導入（JST/UTC管理とカレンダー生成語彙の統一）
- [ ] Day 5: 動的スロット計算（稼働枠と予約済みスロットの突合ロジック）
- [ ] Day 6: 仮確保(Pending)機能（expires_at による15分間の論理ロック実装）

#### 💳 Step C：決済連携 & 証跡の確保
- [ ] Day 7: Stripe SDK 導入（Checkout Session作成と処理ログの先行発行）
- [ ] Day 8: 決済成功ハンドリング（Webhookによる status='booked' への更新）
- [ ] Day 9: 非正規化スナップショット（予約確定時の価格・プラン名の永続化）
- [ ] Day 10: 予約完了通知（Resend 連携による自動メール送信）

#### 🔐 Step D：管理機能 & 公開準備
- [ ] Day 11: アクセス制限（Cloudflare Access による /admin 保護）
- [ ] Day 12: 統合疎通テスト（決済〜証跡保存〜通知までの一気通貫確認）

### Phase 3：システム拡張
- [ ] 複数拠点・複数業種対応の予約基盤への昇華
- [ ] Cron Triggers による期限切れ在庫クリーンアップの自動化
- [ ] 「つながりは、偶然から。」を体現する予約プラットフォームへの拡張

---

### 💡 実装上の注意事項
1. **単位の統一**: コード内の時間操作はすべて `date-fns` を介し「分」で行う。`* 60` 等の直接計算は禁止。
2. **真実の口（SSOT）**: 所要時間やバッファ、価格は必ず `service_plans` テーブルを参照し、URLパラメータに依存しない。
3. **証跡の不変性**: 予約確定後は、マスターが変更されても影響を受けないよう、必要なデータは `reservations`（または `slots`）側にコピーして保持する。
4. **論理ロックの優先**: TTL（15分消去）は、当初は「計算時の除外ロジック」として実装し、物理削除はPhase 3で対応する。

© 2026 Taiga Shizen.