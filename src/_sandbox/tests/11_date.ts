import { Hono } from 'hono';

/**
 * 環境変数の型定義
 */
type Bindings = {
  shizentaiga_db: D1Database;
};

/**
 * D1から取得するデータの型定義
 */
interface Plan {
  plan_id: string;
  plan_name: string;
  duration_min: number;
  price_amount: number;
  plan_status: string;
}

interface StaffSchedule {
  schedule_id: string;
  date_string: string;
  start_at_unix: number;
  end_at_unix: number;
}

interface Slot {
  slot_id: string;
  booking_status: string;
  date_string: string;
  start_at_unix: number;
  end_at_unix: number; // 終了時間を追加
  actual_duration_min: number;
  stripe_session_id: string | null; // Stripe IDを追加
}

export const test11 = new Hono<{ Bindings: Bindings }>();

test11.get('/', async (c) => {
  try {
    // 基準となる現在時刻（Unix秒）
    const nowUnix = Math.floor(Date.now() / 1000);

    // 1. バインディングの存在チェック
    if (!c.env.shizentaiga_db) {
      throw new Error("c.env.shizentaiga_db が取得できません。wrangler.json の binding 名を確認してください。");
    }

    // 2. 外部キー制約の有効化
    await c.env.shizentaiga_db.prepare('PRAGMA foreign_keys = ON;').run();

    // 3. プラン一覧の取得 (plans)
    const { results: plansRaw } = await c.env.shizentaiga_db.prepare(`
      SELECT plan_id, plan_name, duration_min, price_amount, plan_status 
      FROM plans WHERE plan_status = 'active' ORDER BY created_at DESC
    `).all();
    const plans = plansRaw as unknown as Plan[];

    // 4. スタッフ稼働枠の取得 (staff_schedules)
    const { results: schedulesRaw } = await c.env.shizentaiga_db.prepare(`
      SELECT schedule_id, date_string, start_at_unix, end_at_unix 
      FROM staff_schedules WHERE start_at_unix > ? ORDER BY start_at_unix ASC LIMIT 100
    `).bind(nowUnix).all();
    const schedules = schedulesRaw as unknown as StaffSchedule[];

    // 5. 予約スロットの取得 (slots)
    // 詳細情報を表示するため、end_at_unix と stripe_session_id を SELECT に追加
    const { results: slotsRaw } = await c.env.shizentaiga_db.prepare(`
      SELECT slot_id, booking_status, date_string, start_at_unix, end_at_unix, actual_duration_min, stripe_session_id 
      FROM slots WHERE start_at_unix > ? ORDER BY start_at_unix ASC LIMIT 100
    `).bind(nowUnix).all();
    const slots = slotsRaw as unknown as Slot[];

    /* -------------------------------------------------------------------------- */
    /* ビュー用：各行の生成ロジック
    /* -------------------------------------------------------------------------- */

    // プラン行
    const planRows = plans.length > 0 ? plans.map(p => `
      <tr>
        <td style="border: 1px solid #dee2e6; padding: 8px; font-family: monospace; font-size: 0.8rem;">${p.plan_id}</td>
        <td style="border: 1px solid #dee2e6; padding: 8px;"><strong>${p.plan_name}</strong></td>
        <td style="border: 1px solid #dee2e6; padding: 8px; text-align: center;">${p.duration_min}分</td>
        <td style="border: 1px solid #dee2e6; padding: 8px; text-align: right;">¥${Number(p.price_amount).toLocaleString()}</td>
      </tr>
    `).join('') : '<tr><td colspan="4" style="text-align:center; padding:20px; color:#999;">プランが登録されていません</td></tr>';

    // 稼働枠行 (Supply)
    const scheduleRows = schedules.length > 0 ? schedules.map(s => `
      <tr style="font-size: 0.85rem;">
        <td style="border: 1px solid #dee2e6; padding: 8px;">${s.date_string}</td>
        <td style="border: 1px solid #dee2e6; padding: 8px;">${new Date(s.start_at_unix * 1000).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</td>
        <td style="border: 1px solid #dee2e6; padding: 8px;">${new Date(s.end_at_unix * 1000).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</td>
      </tr>
    `).join('') : '<tr><td colspan="3" style="text-align:center; padding:10px; color:#999;">稼働予定データなし</td></tr>';

    // 予約枠行 (Inventory/Demand)
    // 詳細情報（時間範囲、Stripe ID）を含めるように拡張
    const slotRows = slots.length > 0 ? slots.map(s => {
      const statusColor = s.booking_status === 'booked' ? '#dc2626' : s.booking_status === 'pending' ? '#d97706' : '#059669';
      const startTime = new Date(s.start_at_unix * 1000).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      const endTime = new Date(s.end_at_unix * 1000).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      
      return `
        <tr style="font-size: 0.85rem;">
          <td style="border: 1px solid #dee2e6; padding: 8px; font-family: monospace; font-size: 0.7rem;">${s.slot_id}</td>
          <td style="border: 1px solid #dee2e6; padding: 8px;">
            <div style="font-weight: bold;">${s.date_string}</div>
            <div style="color: #4b5563;">${startTime} - ${endTime} (${s.actual_duration_min}分)</div>
          </td>
          <td style="border: 1px solid #dee2e6; padding: 8px; text-align: center;">
            <span style="color: white; background: ${statusColor}; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold;">${s.booking_status.toUpperCase()}</span>
          </td>
          <td style="border: 1px solid #dee2e6; padding: 8px; font-family: monospace; font-size: 0.65rem; color: #6b7280; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${s.stripe_session_id ?? 'N/A'}">
            ${s.stripe_session_id ?? '-'}
          </td>
        </tr>
      `;
    }).join('') : '<tr><td colspan="4" style="text-align:center; padding:20px; color:#999;">有効な予約スロットなし</td></tr>';

    /* -------------------------------------------------------------------------- */
    /* 最終出力：HTML
    /* -------------------------------------------------------------------------- */
    return c.html(`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>[TEST 11] DB Data Observer</title>
      </head>
      <body style="margin: 0; background-color: #f3f4f6; font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #1f2937;">
        <div style="max-width: 1100px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <header style="border-bottom: 2px solid #f3f4f6; margin-bottom: 30px; padding-bottom: 10px;">
            <h2 style="margin:0; font-size: 1.4rem; color: #111827;">[TEST 11] System Data Observer</h2>
            <p style="font-size: 0.85rem; color: #6b7280; margin: 8px 0 0;">
              基準時刻 (現在): ${new Date(nowUnix * 1000).toLocaleString('ja-JP')} | Unix: ${nowUnix}
            </p>
          </header>

          <section style="margin-bottom: 40px;">
            <h3 style="color: #374151; font-size: 1rem; border-left: 4px solid #2563eb; padding-left: 10px; margin-bottom: 15px;">1. Service Plans (Master)</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f8f9fa;">
                  <th style="border: 1px solid #dee2e6; padding: 10px; text-align: left; font-size: 0.75rem; color: #6b7280;">ID</th>
                  <th style="border: 1px solid #dee2e6; padding: 10px; text-align: left; font-size: 0.75rem; color: #6b7280;">Name</th>
                  <th style="border: 1px solid #dee2e6; padding: 10px; text-align: center; font-size: 0.75rem; color: #6b7280;">Duration</th>
                  <th style="border: 1px solid #dee2e6; padding: 10px; text-align: right; font-size: 0.75rem; color: #6b7280;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${planRows}
              </tbody>
            </table>
          </section>

          <div style="display: grid; grid-template-columns: 350px 1fr; gap: 24px; margin-top: 30px;">
            
            <section>
              <h3 style="color: #374151; font-size: 1rem; border-left: 4px solid #059669; padding-left: 10px; margin-bottom: 15px;">2. Staff Schedules (Supply)</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #f8f9fa;">
                    <th style="border: 1px solid #dee2e6; padding: 8px; text-align: left; font-size: 0.75rem; color: #6b7280;">Date</th>
                    <th style="border: 1px solid #dee2e6; padding: 8px; text-align: left; font-size: 0.75rem; color: #6b7280;">Start</th>
                    <th style="border: 1px solid #dee2e6; padding: 8px; text-align: left; font-size: 0.75rem; color: #6b7280;">End</th>
                  </tr>
                </thead>
                <tbody>
                  ${scheduleRows}
                </tbody>
              </table>
            </section>

            <section>
              <h3 style="color: #374151; font-size: 1rem; border-left: 4px solid #d97706; padding-left: 10px; margin-bottom: 15px;">3. Generated Slots (Inventory)</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #f8f9fa;">
                    <th style="border: 1px solid #dee2e6; padding: 8px; text-align: left; font-size: 0.75rem; color: #6b7280;">Slot ID</th>
                    <th style="border: 1px solid #dee2e6; padding: 8px; text-align: left; font-size: 0.75rem; color: #6b7280;">Reservation Time (JST)</th>
                    <th style="border: 1px solid #dee2e6; padding: 8px; text-align: center; font-size: 0.75rem; color: #6b7280;">Status</th>
                    <th style="border: 1px solid #dee2e6; padding: 8px; text-align: left; font-size: 0.75rem; color: #6b7280;">Stripe Session</th>
                  </tr>
                </thead>
                <tbody>
                  ${slotRows}
                </tbody>
              </table>
            </section>
          </div>

          <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; display: flex; justify-content: space-between; align-items: center;">
            <a href="/_debug/" style="color: #2563eb; text-decoration: none; font-size: 0.9rem; font-weight: 500;">← サンドボックスTOPに戻る</a>
            <span style="font-size: 0.75rem; color: #9ca3af;">Schema Version: 2.7</span>
          </div>
        </div>
      </body>
      </html>
    `);

  } catch (e: any) {
    console.error("DEBUG ERROR:", e);
    return c.html(`
      <div style="padding:40px; font-family: sans-serif; background: #fff1f2; min-height: 100vh;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; border: 1px solid #fda4af;">
          <h3 style="color: #e11d48; margin-top: 0;">Runtime Error</h3>
          <pre style="background: #f8fafc; padding: 15px; border-radius: 4px; font-size: 0.85rem; border: 1px solid #e2e8f0; overflow-x: auto;">${e.message}</pre>
          <a href="/_debug/" style="color: #2563eb; font-size: 0.9rem;">← 戻る</a>
        </div>
      </div>
    `, 500);
  }
});