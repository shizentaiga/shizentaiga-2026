/**
 * 【実戦：DB不具合切り分けノウハウ v3.0】
 * * 1. 物理排他の整合性チェック (reservation_grid)
 * - 原因：staff_schedules（30分枠）と slots（予約）の紐付けミス。
 * - 調査：`SELECT * FROM reservation_grid WHERE schedule_id = 'xxxx';`
 * 1つのスケジュール枠に対して複数のスロットが紐づこうとすると、
 * UNIQUE制約(schedule_id)により物理的にエラーを吐くのが正常な挙動。
 * * 2. 外部キー制約の罠 (PRAGMA foreign_keys)
 * - D1はデフォルトで外部キー制約が「OFF」の場合がある。
 * - 対策：接続時に `PRAGMA foreign_keys = ON;` を投げる。
 * これが効いていれば、shopsを消した際に紐づくstaffsも自動で消える(CASCADE)。
 * * 3. 期限切れ仮予約 (expires_at)
 * - `pending` 状態のまま放置されたレコードは、`expires_at < unix_now` で
 * 論理的に除外するか、バッチで削除する。
 * * --- 開発者用チートシート ---
 * # 物理スキーマの全テーブル一覧
 * npx wrangler d1 execute shizentaiga_db --local --command=".tables"
 * # 特定テーブルの完全なCREATE文を表示
 * npx wrangler d1 execute shizentaiga_db --local --command="SELECT sql FROM sqlite_master WHERE name='slots';"
 */

import { Hono } from 'hono';

type Bindings = {
  shizentaiga_db: D1Database;
}

export const test03 = new Hono<{ Bindings: Bindings }>();

test03.get('/', async (c) => {
  try {
    // 1. 最新のスキーマに基づき、主要な情報を一括取得 (JOINを使用)
    // どの店舗の、どのスタッフが、どのプランを予約されているかを見える化
    const { results } = await c.env.shizentaiga_db
      .prepare(`
        SELECT 
          s.slot_id,
          sh.shop_name,
          st.staff_display_name,
          p.plan_name,
          s.date_string,
          s.start_at_unix,
          s.booking_status,
          s.expires_at
        FROM slots s
        JOIN plans p ON s.plan_id = p.plan_id
        JOIN staffs st ON s.staff_id = st.staff_id
        JOIN shops sh ON st.shop_id = sh.shop_id
        ORDER BY s.start_at_unix ASC
      `)
      .all();

    if (!results || results.length === 0) {
      return c.text("⚠️ データベースは稼働していますが、予約(slots)データが0件です。\nSeed.sqlを実行したか確認してください。");
    }

    const nowUnix = Math.floor(Date.now() / 1000);

    const report = results.map((row: any) => {
      // 状態に応じたラベル付け
      let statusLabel = '';
      if (row.booking_status === 'booked') statusLabel = '✅ [CONFIRMED]';
      else if (row.booking_status === 'pending') {
        // 仮予約の場合は有効期限切れかチェック
        const isExpired = row.expires_at && row.expires_at < nowUnix;
        statusLabel = isExpired ? '⏰ [EXPIRED]' : '⏳ [HOLDING]';
      } else {
        statusLabel = `❌ [${row.booking_status.toUpperCase()}]`;
      }

      // 時刻の整形
      const timeStr = new Date(row.start_at_unix * 1000).toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      return [
        `${statusLabel}`,
        `  ID    : ${row.slot_id}`,
        `  CONTEXT: ${row.shop_name} / ${row.staff_display_name}`,
        `  PLAN  : ${row.plan_name}`,
        `  TIME  : ${timeStr} (UNIX: ${row.start_at_unix})`,
        `  --------------------------------------------------`
      ].join('\n');
    }).join('\n');

    // ヘッダー情報の構築
    const header = [
      `==================================================`,
      ` DATABASE VIEWER v3.0 (Grid-Atomic Model) `,
      ` System Time: ${new Date().toLocaleString('ja-JP')}`,
      `==================================================`,
      `Total Records: ${results.length}`,
      `\n`
    ].join('\n');

    return c.text(header + report);

  } catch (e: any) {
    // スキーマ不一致時のデバッグヒントを強化
    return c.json({ 
      status: "❌ SQL Execution Error", 
      message: e.message,
      troubleshooting: [
        "1. カラム名の不一致 (id -> slot_id 等) がないか",
        "2. JOIN先のテーブル (shops, staffs, plans) にデータが入っているか",
        "3. Wranglerの向き先 (--local / --remote) は正しいか"
      ],
      sql_check: "PRAGMA table_info(slots);"
    }, 500);
  }
});