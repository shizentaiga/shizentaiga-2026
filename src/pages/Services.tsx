/**
 * @file Services.tsx
 * @description 
 * 予約ページの全体レイアウトを統括。
 * v3.0 グリッド・アトミックモデルへの移行に伴い、
 * カレンダーの「空き状況表示」をスタッフの供給（Chips）ベースに刷新しました。
 */

import { html } from 'hono/html'

/* --- LOGIC --- */
import { generateCalendarData } from '../lib/calendar-logic'

/* --- COMPONENTS --- */
import { ServicePlanList } from '../components/ServicePlanCard'
import { CalendarSection } from '../components/CalendarSection'
import { ConsultantSection } from '../components/ConsultantSection'
import { BookingFooter } from '../components/BookingFooter'

/* --- DB ACCESS --- */
// v3.0: 予約済みデータではなく、供給チップ（Chips）を取得する関数へ変更
import { getAvailableChipsFromDB } from '../db/booking-db'
import { getPlansFromDB } from '../db/plan-db'

export const Services = async (c: any) => {
  /* -------------------------------------------------------------------------- */
  /* 1. DATA PREPARATION (サーバーサイドでのデータ準備)
  /* -------------------------------------------------------------------------- */
  const currentDate = new Date();
  
  // カレンダーの基本構造（日付配列）を生成
  const calendarDays = generateCalendarData(currentDate);
  
  /**
   * プラン情報の取得
   * v3.0: buffer_min を含むマスターデータを取得。
   * プランが選択されていない状態（初期表示）での制御に使用します。
   */
  const displayPlans = await getPlansFromDB(c);
  const defaultPlanId = displayPlans[0]?.plan_id || "";

  /**
   * カレンダー点灯用のチップデータ取得
   * v3.0: 「スタッフの空きチップ」が存在する日を「予約可能日」として扱います。
   */
  const rawChips = await getAvailableChipsFromDB(c);

  // フロントエンド用データ調整（カレンダーコンポーネントが期待する 'date' キーにマッピング）
  const availableDates = rawChips.map(chip => ({ 
    date: chip.date_string 
  }));

  // 初期表示時にフォーカスする日付（一番近い空き日、または今日）
  const firstAvailableDate = availableDates[0]?.date || "";
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
            availableDates, // slots ではなく chips ベースのデータを渡す
            firstAvailableDate, 
            baseYear, 
            baseMonth
          )}
        </div>

        <div id="slot-list-container" class="mb-12"
            hx-get="/services/slots?date=${firstAvailableDate}&plan_id=${defaultPlanId}"
            hx-trigger="load"
        >
            <div class="flex flex-col items-center py-12">
              <div class="animate-spin h-6 w-6 border-2 border-gray-900 border-t-transparent rounded-full mb-4"></div>
              <p class="text-xs text-gray-400 tracking-widest uppercase">Finding available slots...</p>
            </div>
        </div>

        <div id="error-display" class="hidden mb-12 p-4 bg-red-50 text-red-500 text-xs rounded-lg text-center">
          予約データの取得中にエラーが発生しました。ページをリロードしてください。
        </div>

        ${ConsultantSection()}
      </div>

      ${BookingFooter()}

      <script>
        /**
         * v3.0 フロントエンド・インタラクション
         * プラン選択や日付選択が変更された際、HTMXリクエストをトリガーする補助関数
         */
        function refreshSlots() {
          const container = document.getElementById('slot-list-container');
          // 現在選択されている date と plan_id を集計して htmx.ajax() 等で更新するロジックをここに集約可能
          htmx.trigger(container, 'refresh');
        }

        document.body.addEventListener('htmx:responseError', function(evt) {
          const errorDiv = document.getElementById('error-display');
          if (errorDiv) errorDiv.classList.remove('hidden');
        });
      </script>
    </body>
  `
}