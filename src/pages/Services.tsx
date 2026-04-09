/**
 * @file Services.tsx
 * @description サービス予約ページのメインレイアウト。
 * D1データベースの予約枠と静的なサービス情報を統合して描画します。
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
  /* 1. DATA PREPARATION (データ準備)
  /* -------------------------------------------------------------------------- */
  const currentDate = new Date();
  const calendarDays = generateCalendarData(currentDate);
  const rawSlots = await getAvailableSlotsFromDB(c);

  const availableSlots = rawSlots.map(slot => ({ 
    ...slot, 
    date: slot.date_string 
  }));

  const firstAvailableDate = availableSlots[0]?.date || "";
  const baseYear = currentDate.getFullYear();
  const baseMonth = currentDate.getMonth() + 1;

  /* -------------------------------------------------------------------------- */
  /* 2. RENDERING (HTML生成)
  /* -------------------------------------------------------------------------- */

  return html`
    <script src="https://cdn.tailwindcss.com"></script>

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

        ${ConsultantSection()}
      </div>

      ${BookingFooter()}

      <script>
        /**
         * サーバー側のデータをグローバル変数として定義
         * raw() を使用してHTMLエスケープを防ぎ、正しいJSONとして渡します
         */
        window.AVAILABLE_SLOTS = ${raw(JSON.stringify(availableSlots || []))};
      </script>
      <script src="/js/booking-logic.js"></script> </body>
  `
}