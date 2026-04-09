/**
 * @file Services.tsx
 * @description 
 * 予約ページの「全体レイアウト」を統括する親コンポーネント。
 * * ■ 役割:
 * 1. サーバーサイドでDB（D1）から最新の予約空き状況を取得する。
 * 2. ページ全体の骨組み（ヘッダー、プラン選択、カレンダー枠、フッター）を構築する。
 * 3. HTMX（通信ライブラリ）を起動し、部分的な画面更新の土台を作る。
 */

import { html, raw } from 'hono/html'

/* --- DATA & CONSTANTS --- */
import { BUSINESS_INFO } from '../constants/info'

/* --- LOGIC --- */
import { generateCalendarData } from '../lib/calendar-logic'

/* --- COMPONENTS --- */
import { ServicePlanList } from '../components/ServicePlanCard'
import { CalendarSection } from '../components/CalendarSection'
import { ConsultantSection } from '../components/ConsultantSection'
import { BookingFooter } from '../components/BookingFooter'

/* --- DB ACCESS --- */
import { getAvailableSlotsFromDB } from '../db/booking-db'

export const Services = async (c: any) => {
  /* -------------------------------------------------------------------------- */
  /* 1. DATA PREPARATION (サーバーサイドでのデータ準備)
  /* -------------------------------------------------------------------------- */
  const currentDate = new Date();
  
  // カレンダーの「日付の器」を生成（lib/calendar-logic.ts を参照）
  const calendarDays = generateCalendarData(currentDate);
  
  // DBから予約枠データを直接取得（API経由ではなく、サーバー内部で完結）
  const rawSlots = await getAvailableSlotsFromDB(c);

  // フロントエンドで扱いやすいように、DBのカラム名を一部調整
  const availableSlots = rawSlots.map(slot => ({ 
    ...slot, 
    date: slot.date_string 
  }));

  const firstAvailableDate = availableSlots[0]?.date || "";
  const baseYear = currentDate.getFullYear();
  const baseMonth = currentDate.getMonth() + 1;

  /* -------------------------------------------------------------------------- */
  /* 2. RENDERING (HTML構造の構築)
  /* -------------------------------------------------------------------------- */

  return html`
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/htmx.org@1.9.10"></script>

    <body class="bg-gray-50 text-gray-800 leading-relaxed pb-40">
      
      <header class="bg-white py-12 text-center border-b border-gray-100">
        <h1 class="text-xl font-medium tracking-[0.2em] uppercase text-gray-900">Service Booking</h1>
        <p class="text-[10px] text-gray-600 mt-2 tracking-widest">PRIVATE CONSULTATION</p>
      </header>

      <div class="max-w-3xl mx-auto p-6">
        <section class="mb-12">
          <h2 class="text-xs font-bold tracking-[0.2em] text-gray-600 mb-6 uppercase">01. Select Plan</h2>
          ${ServicePlanList(BUSINESS_INFO.services)}
        </section>

        <div id="calendar-container" class="mb-12">
          ${CalendarSection(
            calendarDays, 
            availableSlots, 
            firstAvailableDate, 
            baseYear, 
            baseMonth
          )}
        </div>

        <div id="slot-list-container" class="mb-12">
           <p class="text-sm text-gray-400 text-center py-8 border-2 border-dashed border-gray-100 rounded-xl">
             カレンダーから希望日を選択してください
           </p>
        </div>

        <div id="error-display" class="hidden mb-12 p-4 bg-red-50 text-red-500 text-sm rounded-lg text-center">
          通信エラーが発生しました。ページを再読み込みしてください。
        </div>

        ${ConsultantSection()}
      </div>

      ${BookingFooter()}

      <script>
        document.body.addEventListener('htmx:responseError', function(evt) {
          const errorDiv = document.getElementById('error-display');
          if (errorDiv) errorDiv.classList.remove('hidden');
        });
      </script>
    </body>
  `
}