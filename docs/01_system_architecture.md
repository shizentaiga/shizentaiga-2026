# 01_全体設計書.md

# システム全体設計書 (System Architecture Design)

**プロジェクト名**: shizentaiga-2026  
**最終更新日**: 2026-04-05  
**設計者**: 清善 泰賀  

---

## 1. システムアーキテクチャ
本システムは、Cloudflare のエッジコンピューティング技術を最大限に活用した「サーバーレス・フルスタック構成」を採用する。

### 1.1 全体構造
- **Entry Point**: Cloudflare Workers (Hono Framework)
- **Frontend**: Hono JSX (Vite によるビルド)
- **Backend Logic**: Hono Routing / Middleware
- **Database**: Cloudflare D1 (SQLite-based Edge Database)
- **External API**: Stripe (決済), Google Calendar API (予約管理)

### 1.2 データフロー図
[User Browser] <--> [Cloudflare Edge (Hono)] <--> [Cloudflare D1 / External APIs]

---

## 2. ソフトウェア設計 (Hono / TypeScript)

### 2.1 ディレクトリ構造
```text
/src
  ├── index.tsx       # メインエントリ・ルーティング定義
  ├── renderer.tsx    # JSX 基本レイアウト定義（HTMLヘッダー等）
  ├── components/     # 再利用可能なUIパーツ（Header, Footer, Button等）
  ├── routes/         # 肥大化時に備えたルート別ロジック分割用
  └── lib/            # Stripe連携, DB操作等のユーティリティ関数
/public               # 静的資産（CSS, Images, Favicon）
```

### 2.2 ルーティング定義 (予定)
- `GET /` : トップページ（プロフィール、サービス紹介）
- `GET /legal` : 特定商取引法に基づく表記（JSXによる動的出力）
- `GET /reserve` : 予約フォーム画面（Phase 3）
- `POST /api/checkout` : Stripe 決済セッション作成 (Phase 3)
- `POST /api/webhook` : Stripe 決済完了通知の受信 (Phase 4)

---

## 3. データベース設計 (Cloudflare D1)

### 3.1 テーブル構成（案）
将来の予約システム内製化に向けて以下のテーブルを想定する。

1. **`reservations` (予約管理)**
   - `id` (UUID): 予約識別子
   - `customer_email` (TEXT): 顧客連絡先
   - `service_type` (TEXT): 診断メニュー種別
   - `scheduled_at` (DATETIME): 予約日時
   - `status` (TEXT): 決済/予約状態（pending, confirmed, cancelled）
   - `stripe_session_id` (TEXT): Stripeとの紐付け用

---

## 4. 決済・外部連携設計

### 4.1 Stripe 決済フロー
1. ユーザーが予約フォーム送信。
2. Hono 側で `Stripe Checkout Session` を発行。
3. ユーザーを Stripe 決済画面へリダイレクト。
4. 決済完了後、Stripe Webhook が Hono の `/api/webhook` を叩く。
5. Hono が D1 のステータスを更新し、Google Calendar に予定を登録。

---

## 5. セキュリティ & パフォーマンス
- **Security**: 
  - 環境変数の管理 (Cloudflare Secret 活用)
  - Stripe Webhook 署名検証の徹底
- **Performance**: 
  - Cloudflare Edge での HTML 生成による低レイテンシ化
  - 画像アセットの WebP 統一と Vite による最適化

---

## 6. 運用・デプロイ
- **CI/CD**: GitHub Main ブランチへの Push による自動デプロイ。
- **Monitoring**: Cloudflare Workers Analytics によるトラフィック監視。

---
**エンジニア・ノート**:
本設計は Phase 1 の基盤構築完了に伴い、Phase 3-4 の動的機能実装を見据えて策定された。各コンポーネントは独立性を保ち、将来的な機能拡張（AI診断連携など）に柔軟に対応できる構造を目指す。