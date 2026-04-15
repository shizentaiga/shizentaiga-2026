import { Hono } from 'hono';

/**
 * 環境変数の型定義
 */
type Bindings = {
  shizentaiga_db: D1Database;
}

/**
 * v3.0 グリッド・アトミックモデル用の型定義
 */
interface Plan {
  plan_id: string;
  plan_name: string;
  duration_min: number;
  buffer_min: number; // v3.0 で追加
  price_amount: number;
  plan_status: string;
}

interface StaffSchedule {
  schedule_id: string;
  date_string: string;
  start_at_unix: number;
  // v3.0 では30分固定のため end_at_unix は計算で算出可能だが、デバッグ用に保持
}

interface Slot {
  slot_id: string;
  booking_status: string;
  date_string: string;
  start_at_unix: number;
  actual_duration_min: number;
  stripe_session_id: string | null;
}

export const test11 = new Hono<{ Bindings: Bindings }>();

test11.get('/', async (c) => {
  try {
    const nowUnix = Math.floor(Date.now() / 1000);

    // 1. バインディング & 整合性チェックの設定
    if (!c.env.shizentaiga_db) throw new Error("D1 Binding 'shizentaiga_db' not found.");
    await c.env.shizentaiga_db.prepare('PRAGMA foreign_keys = ON;').run();

    // 2. プラン一覧の取得 (Master Data)
    // buffer_min を含めて取得し、総拘束時間を把握できるようにします。
    const { results: plansRaw } = await c.env.shizentaiga_db.prepare(`
      SELECT plan_id, plan_name, duration_min, buffer_min, price_amount, plan_status 
      FROM plans WHERE plan_status != 'archived' ORDER BY created_at DESC
    `).all();
    const plans = plansRaw as unknown as Plan[];

    // 3. スタッフ稼働チップの取得 (Supply Side)
    // どこの予約にも紐づいていない「生のアトミック・チップ」を確認します。
    const { results: schedulesRaw } = await c.env.shizentaiga_db.prepare(`
      SELECT s.schedule_id, s.date_string, s.start_at_unix 
      FROM staff_schedules s
      LEFT JOIN reservation_grid rg ON s.schedule_id = rg.schedule_id
      WHERE s.start_at_unix > ? AND rg.slot_id IS NULL
      ORDER BY s.start_at_unix ASC LIMIT 50
    `).bind(nowUnix).all();
    const schedules = schedulesRaw as unknown as StaffSchedule[];

    // 4. 生成済み予約スロットの取得 (Inventory Side)
    // 実際に「枠」として成立しているデータを確認。
    const { results: slotsRaw } = await c.env.shizentaiga_db.prepare(`
      SELECT slot_id, booking_status, date_string, start_at_unix, actual_duration_min, stripe_session_id 
      FROM slots WHERE start_at_unix > ? ORDER BY start_at_unix ASC LIMIT 50
    `).bind(nowUnix).all();
    const slots = slotsRaw as unknown as Slot[];

    /* -------------------------------------------------------------------------- */
    /* ビュー生成ロジック
    /* -------------------------------------------------------------------------- */

    // 1. プラン表示（マスター確認）
    const planRows = plans.map(p => {
      const total = p.duration_min + p.buffer_min;
      return `
        <tr>
          <td style="border: 1px solid #e5e7eb; padding: 10px; font-family: monospace; font-size: 0.75rem;">${p.plan_id}</td>
          <td style="border: 1px solid #e5e7eb; padding: 10px;"><strong>${p.plan_name}</strong></td>
          <td style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">
            ${p.duration_min}分 <span style="color:#94a3b8; font-size:0.8rem;">(+${p.buffer_min})</span>
            <div style="font-size: 0.7rem; color: #6366f1;">Total: ${total}min</div>
          </td>
          <td style="border: 1px solid #e5e7eb; padding: 10px; text-align: right; font-weight: bold;">¥${Number(p.price_amount).toLocaleString()}</td>
        </tr>
      `;
    }).join('');

    // 2. 空きチップ表示（供給確認）
    const scheduleRows = schedules.map(s => {
      const timeStr = new Date(s.start_at_unix * 1000).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      return `
        <tr style="font-size: 0.8rem;">
          <td style="border: 1px solid #e5e7eb; padding: 8px;">${s.date_string}</td>
          <td style="border: 1px solid #e5e7eb; padding: 8px; font-weight: 600; color: #059669;">${timeStr}</td>
          <td style="border: 1px solid #e5e7eb; padding: 8px; font-size: 0.65rem; color: #94a3b8;">30 min chip</td>
        </tr>
      `;
    }).join('');

    // 3. 予約スロット表示（在庫・需要確認）
    const slotRows = slots.map(s => {
      const statusColors: any = { booked: '#10b981', pending: '#f59e0b', canceled: '#ef4444' };
      const startTime = new Date(s.start_at_unix * 1000).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      const totalTime = s.actual_duration_min;
      
      return `
        <tr style="font-size: 0.8rem;">
          <td style="border: 1px solid #e5e7eb; padding: 10px; font-family: monospace; font-size: 0.7rem;">${s.slot_id}</td>
          <td style="border: 1px solid #e5e7eb; padding: 10px;">
            <div style="font-weight: 600;">${s.date_string} ${startTime}〜</div>
            <div style="font-size: 0.7rem; color: #64748b;">占有: ${totalTime}分 (${totalTime / 30} chips)</div>
          </td>
          <td style="border: 1px solid #e5e7eb; padding: 10px; text-align: center;">
            <span style="color: white; background: ${statusColors[s.booking_status] || '#64748b'}; padding: 2px 8px; border-radius: 99px; font-size: 0.65rem; font-weight: 800; text-transform: uppercase;">
              ${s.booking_status}
            </span>
          </td>
          <td style="border: 1px solid #e5e7eb; padding: 10px; font-family: monospace; font-size: 0.65rem; color: #94a3b8; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${s.stripe_session_id ?? '-'}
          </td>
        </tr>
      `;
    }).join('');

    return c.html(`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>[TEST 11] v3.0 Grid Observer</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-slate-100 font-sans p-6 text-slate-900">
        <div class="max-w-6xl mx-auto space-y-8">
          
          <header class="bg-white p-6 rounded-2xl shadow-sm flex justify-between items-end">
            <div>
              <h1 class="text-xl font-black text-slate-800">[TEST 11] Data Observer <span class="text-blue-600">v3.0</span></h1>
              <p class="text-xs text-slate-500 mt-1 font-mono">Current: ${new Date(nowUnix * 1000).toLocaleString('ja-JP')} (Unix: ${nowUnix})</p>
            </div>
            <div class="text-right">
              <span class="text-[10px] font-bold bg-slate-800 text-white px-2 py-1 rounded">GRID-ATOMIC MODEL</span>
            </div>
          </header>

          <section class="bg-white p-6 rounded-2xl shadow-sm">
            <h2 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <div class="w-2 h-4 bg-indigo-500 rounded-full"></div> 1. Service Plans (Master)
            </h2>
            <table class="w-full border-collapse">
              <thead>
                <tr class="text-left text-[10px] text-slate-400 uppercase border-b border-slate-100">
                  <th class="p-3">Plan ID</th><th class="p-3">Name</th><th class="p-3 text-center">Duration (Buffer)</th><th class="p-3 text-right">Price</th>
                </tr>
              </thead>
              <tbody>${planRows}</tbody>
            </table>
          </section>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <section class="bg-white p-6 rounded-2xl shadow-sm lg:col-span-1">
              <h2 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <div class="w-2 h-4 bg-emerald-500 rounded-full"></div> 2. Raw Supply Chips
              </h2>
              <table class="w-full border-collapse">
                <tbody>${scheduleRows}</tbody>
              </table>
              <p class="text-[10px] text-slate-400 mt-4 italic">* 表示されているのは「まだ予約に紐付いていない」30分単位のチップです</p>
            </section>

            <section class="bg-white p-6 rounded-2xl shadow-sm lg:col-span-2">
              <h2 class="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <div class="w-2 h-4 bg-amber-500 rounded-full"></div> 3. Active Reservation Slots
              </h2>
              <table class="w-full border-collapse">
                <thead>
                  <tr class="text-left text-[10px] text-slate-400 uppercase border-b border-slate-100">
                    <th class="p-3 text-xs">ID</th><th class="p-3 text-xs">Time & Usage</th><th class="p-3 text-center text-xs">Status</th><th class="p-3 text-xs">Stripe ID</th>
                  </tr>
                </thead>
                <tbody>${slotRows}</tbody>
              </table>
            </section>
          </div>

          <footer class="flex justify-between items-center pt-8 border-t border-slate-200 text-slate-400">
            <a href="/_debug/" class="text-sm font-bold text-blue-600 hover:underline">← サンドボックスTOPに戻る</a>
            <p class="text-[10px] uppercase font-bold tracking-tighter">Architecture: Hono + Cloudflare D1 + Grid Atomic</p>
          </footer>

        </div>
      </body>
      </html>
    `);

  } catch (e: any) {
    return c.html(`<div class="p-10 text-red-600 font-mono">Critical Error: ${e.message}</div>`, 500);
  }
});