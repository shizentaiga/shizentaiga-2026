/**
 * @file Services.tsx
 * @description サービス予約ページのメインレイアウト。
 * コンポーネントの統合、および静的アセットとしての外部クライアントスクリプト（JS）の読み込みを行います。
 * * 以前はインラインで記述していたJSを外部ファイル化（booking-logic.js）することで、
 * 「構造（JSX）」と「振る舞い（JS）」を分離し、メンテナンス性を向上させています。
 */

import { html } from 'hono/html'

/* --- DATA & CONSTANTS --- */
import { BUSINESS_INFO } from '../constants/info'

/* --- LOGIC --- */
import { generateCalendarData } from '../lib/calendar-logic'

/* --- COMPONENTS --- */
import { ServicePlanList } from '../components/ServicePlanCard'
import { CalendarSection } from '../components/CalendarSection'
import { ConsultantSection } from '../components/ConsultantSection'
import { BookingFooter } from '../components/BookingFooter'

export const Services = () => {
  /* -------------------------------------------------------------------------- */
  /* 1. DATA PREPARATION
  /* -------------------------------------------------------------------------- */
  const baseDate = new Date();
  const calendarDays = generateCalendarData(baseDate);
  
  // 予約可能な最短の日付を特定（初期表示時のUI状態に利用）
  const firstAvailableDate = BUSINESS_INFO.availableSlots[0]?.date || "";

  // カレンダー表示用の年・月（サーバーサイドで現在時刻を元に生成）
  const currentYear = baseDate.getFullYear();
  const currentMonth = baseDate.getMonth() + 1;

  /* -------------------------------------------------------------------------- */
  /* 2. RENDERING
  /* -------------------------------------------------------------------------- */
  return html`
    <script src="https://cdn.tailwindcss.com"></script>
    
    <style>
      /* 選択状態や装飾に関する Critical CSS
         JSの data-selected 属性の操作と連動して、ボーダーや影を動的に切り替えます */
      .selection-card[data-selected="true"] { border: 2px solid #2c5282; background: rgba(249, 250, 251, 0.9); }
      .selection-card[data-selected="false"] { border: 1px solid #e5e7eb; }
      .selection-card:hover { border-color: #2c5282; }
      
      .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #2c5282; }
      .available-mark { width: 4px; height: 4px; border-radius: 50%; background: #2c5282; margin-top: 2px; }
      .calendar-day-cell[data-selected="true"] { background-color: #f8fafc; box-shadow: inset 0 0 0 2px #2c5282; z-index: 10; }
      
      /* スムーズなセクション切り替えのためのトランジション */
      #calendar-container { transition: all 0.3s ease-in-out; }
    </style>

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

        <div id="calendar-container">
          ${CalendarSection(
            calendarDays, 
            BUSINESS_INFO.availableSlots, 
            firstAvailableDate, 
            currentYear, 
            currentMonth
          )}
        </div>

        ${ConsultantSection()}

      </div>

      ${BookingFooter()}

      <script src="/js/booking-logic.js"></script>

    </body>
  `
}