/**
 * @file 12_calendar.tsx
 * @description 【デバッグ最優先】カレンダー連動型DBデータ取得テスト
 */
import { Hono } from 'hono';
import { html } from 'hono/html';
import { generateCalendarData } from '../../lib/calendar-logic';

type Bindings = {
  shizentaiga_db: D1Database;
}

export const test12 = new Hono<{ Bindings: Bindings }>();

// A. メイン画面（カレンダー表示）
test12.get('/', (c) => {
  const days = generateCalendarData(new Date());
  
  return c.html(html`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>DB Debug Calendar</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://unpkg.com/htmx.org@1.9.10"></script>
    </head>
    <body class="bg-slate-50 p-4">
      <div class="max-w-2xl mx-auto space-y-4">
        <h1 class="text-xl font-bold text-slate-800">Step 3: DB Integration Test</h1>
        
        <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div class="grid grid-cols-7 gap-1">
            ${['日', '月', '火', '水', '木', '金', '土'].map(w => html`<div class="text-center text-[10px] font-bold text-slate-400 py-1">${w}</div>`)}
            ${days.map(day => html`
              <div 
                class="py-3 text-center cursor-pointer border rounded hover:bg-blue-50 transition-all ${!day.isCurrentMonth ? 'text-slate-200 border-transparent' : 'text-slate-700 border-slate-100'}"
                hx-get="/_debug/test12/query"
                hx-vals='{"date": "${day.dateStr}"}'
                hx-target="#db-output"
                onclick="document.querySelectorAll('.calendar-cell').forEach(e=>e.classList.remove('bg-blue-100','border-blue-500')); this.classList.add('bg-blue-100','border-blue-500')"
              >
                ${day.dayNum}
              </div>
            `)}
          </div>
        </div>

        <div class="bg-slate-900 rounded-xl p-4 shadow-inner min-h-50">
          <div class="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-widest">Database Output</div>
          <div id="db-output" class="text-white font-mono text-sm leading-relaxed">
            カレンダーの日付をクリックすると、その日の「生チップ(staff_schedules)」を表示します。
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
});

// B. DBクエリ実行エンドポイント
test12.get('/query', async (c) => {
  const dateStr = c.req.query('date');
  
  if (!dateStr) return c.html(`<span class="text-red-400">Error: No date provided</span>`);

  try {
    // 最小限のSELECT文：その日の生チップがあるか確認
    const { results } = await c.env.shizentaiga_db.prepare(`
      SELECT schedule_id, start_at_unix 
      FROM staff_schedules 
      WHERE date_string = ? 
      ORDER BY start_at_unix ASC
    `).bind(dateStr).all();

    if (results.length === 0) {
      return c.html(`
        <div class="text-amber-400 italic">
          [${dateStr}] データが見つかりません。<br>
          staff_schedulesテーブルにこの日付のレコードがあるか確認してください。
        </div>
      `);
    }

    // 結果をテーブル形式で出力（デバッグ用）
    const rows = results.map((r: any) => {
      const time = new Date(r.start_at_unix * 1000).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      return `<tr><td class="pr-4 text-blue-400">${time}</td><td>ID: ${r.schedule_id}</td></tr>`;
    }).join('');

    return c.html(`
      <div class="text-emerald-400 font-bold mb-2">FOUND: ${results.length} chips for ${dateStr}</div>
      <table class="w-full">${rows}</table>
    `);

  } catch (err: any) {
    return c.html(`<span class="text-red-500 font-bold">DB ERROR: ${err.message}</span>`);
  }
});