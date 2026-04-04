# shizentaiga-2026

清善 泰賀（Seizen Taiga）の次世代 Web サービス基盤。
外部プラットフォームへの依存を解消し、Cloudflare エコシステムによるフルスタックな内製化を実現するプロジェクトです。

## 🎯 プロジェクトの目的
- **決済・予約の内製化**: Stripe を活用した自社完結型の予約決済システムの構築。
- **技術の刷新**: Hono (TypeScript) + Cloudflare Pages + D1 によるモダンな動的環境への移行。
- **データガバナンス**: 顧客データおよび予約履歴の自社管理と、運用の透明性向上。

## 🛠️ 技術スタック（予定）
- **Framework**: [Hono](https://hono.dev/) (TypeScript)
- **Runtime**: Cloudflare Pages / Workers
- **Database**: Cloudflare D1 (SQLite)
- **Payments**: Stripe Checkout / Webhooks
- **Auth**: Cloudflare Access / Google Auth (必要に応じて)

## 📂 ドキュメント体系 (doc/)
本プロジェクトは、実装と同等にドキュメンテーションを重視します。

| ファイル名 | ステータス | 内容 |
| :--- | :--- | :--- |
| `00_project-plan-v2.md` | 作成済 | 次世代基盤移行および決済内製化の全体計画書 |
| `21_repository-init.md` | 作成済 | リポジトリ初期化と GitHub 同期の実施記録 |
| `31_hono-setup-log.md` | 未作成 | Hono フレームワーク導入と環境構築の記録 |
| `全体設計書.md` | 未作成 | システムアーキテクチャ、DBスキーマ、API定義 |
| `Stripe実装ガイド.md` | 未作成 | 決済フローとセキュリティ、PCI DSS準拠に関する設計 |
| `運用マニュアル.md` | 未作成 | デプロイ手順、不具合時の切り戻しフロー |

## 🚀 開発ロードマップ
1. **Phase 1**: Hono への基盤移設（既存資産の静的移植）
2. **Phase 2**: 予約フォームと Google Calendar の連携
3. **Phase 3**: Stripe 決済によるセキュアな支払いフローの実装
4. **Phase 4**: Webhook を活用した通知自動化システムの構築

---
© 2026 Taiga Shizen.