/**
 * @file Services.tsx
 * @description 
 * 予約ページの「全体レイアウト」を統括する親コンポーネント。
 * * * ■ 役割と設計思想:
 * 1. サーバーサイド・データ統合: 
 * HonoのSSRを活用し、プラン情報(plans)および予約空き状況(slots)をDBから直接取得。
 * 2. 厳格なDB依存 (Single Source of Truth):
 * 他店舗展開を見据え、ソースコードへのプラン情報のハードコーディングを廃止。
 * DBに登録されたデータのみを表示することで、店舗間のデータ混線を物理的に防止する。
 */

import { html, raw } from 'hono/html'

/* --- DATA & CONSTANTS --- */
// services の参照を廃止したため、BUSINESS_INFO は必要に応じて他の用途で使用します
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
import { getPlansFromDB } from '../db/plan-db'

export const Services = async (c: any) => {
  /* -------------------------------------------------------------------------- */
  /* 1. DATA PREPARATION (サーバーサイドでのデータ準備)
  /* -------------------------------------------------------------------------- */
  const currentDate = new Date();
  
  // カレンダーの表示基盤を生成
  const calendarDays = generateCalendarData(currentDate);
  
  /**
   * プラン情報の取得
   * 【DB完全依存モード】
   * info.ts の静的データは使用せず、DBの結果をそのまま View へ渡します。
   * データが0件の場合のハンドリングは ServicePlanList コンポーネント側で行います。
   */
  const displayPlans = await getPlansFromDB(c);

  // DBから予約枠データを取得
  const rawSlots = await getAvailableSlotsFromDB(c);

  // フロントエンド用データ調整
  const availableSlots = rawSlots.map(slot => ({ 
    ...slot, 
    date: slot.date_string 
  }));

  // 初期表示の日付特定
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
          
          ${ServicePlanList(displayPlans)}
          
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

        <div id="slot-list-container" class="mb-12"
            hx-get="/services/slots?date=${firstAvailableDate}"
            hx-trigger="load"
        >
            <p class="text-sm text-gray-400 text-center py-8 border-2 border-dashed border-gray-100 rounded-xl">
                読み込み中...
            </p>
        </div>

        <div id="error-display" class="hidden mb-12 p-4 bg-red-50 text-red-500 text-sm rounded-lg text-center">
          通信エラーが発生しました。ページを再読み込みしてください。
        </div>

        ${ConsultantSection()}
      </div>

      ${BookingFooter()}

      <script>
        /**
         * HTMX ネットワークエラーハンドリング
         */
        document.body.addEventListener('htmx:responseError', function(evt) {
          const errorDiv = document.getElementById('error-display');
          if (errorDiv) errorDiv.classList.remove('hidden');
        });
      </script>
    </body>
  `
}