# 91-2_temp.md：データ層の構築（実装手順書）

## 1. D1 テーブルの初期化とシードデータの投入
まずは、ローカル環境の D1 データベースを準備し、検証用のデータを流し込みます。

### 1.1 テーブル作成 (schema.sql の適用)
ターミナルで以下を実行し、04 で設計したテーブル構造を作成します。
- `npx wrangler d1 execute <DATABASE_NAME> --local --file=./src/db/schema.sql`

### 1.2 検証用データの投入 (seeds.sql)
検証をスムーズにするため、以下の内容で `src/db/seeds.sql` を作成し、実行します。
- `INSERT INTO slots (tenant_id, id, date_string, start_at_unix, slot_duration, status, updated_at) VALUES ('taiga_shizen', 'slot_001', '2026-04-06', 1712386800, 60, 'available', 1712383200);`
- 実行コマンド: `npx wrangler d1 execute <DATABASE_NAME> --local --file=./src/db/seeds.sql`

---

## 2. データベース操作ロジックの実装 (src/db/queries.ts)
Hono から呼び出すための、D1 操作関数を定義します。

### 2.1 予約枠の取得 (getSlots)
特定の日の「予約可能な枠」と「仮確保中の枠」を取得します。
- **ポイント**: `ORDER BY start_at_unix ASC` で時系列順に取得し、カレンダー表示を整えます。

### 2.2 アトミックな仮確保 (tryLockSlot)
二重予約を物理的に防ぐための最重要関数です。
- **ロジック**: `UPDATE` 文の `WHERE` 句に `status = 'available'` を含めることで、タッチの差で他人に取られた場合に更新件数が 0 になるようにします。
- **戻り値**: 更新成功（changes === 1）なら `true`、失敗なら `false` を返却します。

---

## 3. 実装検証：同時アクセス・シミュレーション
ターミナルを2つ開き、DBレベルでのロックが機能しているかテストします。

### 3.1 正常系の確認
1. ターミナル1で `tryLockSlot` 相当の SQL を実行。
   - `UPDATE slots SET status = 'pending', expires_at = 1712410000, updated_at = 1712383200 WHERE id = 'slot_001' AND status = 'available';`
2. `1 row updated` と表示されれば成功。

### 3.2 競合（二重予約防止）の確認
1. ターミナル1での成功直後、ターミナル2で全く同じ SQL を実行。
2. **期待される結果**: `0 rows updated` と表示されること。
   - 既に `status` が `pending` に変わっているため、`WHERE status = 'available'` の条件に合致しなくなり、後からのリクエストが自動的に弾かれます。

---

## 4. 次のアクション
- [ ] `src/db/schema.sql` の再確認と実行
- [ ] `src/db/queries.ts` のコーディング（TypeScript）
- [ ] ローカル環境での `wrangler d1 execute` による手動 SQL 検証