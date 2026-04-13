/**
 * @file Services.tsx
 * @description サービス予約ページのメインレンダラー。
 * * [Programmer Note: 技術スタックの注意点]
 * 1. 物理隔離: BUSINESS_INFO.shopName を使用し、他店舗データの混入を防止します。
 * 2. CDN依存: 現在 unpkg(HTMX) / Tailwindを使用。商用時はセルフホストへの移行を推奨。
 * 3. 日付処理: Dateオブジェクトの「0開始月」等の混乱を避けるため、date-fnsを採用。
 */

import { html } from 'hono/html'
import { Context } from 'hono'
import { format } from 'date-fns'
import { BUSINESS_INFO } from '../constants/info'

/* --- ⚙️ LOGIC & DATA ACCESS --- */
import { generateCalendarData } from '../lib/calendar-logic'
import { getAvailableChipsFromDB } from '../db/booking-db'
import { getPlansFromDB } from '../db/plan-db'

/* --- 🧱 UI COMPONENTS --- */
import { ServicePlanList } from '../components/Booking/ServicePlanCard'
import { CalendarSection } from '../components/Booking/CalendarSection'
import { ConsultantSection } from '../components/Layout/ConsultantSection'
import { BookingFooter } from '../components/Booking/BookingFooter'
import { SlotList } from '../components/Booking/SlotList'

export const Services = async (c: Context) => {
  /* --- 🛠️ SERVER LOGIC (Programmer Area) --- */
  
  // 基準時刻の取得（注: new Date() はSSR実行時のサーバー時刻を取得）
  const currentDate = new Date();
  const calendarDays = generateCalendarData(currentDate);
  
  /**
   * 1. 店舗に紐づくプラン一覧の取得
   * info.ts の shopName ("善幽") を渡し、該当店舗の active なプランのみを抽出します。
   */
  const displayPlans = await getPlansFromDB(c, BUSINESS_INFO.shopName);
  const defaultPlanId = displayPlans[0]?.plan_id || "";

  /**
   * 2. 稼働状況（チップ）の取得
   * DBから「予約可能なチップ」を取得し、カレンダーの空き状況ドットに使用します。
   */
  const rawChips = await getAvailableChipsFromDB(c);
  const availableDates = rawChips.map(chip => ({ date: chip.date_string }));
  const firstAvailableDate = availableDates[0]?.date || "";

  /**
   * 3. 日付表示用の計算
   * date-fnsを使用することで、JS標準の「月+1が必要」という落とし穴を回避。
   */
  const baseYear = parseInt(format(currentDate, 'yyyy'));
  const baseMonth = parseInt(format(currentDate, 'MM'));

  /* --- 🎨 VIEW / DESIGN (Designer Area) --- */
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
          <div id="plan-selection-area">
            ${ServicePlanList(displayPlans)}
          </div>
        </section>

        <div id="calendar-container" class="mb-12">
          ${CalendarSection(
            calendarDays, 
            availableDates, 
            firstAvailableDate, 
            baseYear, 
            baseMonth
          )}
        </div>

        <div id="slot-list-container" class="mb-12">
          ${await SlotList(c, firstAvailableDate, defaultPlanId)}
        </div>

        <div id="error-display" class="hidden mb-12 p-4 bg-red-50 text-red-500 text-[10px] rounded-sm text-center tracking-widest">
          データの取得中にエラーが発生しました。通信環境を確認し、ページをリロードしてください。
        </div>

        ${ConsultantSection()}
      </div>

      ${BookingFooter()}

      <script>
        /**
         * [Programmer Note] イベントリスナー
         * プラン変更時にHTMXを使用してスロット表示(#slot-list-container)を非同期更新。
         */
        document.addEventListener('change', function(e) {
          if (e.target && e.target.name === 'plan_id') {
            const selectedPlanId = e.target.value;
            const selectedCell = document.querySelector('.calendar-day-cell[data-selected="true"]');
            
            if (selectedCell) {
              htmx.ajax('GET', '/services/slots', {
                values: { 
                  date: selectedCell.getAttribute('data-date'),
                  plan_id: selectedPlanId 
                },
                target: '#slot-list-container'
              });
            }
          }
        });

        /**
         * HTMXエラーハンドリング
         */
        document.body.addEventListener('htmx:responseError', function(evt) {
          document.getElementById('error-display')?.classList.remove('hidden');
        });

        document.body.addEventListener('htmx:afterOnLoad', function(evt) {
          if (evt.detail.target.id === 'slot-list-container') {
             document.getElementById('error-display')?.classList.add('hidden');
          }
        });
      </script>
    </body>
  `
}