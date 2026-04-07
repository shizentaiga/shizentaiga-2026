/**
 * @file Services.tsx
 * @description サービス予約ページのメインレイアウト。
 * 各コンポーネント（プラン選択、カレンダー、コンサルタント、フッター）を統合します。
 */

import { html } from 'hono/html'

/* --- DATA & CONSTANTS (静的データ・定数) --- */
import { BUSINESS_INFO } from '../constants/info'             // 屋号、サービス内容、予約枠などの基本情報

/* --- LOGIC (計算・変換処理) --- */
import { generateCalendarData } from '../lib/calendar-logic'    // カレンダー描画用の日付配列を生成するロジック

/* --- COMPONENTS (UI部品) --- */
import { ServicePlanList } from '../components/ServicePlanCard'  // 01. プラン一覧（カード形式）の描画
import { CalendarSection } from '../components/CalendarSection'  // 02. カレンダー本体と枠選択の描画
import { ConsultantSection } from '../components/ConsultantSection' // 03. コンサルタント情報の描画
import { BookingFooter } from '../components/BookingFooter'      // 04. 決済・送信を担うフローティングフッター

export const Services = () => {
  /* -------------------------------------------------------------------------- */
  /* 1. DATA PREPARATION (ロジック部)
  /* -------------------------------------------------------------------------- */
  const baseDate = new Date();
  const calendarDays = generateCalendarData(baseDate);
  
  // 最短予約可能日の特定
  const firstAvailableDate = BUSINESS_INFO.availableSlots[0]?.date || "";

  // 年・月の抽出：CalendarSection への引数
  const currentYear = baseDate.getFullYear();
  const currentMonth = baseDate.getMonth() + 1;

  /* -------------------------------------------------------------------------- */
  /* 2. RENDERING (表示部)
  /* -------------------------------------------------------------------------- */
  return html`
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    
    <style>
      /* Critical CSS: 動的な状態に基づくスタイル */
      .selection-card[data-selected="true"] { border: 2px solid #2c5282; background: rgba(249, 250, 251, 0.9); }
      .selection-card[data-selected="false"] { border: 1px solid #e5e7eb; }
      .selection-card:hover { border-color: #2c5282; }
      
      /* カレンダー関連の装飾 */
      .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #2c5282; }
      .available-mark { width: 4px; height: 4px; border-radius: 50%; background: #2c5282; margin-top: 2px; }
      .calendar-day-cell[data-selected="true"] { background-color: #f8fafc; box-shadow: inset 0 0 0 2px #2c5282; z-index: 10; }
      
      /* アニメーション：カレンダーの表示切り替えを滑らかに */
      #calendar-container { transition: all 0.3s ease-in-out; }
    </style>

    <body class="bg-gray-50 text-gray-800 leading-relaxed pb-40">
      
      <header class="bg-white py-12 text-center border-b border-gray-100">
        <h1 class="text-xl font-medium tracking-[0.2em] uppercase text-gray-900">Service Booking</h1>
        <p class="text-[10px] text-gray-400 mt-2 tracking-widest">PRIVATE CONSULTATION</p>
      </header>

      <div class="max-w-3xl mx-auto p-6">
        
        <section class="mb-12">
          <h2 class="text-xs font-bold tracking-[0.2em] text-gray-400 mb-6 uppercase">01. Select Plan</h2>
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

    </body>
  `
}