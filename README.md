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

## 📂 プロジェクト構成 (Project Structure)

~~~
src/
├── index.tsx                # 【トップ】ルーティング・エントリポイント (Checkout /api 等の口も定義)
├── renderer.tsx             # 【共通】HTML基盤・SEO・Tailwind
├── style.css                # 【外観】基本のリセット・フォント・共通変数
│
├── pages/                   # 【ページ構成】各画面のレイアウトとデータ統合
│   ├── Top.tsx              # ランディングページ
│   ├── Services.tsx         # 予約システムメイン（入口）
│   ├── Checkout.tsx         # 【重要】確認画面の頂点。決済 or 相談の分岐司令塔
│   └── Success.tsx          # 決済完了後・送信完了後のサンクスページ
│
├── components/              # 【UI部品】
│   ├── Layout/              # 全画面共通（Header, Footer等）
│   ├── Booking/             # 予約フロー専用
│   │   ├── Calendar/        # カレンダー関連部品
│   │   ├── Slots/           # 時間枠選択部品
│   │   ├── Plans/           # サービスプラン選択部品
│   │   └── CheckoutPreview.tsx # 【新設】選択された日時・プランの最終確認表示
│   ├── Payment/             # 決済・コンタクトUI専用
│   │   ├── StripeEmbedded.tsx  # [開発中] Stripe Elements/Checkoutの埋め込みUI
│   │   ├── CheckoutButton.tsx  # Stripe決済開始トリガー
│   │   └── ContactForm.tsx     # 【新設】要相談時専用の入力フォーム
│   └── UI/                  # 原子：ボタン、バッジ、入力欄など最小単位
│
├── lib/                     # 【共有ロジック】
│   ├── calendar-logic.ts    # カレンダー計算
│   ├── slot-logic.ts        # 予約枠・在庫計算
│   ├── stripe-server.ts     # サーバーサイド決済処理（Secret Key使用、Webhook等）
│   └── mail-server.ts       # [予定] 相談メール送信ロジック
│
├── client/                  # 【ブラウザ側ロジック】ViteでビルドされるJS
│   ├── stripe-client.ts     # Stripe.jsの初期化、Frontendでの決済ハンドリング
│   └── form-handler.ts      # コンタクトフォームのバリデーション等
│
├── db/                      # 【データアクセス】
│   ├── schema.sql           # D1テーブル定義
│   ├── queries.ts           # SQL文の一括管理
│   ├── repositories/        # 関数化されたDB操作
│   └── seeds/               # テスト・初期データ
│
├── constants/               # 【静的定義】価格、サービス名、デザイン定数
└── _sandbox/                # 【検証エリア】実験場・単体テスト
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


# 🚀 開発ロードマップ（shizentaiga_db v3.0）

「つながりは、偶然から。」を体現する、哲学的かつ堅牢な予約プラットフォームの構築。

---

### Phase 1：基盤構築 & ドメイン移行（Done）
- [x] **Hono + Vite 環境の初期化**: GitHub 同期と開発パイプラインの確立
- [x] **本番ドメイン移行**: shizentaiga.com の Workers 移行完了
- [x] **セキュリティ強化**: `.gitignore` / `wrangler.json` の秘匿情報保護
- [x] **ID・DB規約の確立**: D1 接続疎通と `id-utils.ts` (ULID) の導入

### Phase 2：コア機能実装 & 決済統合（Current）
「1日1タスク」を基準に、実装の堅牢性と証跡（Audit Trail）の確保を最優先。

#### 🔧 Step A：DB基盤 & マスタ表示（Done）
- [x] **D1 スキーマ刷新**: `description` 追加、外部キー制約の厳格化
- [x] **マスタデータ投入**: `seed_01` による店舗・プラン情報の初期化
- [x] **プラン一覧実装**: `/services` 画面へのマスタデータ動的表示

#### 🧠 Step B：予約エンジン & ルーティング（Current）
- [x] **Day 4: 日時管理の統一**: `date-fns` 導入（JST/UTC管理とカレンダー語彙の同期）
- [x] **Day 5: 動的スロット計算**: 稼働枠と予約済みデータの突合ロジック実装
- [x] **Day 6: ルーティング基盤の再整備**: 
    - `index.tsx` へのルート集約と絶対パス化
    - 汎用エラーページ (`/error`) の確立
    - フロント・バック間の「情報のバトン」の同期確認
- [ ] **Day 6.5 (Extra): 仮確保(Pending)機能**: `expires_at` による15分間の論理ロック実装

#### 💳 Step C：決済連携 & 証跡の確保（Next）
- [x] **Day 7: Stripe SDK 導入**: Checkout Session 作成と処理ログの先行発行
- [ ] **Day 8: 決済成功ハンドリング**: Webhook による `status='booked'` への一貫性保持
- [ ] **Day 9: 非正規化スナップショット**: 確定時の価格・プラン名の永続化（監査証跡）
- [ ] **Day 10: 予約完了通知**: `Resend` 連携による自動確認メール送信

#### 🔐 Step D：管理機能 & 公開準備
- [ ] **Day 11: アクセス制限**: `Cloudflare Access` による `/admin` 領域の保護
- [ ] **Day 12: 統合疎通テスト**: 決済〜証跡保存〜通知までの一気通貫確認

### Phase 3：システム拡張
- [ ] **自動メンテナンス**: `Cron Triggers` による期限切れ在庫の自動クリーンアップ
- [ ] **プラットフォーム化**: 複数拠点・複数業種対応への抽象化
- [ ] **知見の体系化**: 実装プロセスを通じたビジネス哲学の note/Kindle 公開

---

### 💡 実装上の注意事項
1. **単位の統一**: コード内の時間操作はすべて `date-fns` を介し「分」で行う。`* 60` 等の直接計算は禁止。
2. **真実の口（SSOT）**: 所要時間やバッファ、価格は必ず `service_plans` テーブルを参照し、URLパラメータに依存しない。
3. **証跡の不変性**: 予約確定後は、マスターが変更されても影響を受けないよう、必要なデータは `reservations`（または `slots`）側にコピーして保持する。
4. **論理ロックの優先**: TTL（15分消去）は、当初は「計算時の除外ロジック」として実装し、物理削除はPhase 3で対応する。

© 2026 Taiga Shizen.