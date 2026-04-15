import { Hono } from 'hono';
import { html } from 'hono/html';
import { fromUnixTime, addMinutes } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * [型定義] 
 * 画面に表示する「予約可能な開始時間」の最小ユニット
 */
interface AvailableSlot {
  display_date: string;
  display_time: string;
  start_unix: number;
}

type Bindings = {
  shizentaiga_db: D1Database;
}

export const test09 = new Hono<{ Bindings: Bindings }>();

const TIME_ZONE = 'Asia/Tokyo';

/**
 * 予約ロジック・デバッグシミュレーター (v3.0 Grid-Atomic 対応)
 */
test09.get('/', async (c) => {
  try {
    // ---------------------------------------------------------
    // 1. クエリパラメータの取得 (UIからの動的入力)
    // ---------------------------------------------------------
    const duration = parseInt(c.req.query('duration') || '90'); 
    const buffer = parseInt(c.req.query('buffer') || '30');     
    const slotStep = parseInt(c.req.query('step') || '60');

    // ---------------------------------------------------------
    // 2. データベース(D1)からのチップ抽出 (Supply: 供給)
    // ---------------------------------------------------------
    // v3.0では「空きチップ」を探すために、予約(reservation_grid)に紐づいていない
    // staff_schedules を取得します。
    const query = `
      SELECT s.* FROM staff_schedules s
      LEFT JOIN reservation_grid rg ON s.schedule_id = rg.schedule_id
      WHERE rg.slot_id IS NULL
      ORDER BY s.start_at_unix ASC
      LIMIT 200
    `;
    const { results: rawChips } = await c.env.shizentaiga_db.prepare(query).all();
    const chips = (rawChips || []) as any[];

    // ---------------------------------------------------------
    // 3. 連続チップの判定と予約枠生成アルゴリズム
    // ---------------------------------------------------------
    const finalSlots: AvailableSlot[] = [];
    const requiredTotalMin = duration + buffer; // 合計必要時間（例: 120分）

    /**
     * [アルゴリズム解説]
     * 各チップを「開始点」と仮定し、そこから連続して必要な時間分のチップが
     * 揃っているかを走査します。
     */
    chips.forEach((baseChip) => {
      const baseUnix = baseChip.start_at_unix;
      
      // このチップを開始点としたとき、必要な終了時刻を計算
      const targetEndUnix = baseUnix + (requiredTotalMin * 60);

      // 必要な連続チップが全て chips 配列内に存在するかチェック
      // (簡易実装：実際のプロダクションでは、より高速な Map 化や SQL での判定を推奨)
      let isContinuous = true;
      for (let time = baseUnix; time < targetEndUnix; time += 30 * 60) {
        if (!chips.some(c => c.start_at_unix === time)) {
          isContinuous = false;
          break;
        }
      }

      // 条件を満たし、かつ slotStep (グリッド) の制約に合う場合のみ採用
      const jstDate = fromUnixTime(baseUnix);
      const minutes = jstDate.getUTCMinutes() + (jstDate.getUTCHours() * 60) + 540; // 簡易JST変換
      
      if (isContinuous && (minutes % slotStep === 0)) {
        finalSlots.push({
          display_date: formatInTimeZone(fromUnixTime(baseUnix), TIME_ZONE, 'yyyy-MM-dd'),
          display_time: formatInTimeZone(fromUnixTime(baseUnix), TIME_ZONE, 'HH:mm'),
          start_unix: baseUnix
        });
      }
    });

    // ---------------------------------------------------------
    // 4. HTMLレンダリング (UI構成を最新モデルへ最適化)
    // ---------------------------------------------------------
    return c.html(html`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <title>Grid Logic Debug (v3.0)</title>
      </head>
      <body class="bg-slate-50 p-4 sm:p-8 text-slate-800 font-sans">
        <div class="max-w-2xl mx-auto space-y-6">
          
          <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h1 class="text-lg font-bold mb-4 flex items-center gap-2">
              <span class="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded">v3.0</span>
              予約ロジック・シミュレーター
            </h1>
            <form method="get" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-tighter italic">1. Plan Duration (min)</label>
                <select name="duration" class="w-full border p-2 rounded text-sm font-bold bg-slate-50 cursor-pointer">
                  <option value="60" ${duration === 60 ? 'selected' : ''}>60分プラン</option>
                  <option value="90" ${duration === 90 ? 'selected' : ''}>90分プラン</option>
                  <option value="120" ${duration === 120 ? 'selected' : ''}>120分プラン</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-tighter italic">2. Interval Buffer (min)</label>
                <select name="buffer" class="w-full border p-2 rounded text-sm font-bold bg-slate-50 cursor-pointer">
                  <option value="0" ${buffer === 0 ? 'selected' : ''}>なし（連続）</option>
                  <option value="30" ${buffer === 30 ? 'selected' : ''}>30分（清掃・休憩）</option>
                  <option value="60" ${buffer === 60 ? 'selected' : ''}>60分（余裕）</option>
                </select>
              </div>
              <div class="sm:col-span-2 flex items-center gap-4 border-t pt-4">
                <div class="flex-1">
                  <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-tighter italic">3. UI Display Step (Grid)</label>
                  <select name="step" class="w-full border p-2 rounded text-sm font-bold bg-slate-50 cursor-pointer">
                    <option value="60" ${slotStep === 60 ? 'selected' : ''}>60分間隔で表示</option>
                    <option value="30" ${slotStep === 30 ? 'selected' : ''}>30分間隔で表示</option>
                  </select>
                </div>
                <button type="submit" class="mt-5 bg-slate-800 text-white px-8 py-2 rounded-lg font-bold text-xs hover:bg-slate-900 transition uppercase tracking-widest shadow-md">
                  Recalculate
                </button>
              </div>
            </form>
          </div>

          <div class="bg-emerald-600 p-8 rounded-3xl shadow-xl">
            <header class="flex justify-between items-center mb-6 border-b border-emerald-500 pb-4">
              <h2 class="text-white text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Final Available Slots</h2>
              <span class="bg-white/20 text-white px-3 py-1 rounded-full text-[10px] font-bold">
                Required: ${duration + buffer} min (${(duration + buffer) / 30} chips)
              </span>
            </header>
            
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              ${finalSlots.length === 0 
                ? html`<p class="col-span-full text-center text-white opacity-60 py-10 text-sm border-2 border-dashed border-emerald-400 rounded-2xl">チップ不足により枠を生成できません</p>`
                : finalSlots.map((s) => html`
                    <button class="bg-white text-emerald-700 py-4 rounded-2xl font-black shadow-lg hover:bg-emerald-50 transition transform hover:scale-[1.02] active:scale-95 group">
                      <span class="block text-[9px] opacity-40 leading-none mb-1">${s.display_date}</span>
                      ${s.display_time}〜
                    </button>
                  `)
              }
            </div>
          </div>

          <div class="bg-slate-900 text-slate-400 p-5 rounded-xl font-mono text-[10px] overflow-auto max-h-64 shadow-inner border border-slate-800">
            <p class="text-slate-500 uppercase font-bold tracking-widest mb-2 border-b border-slate-800 pb-1">Raw Supply Chips (staff_schedules)</p>
            ${chips.length === 0 
              ? 'No supply chips found.' 
              : chips.map((c: any) => html`
                  <div class="py-1 border-b border-slate-800/50 flex justify-between group">
                    <span>${c.date_string} <span class="text-blue-500">${formatInTimeZone(fromUnixTime(c.start_at_unix), TIME_ZONE, 'HH:mm')}</span></span>
                    <span class="text-slate-600 group-hover:text-slate-400 uppercase text-[8px] tracking-tighter">${c.schedule_id}</span>
                  </div>
                `)}
          </div>

        </div>
      </body>
      </html>
    `);

  } catch (e: any) {
    console.error("Critical Error in test09:", e);
    return c.text(`❌ Logic Error: ${e.message}`);
  }
});