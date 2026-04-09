/**
 * @file Services.tsx
 * @description サービス予約ページのメインレイアウト。
 * D1データベースの予約枠と静的なサービス情報を統合して描画します。
 * メンテナンス性を高めるため、構造（JSX）と振る舞い（JS）を分離した設計を採用しています。
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
 * @param c Honoコンテキスト。D1接続バインディング等の環境変数を参照します。
 */
export const Services = async (c: any) => {
  /* -------------------------------------------------------------------------- */
  /* 1. DATA PREPARATION (データ準備)
  /* -------------------------------------------------------------------------- */
  
  // 基準日時の取得とカレンダー基本構造の生成
  const currentDate = new Date();
  const calendarDays = generateCalendarData(currentDate);

  // DBから予約可能枠を取得
  const rawSlots = await getAvailableSlotsFromDB(c);

  /**
   * 予約枠データの整形
   * DBの 'date_string' をコンポーネント用プロパティ 'date' にマッピングします。
   */
  const availableSlots = rawSlots.map(slot => ({ 
    ...slot, 
    date: slot.date_string 
  }));

  /**
   * 初期選択状態の特定
   * 予約可能な最短の日付を特定し、初期表示時のアクティブな日付として設定します。
   */
  const firstAvailableDate = availableSlots[0]?.date || "";

  // サーバーサイド時刻を基準とした表示対象年月の生成
  const baseYear = currentDate.getFullYear();
  const baseMonth = currentDate.getMonth() + 1;

  /* -------------------------------------------------------------------------- */
  /* 2. RENDERING (HTML生成)
  /* ※ renderer.tsx で style.css を一括管理しているため、本ソース内でのCSS定義は不要です。
  /*
  /* ⚠️ 懸念：CDN版Tailwindは実行負荷のリスクがあるため、本番リリース時にビルドプロセスへの統合を検討。
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