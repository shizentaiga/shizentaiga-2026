/**
 * @file Services.tsx
 * @description サービス予約ページのメインレイアウト。
 * Cloudflare D1データベースから取得した動的な予約枠と、静的なサービス情報を統合して表示します。
 * 「構造（JSX）」と「振る舞い（JS）」を分離するため、クライアントサイドロジックは外部ファイル化しています。
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

/* --- DB ACCESS --- */
import { getAvailableSlotsFromDB } from '../db/booking-db'

/**
 * サービス予約ページのメインコンポーネント
 * @param c Honoのコンテキスト。D1接続バインディング（shizentaiga_db）を含む環境変数を参照します。
 */
export const Services = async (c: any) => {
  /* -------------------------------------------------------------------------- */
  /* 1. DATA PREPARATION (データ準備)
  /* -------------------------------------------------------------------------- */
  
  // 基準となる現在日時の取得
  const currentDate = new Date();

  // カレンダーの基本構造（日付配列）を生成
  const calendarDays = generateCalendarData(currentDate);

  // DBから動的な予約可能枠を取得（現在以降のスロットを最大100件）
  const rawSlots = await getAvailableSlotsFromDB(c);

  /**
   * 予約枠データの整形
   * DBの 'date_string' をコンポーネントが期待する 'date' キーにマップして、
   * 予約可能な枠のマスターデータ（availableSlots）を作成します。
   */
  const availableSlots = rawSlots.map(slot => ({ 
    ...slot, 
    date: slot.date_string 
  }));

  /**
   * 予約可能な最短の日付を特定
   * 整形済みデータ（availableSlots）の先頭から、初期表示で選択状態にする日付を取得します。
   */
  const firstAvailableDate = availableSlots[0]?.date || "";

  // 表示対象の年月（サーバーサイドの現在時刻を元に生成）
  const baseYear = currentDate.getFullYear();
  const baseMonth = currentDate.getMonth() + 1;

  /* -------------------------------------------------------------------------- */
  /* 2. RENDERING (HTML生成)
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
            availableSlots, 
            firstAvailableDate, 
            baseYear, 
            baseMonth
          )}
        </div>

        ${ConsultantSection()}

      </div>

      ${BookingFooter()}

      <script src="/js/booking-logic.js"></script>

    </body>
  `
}