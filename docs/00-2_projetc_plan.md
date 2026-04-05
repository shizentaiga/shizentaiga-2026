# システム計画書：高信頼予約決済基盤「Aletheia Core」 (v1.8)

## 1. プロジェクトの目的と設計思想
Cloudflare Workers + D1 + Stripe を活用し、予約枠の「仮確保」から「確定」までを最短時間で回す、将来の多拠点展開を見据えた高信頼・高効率な基盤を構築する。
* **設計前提**: シングルD1インスタンス運用。内部処理は **UTC**、表示・検索は **JST** で完全分離する。

## 2. 業務フロー：高回転・自己修復型トランザクション

### 2.1. インベントリ・ロック（Stripe仕様への完全同調）
同時押し（レースコンディション）を物理的に排除し、Stripeのセッション期限と同期させる。
* **アトミック更新**: UPDATE slots SET status='pending', expires_at=? WHERE id=? AND tenant_id=? AND status='available' （更新件数0なら失敗と判定）
* **Stripe セッション期限**: 発行から **31分（1860秒）** に設定（API引数 expires_at を使用）。
* **DB 仮確保期限 (pending_expires_at)**: 発行から **35分（2100秒）**。
    * **理由**: Stripe側が先に必ず失効することを保証し、二重予約をゼロにする。

### 2.2. Webhook優先・Cron補完のハイブリッド自浄作用
APIレート制限（N+1問題）を回避しつつ、データの整合性を維持する。
* **メイン（Webhook）**: checkout.session.completed で確定、checkout.session.expired で即時開放。
* **安全網（Cron / 5分間隔）**: 期限切れの pending 枠を抽出。ただしAPIを叩く前に「冪等性テーブル」を確認し、未処理の「迷子」のみ Stripe API へ照合・強制失効（expire）処理を行う。

---

## 3. データベース・スキーマ設計（将来への接合部と高速化）

SQLiteの特性を活かし、将来の「大工事」を避けるための「空き箱（プレースホルダー）」を設置する。

### ① 在庫管理テーブル (slots)
| カラム名 | 型 | 役割・規約 |
| :--- | :--- | :--- |
| **tenant_id** | TEXT (INDEX) | **必須**。初期値: 'taiga_shizen'。将来のマルチテナント用。 |
| id | TEXT (PK) | 枠の一意識別子 |
| start_at_unix | INTEGER | 絶対時間（Unix Timestamp / UTC） |
| **date_string** | TEXT (INDEX) | **JST固定日付（'2026-04-06'）**。カレンダー検索用。 |
| status | TEXT | available, pending, booked |
| expires_at | INTEGER | 仮確保の期限（Unix Timestamp / UTC） |
| slot_duration | INTEGER | 枠の粒度（分）。将来の可変時間対応用。 |

### ② 決済冪等性テーブル (processed_events)
* event_id (PK) をキーとし、二重処理を完全に遮断。

---

## 4. 実装規約（エンジニア・監査向けデバッグ指針）

| リスク項目 | 具体的な対策（コードレベルの規約） | 期待される効果 |
| :--- | :--- | :--- |
| **JST/UTC逆転** | date_string 保存時は必ず **JST（Asia/Tokyo）** に変換。 | 深夜・早朝の予約が「前日」にズレるバグを封鎖。 |
| **二重予約防止** | 31分(Stripe) < 35分(D1) の階層構造を維持。 | 「払ったのに枠がない」事故を物理的に排除。 |
| **API負荷制限** | Reconciliation（照合）前に冪等性テーブルを走査。 | 数万件の運用でもStripe API制限に抵触しない。 |
| **検索速度低下** | date_string と tenant_id への複合INDEX。 | カレンダー表示のフルスキャンを回避し、爆速を維持。 |
| **将来の相乗り** | 全てのクエリに tenant_id を含める設計。 | Phase 3への移行コストを 90% 削減。 |

---

## 5. 今後の展開
* **Phase 1**: 本計画（v1.8）に基づく、鉄壁の予約決済システム構築。
* **Phase 2**: Google カレンダー API 連携（.ics 添付からの進化）。
* **Phase 3**: Aletheia として他テナントへ開放。