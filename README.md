# shizentaiga-2026

清善 泰賀（Seizen Taiga）の次世代 Web サービス基盤。
外部プラットフォームへの依存を解消し、Cloudflare エコシステムによるフルスタックな内製化を実現するプロジェクトです。

## 🎯 プロジェクトの目的
- **決済・予約の内製化**: Stripe を活用した自社完結型の予約決済システムの構築。
- **技術の刷新**: Hono (TypeScript) + Cloudflare Workers/Pages + D1 によるモダンな動的環境への移行。
- **データガバナンス**: 顧客データおよび予約履歴の自社管理と、運用の透明性向上。

## 🛠️ 技術スタック
- **Framework**: [Hono](https://hono.dev/) v4.x (TypeScript)
- **Build Tool**: Vite v6.x
- **Runtime**: Cloudflare Workers / Pages (Vite 統合版)
- **Database**: Cloudflare D1 (SQLite) - *予定*
- **Payments**: Stripe Checkout / Webhooks - *予定*

## 📂 ドキュメント体系 (doc/)
本プロジェクトは、実装と同等にドキュメンテーションを重視しています。

| ファイル名 | ステータス | 内容 |
| :--- | :--- | :--- |
| `00_project-plan-v2.md` | 作成済 | 次世代基盤移行および決済内製化の全体計画書 |
| `01_全体設計書.md` | 未作成 | システムアーキテクチャ、DBスキーマ、API定義 |
| `21_repository-init.md` | 作成済 | リポジトリ初期化と GitHub 同期の実施記録 |
| `31_hono-setup-log.md` | 作成済 | **Hono 導入とローカル環境構築の完了報告（Phase 1）** |
| `Stripe実装ガイド.md` | 未作成 | 決済フローとセキュリティ、PCI DSS準拠に関する設計 |

## 🚀 開発ロードマップ
1. **Phase 1: 基盤構築 (Done)**
   - Hono + Vite 環境の初期化
   - GitHub リポジトリとの SSH 同期
   - ローカル開発サーバー（npm run dev）の稼働確認

2. **Phase 2: 既存資産の移植 (Current)**
   - 静的HTML / CSS の JSX 化
   - `/legal`（特定商取引法に基づく表記）のルーティング実装
   - Cloudflare Pages への初デプロイ

3. **Phase 3: 機能実装**
   - 予約フォームと Google Calendar API の連携
   - Stripe 決済フローの実装

4. **Phase 4: 最適化**
   - Webhook による自動通知
   - PageSpeed Insights によるパフォーマンス最終調整

---
© 2026 Taiga Shizen.