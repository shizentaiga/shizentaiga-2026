import { Hono } from 'hono';
import { html } from 'hono/html';

/**
 * [型定義] 
 * Cloudflare D1 (SQLiteベースの分散DB) への接続インターフェース。
 * wrangler.json / wrangler.toml の [[d1_databases]] binding設定と一致させる必要がある。
 */
type Bindings = {
  shizentaiga_db: D1Database;
};

export const test09 = new Hono<{ Bindings: Bindings }>();

/**
 * 予約空き枠の動的シミュレーション・デバッグエンドポイント
 * * 【役割】
 * 1. DBから「予約可能な時間の塊（スロット）」を取得。
 * 2. ユーザーが指定した「プラン時間」「バッファ」「開始刻み」に基づき、
 * その塊の中にいくつの予約ポイントが作成できるかを動的に計算・分割する。
 */
test09.get('/', async (c) => {
  try {
    // ---------------------------------------------------------
    // 1. クエリパラメータの取得と型安全な数値変換
    // ---------------------------------------------------------
    // duration (分) : サービス自体の所要時間。
    // buffer   (分) : サービス終了後、次の予約までに必要なインターバル時間（清掃・移動等）。
    // step     (分) : ユーザーに提示する「開始時間」の最小単位（例：1時間おき、30分おき）。
    const duration = parseInt(c.req.query('duration') || '90'); 
    const buffer = parseInt(c.req.query('buffer') || '30');     
    const slotStep = parseInt(c.req.query('step') || '60');

    // ---------------------------------------------------------
    // 2. データベース(D1)からのデータ抽出
    // ---------------------------------------------------------
    // [ステータス: available] のレコードのみを対象とする。
    // [ソート: 日付昇順] ユーザー体験を考慮し、直近の日程から表示。
    const { results } = await c.env.shizentaiga_db
      .prepare("SELECT * FROM slots WHERE status = 'available' ORDER BY date_string ASC LIMIT 100")
      .all();

    // D1の結果がnullまたはundefinedの場合のセーフティガード
    const rawSlots = results || [];

    // ---------------------------------------------------------
    // 3. 予約枠の分割・生成アルゴリズム (Core Logic)
    // ---------------------------------------------------------
    // DBの1レコード（大きな枠）を走査し、条件を満たす表示用ボタン（小枠）へ変換する。
    const finalSlots: any[] = [];

    rawSlots.forEach((slot: any) => {
      // DBカラムの説明:
      // startUnix    : 枠の開始点（10桁のUnix Timestamp / 秒単位）
      // totalDuration: 枠の全体長（分単位）
      const startUnix = slot.start_at_unix;
      const totalDuration = slot.slot_duration; 
      
      // データ不備（NULL等）がある場合はそのレコードをスキップ
      if (!startUnix || !totalDuration) return;

      // [計算] 1回の予約で専有しなければならない合計時間
      const requiredTime = duration + buffer;

      /**
       * [分割ループの解説]
       * DBの開始地点から、step（刻み幅）ずつ時間を進めながらチェックを行う。
       * * [終了条件]
       * (offset + requiredTime) が totalDuration を超える場合、
       * その開始地点で予約を受けると、DB上の枠をはみ出してしまう（＝後ろの予約と被る）ためループを抜ける。
       */
      for (let offset = 0; offset <= totalDuration - requiredTime; offset += slotStep) {
        // offsetは「分」のため、Unix秒に変換（*60）して加算
        const currentStartUnix = startUnix + (offset * 60);
        const startDate = new Date(currentStartUnix * 1000);
        
        // [UI用整形] ISO形式（2026-04-10）への置換
        const dateStr = startDate.toLocaleDateString('ja-JP', { 
          year: 'numeric', month: '2-digit', day: '2-digit' 
        }).replace(/\//g, '-');
        
        // [UI用整形] 24時間表記（14:00）への整形
        const timeStr = startDate.toLocaleTimeString('ja-JP', { 
          hour: '2-digit', minute: '2-digit' 
        });

        finalSlots.push({
          display_date: dateStr,
          display_time: timeStr,
          start_unix: currentStartUnix // 予約実行時に使用する一意のタイムスタンプ
        });
      }
    });

    // ---------------------------------------------------------
    // 4. HTMLレンダリング (Tailwind CSS 使用)
    // ---------------------------------------------------------
    return c.html(html`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <title>Aletheia - Reservation Logic Debug</title>
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
                    <option value="60" ${slotStep === 60 ? 'selected' : ''}>60分単位（キリの良い時間のみ）</option>
                    <option value="30" ${slotStep === 30 ? 'selected' : ''}>30分単位（細かい調整可）</option>
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
                : finalSlots.map((s: any) => html`
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
              <p class="text-slate-500 uppercase font-bold tracking-widest underline decoration-slate-700">Raw DB Content (Database Level)</p>
              <span class="bg-slate-800 px-2 py-0.5 rounded text-slate-500">Record Count: ${rawSlots.length}</span>
            </div>
            ${rawSlots.length === 0 
              ? 'Database is currently empty.' 
              : rawSlots.map((s: any) => {
                  // DBのUnix秒を可読な時刻に変換して表示（データの整合性チェック用）
                  const jstTime = s.start_at_unix ? new Date(s.start_at_unix * 1000).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : 'Invalid';
                  return html`
                    <div class="py-1.5 border-b border-slate-800/50 hover:bg-slate-800/50 text-slate-300 italic flex flex-col gap-0.5 group">
                      <div class="flex justify-between">
                        <span>${s.date_string} <span class="text-slate-600 ml-1 select-none">[Status: ${s.status}]</span></span>
                        <span class="text-blue-500/80 font-bold group-hover:text-blue-400 tracking-tighter italic">Total ${s.slot_duration || 0} min window</span>
                      </div>
                      <div class="text-[9px] text-slate-500">
                        Start Point (Unix): ${s.start_at_unix || '0'} <span class="text-slate-600 ml-2 font-sans not-italic">➔ Local Start: ${jstTime}</span>
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
    // [Error Handling] データベース接続エラーやパースエラーを補足し、画面に出力する。
    console.error("Critical Error in test09:", e);
    return c.text(`❌ Critical System Error: ${e.message}\nCheck logs for more details.`);
  }
});