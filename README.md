# shizentaiga-2026

清善 泰賀（Shizen Taiga）の次世代 Web サービス基盤。
「つながりは、偶然から。」をコンセプトに、外部プラットフォーム（リザスト等）への依存を解消し、Cloudflare エコシステムによるフルスタックな内製化を実現するプロジェクトです。

## 🎯 プロジェクトの目的
- **決済・予約の内製化**: リザスト＋PayPal 構成から、Stripe を活用した自社完結型の予約決済システムへ移行。
- **技術の刷新**: Hono (TypeScript) + Cloudflare Workers によるモダンな動的環境への移行。
- **安全な検証サイクルの確立**: プレビュー環境（*.workers.dev）を活用し、本番環境の安定性を担保した継続的開発。
- **データガバナンス**: 顧客データおよび予約履歴の自社管理と、運用の透明性向上。

## 📂 ファイル構成の全体像 (Architecture)
プロジェクトの構造と各ファイルの役割です。修正時の参照ガイドとして活用してください。

    src/  
    ├── index.tsx          # 【司令塔】すべてのリクエストの道案内（ルーティング）  
    ├── renderer.tsx       # 【共通の額縁】全ページ共通の HTML 構造・SEO・メタ情報管理  
    ├── style.css          # 【外観】サイト全体の共通デザイン（CSS）  
    │  
    ├── pages/             # 【各画面の中身】  
    │   ├── Top.tsx        # トップページの内容  
    │   ├── Services.tsx   # プラン一覧（個別診断・資金調達・顧問）  
    │   ├── Legal.tsx      # 特定商取引法に基づく表記  
    │   └── Thanks.tsx     # 完了ページ（決済・問い合わせ後）  
    │  
    ├── components/        # 【再利用する部品】  
    │   ├── Header.tsx     # 共通ヘッダー（ナビゲーション）  
    │   └── Footer.tsx     # 共通フッター（コピーライト、特商法リンク等）  
    │  
    ├── lib/               # 【外部システムとの通信】  
    │   ├── stripe.ts      # Stripe 決済処理のロジック  
    │   └── google-cal.ts  # Google カレンダー連携のロジック  
    │  
    └── constants/         # 【真実の単一源】  
        └── info.ts        # 氏名、住所、メール、サービス価格、URL等の一元管理  

## 🛠️ 技術スタック
- **Framework**: [Hono](https://hono.dev/) v4.x (TypeScript)
- **Build Tool**: Vite v6.x
- **Runtime**: Cloudflare Workers (Vite 統合版)
- **Infrastructure**: Cloudflare Network (DNS / WAF / Observability)
- **Database**: Cloudflare D1 (SQLite) - *予定*
- **Payments**: Stripe Checkout / Webhooks - *予定*

## 📂 ドキュメント体系 (doc/)
実装と同等にドキュメンテーションを重視しています。ファイル名は英語、内容は日本語で記述します。

| ファイル名 | ステータス | 内容 |
| :--- | :--- | :--- |
| `00_project_master_plan.md` | 作成済 | 次世代基盤移行および決済内製化の全体計画書 |
| `01_system_architecture.md` | 作成済 | システム構造、ディレクトリ設計、データフロー等の定義 |
| `02_implementation_detail.md` | 作成済 | 死活監視、自動更新、各コンポーネントの挙動等の詳細仕様 |
| `03_stripe_integration_guide.md` | 未作成 | 決済フローとセキュリティ、PCI DSS 準拠に関する設計 |
| `11_phase1_completion_report.md` | 作成済 | **基盤構築および本番ドメイン移行完了報告書** |
| `90_development_log.md` | **更新中** | **開発・検証の作業記録、デバッグログ（内部用）** |

## 🚀 開発ロードマップ

### Phase 1: 基盤構築 & ドメイン移行 (Done)
- [x] Hono + Vite 環境の初期化と GitHub 同期
- [x] **shizentaiga.com 本番ドメインの Workers 移行完了**
- [x] `.gitignore` および `wrangler.json` のセキュリティ強化

### Phase 2: 公式HP改善 & サービス実装 (Current)
- [x] プレビューURL（*.workers.dev）を活用した安全な検証フローの運用
- [x] アーキテクチャの刷新（renderer.tsx / info.ts の導入）
- [ ] プラン一覧ページ（`/services`）の構築
- [ ] Stripe Checkout による決済ボタンの実装とテスト
- [ ] メール送信のテスト(予約確認、決済確認)

### Phase 3: Aletheia システム開発（独立プロジェクト）
- [ ] 「つながりは、偶然から。」を体現する検索・予約・決済プラットフォームの構築
- [ ] D1 データベースを用いた複数拠点・複数業種対応基盤の実装
- [ ] Webhook による自動通知システムの統合

---
© 2026 Taiga Shizen.