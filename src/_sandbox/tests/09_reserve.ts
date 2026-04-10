import { Hono } from 'hono';
import { html } from 'hono/html';
// 【date-fns】Named ImportによりTree-shakingを効かせ、Bundle Sizeを最小化
import { fromUnixTime, addMinutes } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * [型定義] 
 * 予約スロットの要素を定義。型安全性を高め、UI側での参照ミスを防止します。
 */
interface AvailableSlot {
  display_date: string;
  display_time: string;
  start_unix: number;
}

type Bindings = {
  shizentaiga_db: D1Database;
};

export const test09 = new Hono<{ Bindings: Bindings }>();

/**
 * 予約空き枠の動的シミュレーション・デバッグエンドポイント
 */
test09.get('/', async (c) => {
  try {
    // ---------------------------------------------------------
    // 1. クエリパラメータの取得と型安全な数値変換
    // ---------------------------------------------------------
    const duration = parseInt(c.req.query('duration') || '90'); 
    const buffer = parseInt(c.req.query('buffer') || '30');     
    const slotStep = parseInt(c.req.query('step') || '60');

    // ---------------------------------------------------------
    // 2. データベース(D1)からのデータ抽出
    // ---------------------------------------------------------
    const { results } = await c.env.shizentaiga_db
      .prepare("SELECT * FROM slots WHERE status = 'available' ORDER BY date_string ASC LIMIT 100")
      .all();

    const rawSlots = results || [];

    // ---------------------------------------------------------
    // 3. 予約枠の分割・生成アルゴリズム (date-fns リファクタリング版)
    // ---------------------------------------------------------
    const finalSlots: AvailableSlot[] = [];
    const TIME_ZONE = 'Asia/Tokyo';

    rawSlots.forEach((slot: any) => {
      const startUnix = slot.start_at_unix;
      const totalDuration = slot.slot_duration; 
      
      if (!startUnix || !totalDuration) return;

      // 【ドメイン知識の固定】ビジネス用語としての「分」に基づき、必要専有時間を定義
      const requiredTime = duration + buffer;

      /**
       * [分割ループ]
       * date-fns の addMinutes を使用し、「分」という語彙のまま時間を進めます。
       * これにより、秒への変換ミス等のマジックナンバー起因のバグを排除します。
       */
      for (let offset = 0; offset <= totalDuration - requiredTime; offset += slotStep) {
        
        // 1. 基準となる開始時刻を生成
        const baseDate = fromUnixTime(startUnix);
        // 2. オフセット分を「加算」して、具体的な予約開始時間を算出
        const currentStartDate = addMinutes(baseDate, offset);
        
        // 【JST保証】formatInTimeZone により、実行環境がUTCでも確実に日本時間で整形
        const dateStr = formatInTimeZone(currentStartDate, TIME_ZONE, 'yyyy-MM-dd');
        const timeStr = formatInTimeZone(currentStartDate, TIME_ZONE, 'HH:mm');

        finalSlots.push({
          display_date: dateStr,
          display_time: timeStr,
          start_unix: Math.floor(currentStartDate.getTime() / 1000)
        });
      }
    });

    // ---------------------------------------------------------
    // 4. HTMLレンダリング (UI構成は維持)
    // ---------------------------------------------------------
    return c.html(html`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <title>Reservation Logic Debug (date-fns)</title>
      </head>
      <body class="bg-slate-50 p-4 sm:p-8 text-slate-800 font-sans">
        <div class="max-w-2xl mx-auto space-y-6">
          
          <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
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
                  <option value="60" ${buffer === 60 ? 'selected' : ''}>60分（余裕を持たせる）</option>
                </select>
              </div>
              <div class="sm:col-span-2 flex items-center gap-4 border-t pt-4">
                <div class="flex-1">
                  <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-tighter italic">3. Start Time Step (Grid)</label>
                  <select name="step" class="w-full border p-2 rounded text-sm font-bold bg-slate-50 cursor-pointer">
                    <option value="60" ${slotStep === 60 ? 'selected' : ''}>60分単位</option>
                    <option value="30" ${slotStep === 30 ? 'selected' : ''}>30分単位</option>
                  </select>
                </div>
                <button type="submit" class="mt-5 bg-blue-600 text-white px-8 py-2 rounded-lg font-bold text-xs hover:bg-blue-700 transition uppercase tracking-widest shadow-md shadow-blue-200 active:translate-y-0.5">
                  Apply Changes
                </button>
              </div>
            </form>
          </div>

          <div class="bg-blue-600 p-8 rounded-3xl shadow-xl transition-all">
            <header class="flex justify-between items-center mb-6 border-b border-blue-500 pb-4">
              <h2 class="text-white text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Available Slots (Output)</h2>
              <span class="bg-blue-500/50 text-white px-3 py-1 rounded-full text-[10px] font-bold">
                Total Gap: ${duration + buffer} min
              </span>
            </header>
            
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              ${finalSlots.length === 0 
                ? html`<p class="col-span-full text-center text-white opacity-60 py-10 text-sm border-2 border-dashed border-blue-400 rounded-2xl">条件に合致する枠が見つかりませんでした</p>`
                : finalSlots.map((s) => html`
                    <button class="bg-white text-blue-700 py-4 rounded-2xl font-black shadow-lg hover:bg-blue-50 transition transform hover:scale-[1.02] active:scale-95 group">
                      <span class="block text-[9px] opacity-40 leading-none mb-1 group-hover:opacity-60">${s.display_date}</span>
                      ${s.display_time}〜
                    </button>
                  `)
              }
            </div>
          </div>

          <div class="bg-slate-900 text-slate-400 p-5 rounded-xl font-mono text-[10px] overflow-auto max-h-64 shadow-inner border border-slate-800">
            <div class="flex justify-between items-center border-b border-slate-800 pb-2 mb-2">
              <p class="text-slate-500 uppercase font-bold tracking-widest underline decoration-slate-700">Raw DB Content (JST Debug via date-fns)</p>
              <span class="bg-slate-800 px-2 py-0.5 rounded text-slate-500">Record Count: ${rawSlots.length}</span>
            </div>
            ${rawSlots.length === 0 
              ? 'Database is currently empty.' 
              : rawSlots.map((s: any) => {
                  const jstTime = s.start_at_unix 
                    ? formatInTimeZone(fromUnixTime(s.start_at_unix), TIME_ZONE, 'HH:mm') 
                    : 'Invalid';
                  return html`
                    <div class="py-1.5 border-b border-slate-800/50 hover:bg-slate-800/50 text-slate-300 italic flex flex-col gap-0.5 group">
                      <div class="flex justify-between">
                        <span>${s.date_string} <span class="text-slate-600 ml-1 select-none">[Status: ${s.status}]</span></span>
                        <span class="text-blue-500/80 font-bold group-hover:text-blue-400 tracking-tighter italic">Total ${s.slot_duration || 0} min window</span>
                      </div>
                      <div class="text-[9px] text-slate-500">
                        Start Point (Unix): ${s.start_at_unix || '0'} <span class="text-slate-600 ml-2 font-sans not-italic">➔ JST Start: ${jstTime}</span>
                      </div>
                    </div>
                  `;
                })}
          </div>

        </div>
      </body>
      </html>
    `);

  } catch (e: any) {
    console.error("Critical Error in test09:", e);
    return c.text(`❌ Critical System Error: ${e.message}\nCheck logs for more details.`);
  }
});