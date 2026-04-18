import { Hono } from 'hono';
import { html } from 'hono/html';

/**
 * 環境変数の型定義
 */
type Bindings = {
  shizentaiga_db: D1Database;
}

/**
 * v4.4 スキーマ対応：型定義
 */
interface Plan {
  plan_id: string;
  plan_name: string;
  duration_min: number;
  buffer_min: number;
  price_amount: number;
  plan_status: string;
}

interface StaffSchedule {
  schedule_id: string;
  date_string: string;
  start_at_unix: number;
  grid_size_min: number;
}

interface Slot {
  slot_id: string;
  booking_status: string;
  date_string: string;
  start_at_unix: number;
  actual_duration_min: number;
  actual_buffer_min: number;
  payment_intent_id: string | null; // stripe_session_id から変更
  plan_name?: string; // JOINで取得
}

export const test11 = new Hono<{ Bindings: Bindings }>();

test11.get('/', async (c) => {
  try {
    if (!c.env.shizentaiga_db) throw new Error("D1 Binding 'shizentaiga_db' not found.");

    // 1. マスター情報の取得 (スタッフのリードタイム設定も取得)
    const master = await c.env.shizentaiga_db.prepare(`
      SELECT sh.shop_id, sh.shop_name, st.staff_id, st.staff_display_name, st.min_lead_time_min,
             strftime('%s', 'now') as now_unix,
             datetime('now', '+9 hours') as jst_now
      FROM shops sh
      INNER JOIN staffs st ON sh.shop_id = st.shop_id
      WHERE sh.shop_id = 'shp_zenyu' LIMIT 1
    `).first<any>();

    if (!master) throw new Error("Master data (shp_zenyu) not found.");

    const nowUnix = Number(master.now_unix);
    const leadTimeSec = master.min_lead_time_min * 60;

    // 2. プラン一覧の取得 (Shop単位)
    const { results: plans } = await c.env.shizentaiga_db.prepare(`
      SELECT plan_id, plan_name, duration_min, buffer_min, price_amount, plan_status 
      FROM plans WHERE shop_id = ? AND plan_status != 'archived' ORDER BY price_amount DESC
    `).bind(master.shop_id).all<Plan>();

    // 3. 空きチップの取得 (Staff単位 / リードタイム外)
    const { results: schedules } = await c.env.shizentaiga_db.prepare(`
      SELECT sch.schedule_id, sch.date_string, sch.start_at_unix, sch.grid_size_min
      FROM staff_schedules sch
      LEFT JOIN reservation_grid rg ON sch.schedule_id = rg.schedule_id
      WHERE sch.staff_id = ? 
        AND sch.start_at_unix > ? 
        AND rg.slot_id IS NULL
      ORDER BY sch.start_at_unix ASC LIMIT 100
    `).bind(master.staff_id, nowUnix + leadTimeSec).all<StaffSchedule>();

    // 4. 予約スロットの取得 (Staff単位)
    // カラム名を stripe_session_id -> payment_intent_id に修正
    const { results: slots } = await c.env.shizentaiga_db.prepare(`
      SELECT s.slot_id, s.booking_status, s.date_string, s.start_at_unix, 
             s.actual_duration_min, s.actual_buffer_min, s.payment_intent_id, p.plan_name
      FROM slots s
      LEFT JOIN plans p ON s.plan_id = p.plan_id
      WHERE s.staff_id = ? AND s.start_at_unix > ? - 86400
      ORDER BY s.start_at_unix ASC LIMIT 50
    `).bind(master.staff_id, nowUnix).all<Slot>();

    /* --- HTML View Generation --- */

    const planRows = plans.map(p => html`
      <tr>
        <td style="border-bottom: 1px solid #f1f5f9; padding: 12px; font-family: monospace; font-size: 0.7rem; color: #64748b;">${p.plan_id}</td>
        <td style="border-bottom: 1px solid #f1f5f9; padding: 12px;"><strong>${p.plan_name}</strong></td>
        <td style="border-bottom: 1px solid #f1f5f9; padding: 12px; text-align: center;">
          ${p.duration_min}分 <span style="color:#94a3b8; font-size:0.75rem;">(+${p.buffer_min})</span>
        </td>
        <td style="border-bottom: 1px solid #f1f5f9; padding: 12px; text-align: right; font-weight: bold;">¥${p.price_amount.toLocaleString()}</td>
      </tr>
    `);

    const scheduleRows = schedules.map(s => {
      const timeStr = new Date(s.start_at_unix * 1000).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });
      return html`
        <tr style="font-size: 0.8rem;">
          <td style="border-bottom: 1px solid #f1f5f9; padding: 8px;">${s.date_string}</td>
          <td style="border-bottom: 1px solid #f1f5f9; padding: 8px; font-weight: 600; color: #059669;">${timeStr}</td>
          <td style="border-bottom: 1px solid #f1f5f9; padding: 8px; font-size: 0.7rem; color: #94a3b8;">${s.grid_size_min} min chip</td>
        </tr>
      `;
    });

    const slotRows = slots.map(s => {
      // スキーマの CHECK 制約 'cancelled', 'refunded', 'no_show' に対応
      const statusColors: any = { booked: '#10b981', pending: '#f59e0b', cancelled: '#ef4444', refunded: '#6366f1', no_show: '#94a3b8' };
      const startTime = new Date(s.start_at_unix * 1000).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });
      const totalTime = s.actual_duration_min + s.actual_buffer_min;
      
      return html`
        <tr style="font-size: 0.8rem;">
          <td style="border-bottom: 1px solid #f1f5f9; padding: 10px; font-family: monospace; font-size: 0.7rem; color: #94a3b8;">${s.slot_id}</td>
          <td style="border-bottom: 1px solid #f1f5f9; padding: 10px;">
            <div style="font-weight: 600;">${s.date_string} ${startTime}〜</div>
            <div style="font-size: 0.7rem; color: #64748b;">${s.plan_name || 'Unknown'} (${totalTime}分)</div>
          </td>
          <td style="border-bottom: 1px solid #f1f5f9; padding: 10px; text-align: center;">
            <span style="color: white; background: ${statusColors[s.booking_status] || '#64748b'}; padding: 2px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: 800; text-transform: uppercase;">
              ${s.booking_status}
            </span>
          </td>
          <td style="border-bottom: 1px solid #f1f5f9; padding: 10px; font-family: monospace; font-size: 0.65rem; color: #94a3b8; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${s.payment_intent_id ?? '-'}
          </td>
        </tr>
      `;
    });

    return c.html(html`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <title>[TEST 11] v4.4 Grid Observer</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-slate-50 font-sans p-6 text-slate-900">
        <div class="max-w-6xl mx-auto space-y-6">
          
          <header class="bg-[#0f172a] text-white p-6 rounded-xl shadow-lg flex justify-between items-center">
            <div>
              <h1 class="text-xl font-bold">Data Observer <span class="text-blue-400">v4.4</span></h1>
              <p class="text-xs opacity-70 mt-1">${master.shop_name} / ${master.staff_display_name}</p>
            </div>
            <div class="text-right font-mono">
              <p class="text-[10px] opacity-60">JST NOW</p>
              <p class="text-sm font-bold">${master.jst_now}</p>
              <p class="text-[10px] text-amber-400 mt-1">LeadTime: ${master.min_lead_time_min}min</p>
            </div>
          </header>

          <section class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <div class="w-1 h-4 bg-indigo-500 rounded-full"></div> 1. Master Plans
            </h2>
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="text-[10px] text-slate-400 uppercase border-b">
                  <th class="p-3">ID</th><th class="p-3">Plan Name</th><th class="p-3 text-center">Duration</th><th class="p-3 text-right">Price</th>
                </tr>
              </thead>
              <tbody>${planRows}</tbody>
            </table>
          </section>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-1">
              <h2 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <div class="w-1 h-4 bg-emerald-500 rounded-full"></div> 2. Available Chips
              </h2>
              <table class="w-full text-left border-collapse">
                <tbody>${scheduleRows}</tbody>
              </table>
              <p class="text-[10px] text-slate-400 mt-4 italic">* 予約がなく、かつ締切(LeadTime)を過ぎていない枠です</p>
            </section>

            <section class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
              <h2 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <div class="w-1 h-4 bg-amber-500 rounded-full"></div> 3. Active Slots
              </h2>
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="text-[10px] text-slate-400 uppercase border-b">
                    <th class="p-3">ID</th><th class="p-3">Details</th><th class="p-3 text-center">Status</th><th class="p-3">Payment ID</th>
                  </tr>
                </thead>
                <tbody>${slotRows}</tbody>
              </table>
            </section>
          </div>
        </div>
      </body>
      </html>
    `);

  } catch (e: any) {
    return c.html(html`<div class="p-10 text-red-600 font-mono">Critical Error: ${e.message}</div>`, 500);
  }
});