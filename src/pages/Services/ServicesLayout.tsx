/**
 * @file ServicesLayout.tsx
 * @description サービス予約ページのビュー（テンプレート）部分。
 */

import { html } from 'hono/html'
import { UI_TEXT } from '../../constants/info'

/* --- 🧱 UI COMPONENTS --- */
import { ServicePlanList } from '../../components/Booking/ServicePlanCard'
import { CalendarSection } from '../../components/Booking/CalendarSection'
import { ConsultantSection } from '../../components/Layout/ConsultantSection'
import { BookingFooter } from '../../components/Booking/BookingFooter'
import { SlotList } from '../../components/Booking/SlotList'
import { ServicesClientScript } from './services-client'

/**
 * レイアウトに渡すプロパティの型定義
 */
export interface ServicesLayoutProps {
  ctx: any;
  shopId: string;
  staffId: string;
  displayPlans: any[];
  calendarDays: any[];
  availableDates: { date: string }[];
  firstAvailableDate: string;
  defaultPlanId: string;
  baseYear: number;
  baseMonth: number;
  viewMonthStr: string;
  prevMonthStr: string;
  nextMonthStr: string;
}

/**
 * サービス予約ページのメインレイアウト
 */
export const PageLayout = async (props: ServicesLayoutProps) => {
  return html`
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/htmx.org@1.9.10"></script>
    <body class="bg-gray-50 text-gray-800 leading-relaxed pb-40">
      <header class="bg-white py-12 text-center border-b border-gray-100">
        <h1 class="text-xl font-medium tracking-[0.2em] uppercase text-gray-900">${UI_TEXT.SERVICES.TITLE}</h1>
        <p class="text-[10px] text-gray-600 mt-2 tracking-widest">${UI_TEXT.SERVICES.SUB_TITLE}</p>
      </header>

      <div class="max-w-3xl mx-auto p-6">
        <section class="mb-12">
          <h2 class="text-xs font-bold tracking-[0.2em] text-gray-600 mb-6 uppercase">${UI_TEXT.SERVICES.STEP_PLAN}</h2>
          <div id="plan-selection-area">
            ${ServicePlanList(props.displayPlans)}
          </div>
        </section>

        <div id="calendar-container" class="mb-12">
          ${CalendarSection(
            props.calendarDays, 
            props.availableDates, 
            props.firstAvailableDate, 
            props.baseYear, 
            props.baseMonth,
            props.prevMonthStr,
            props.nextMonthStr
          )}
        </div>

        <div id="slot-list-container" class="mb-12">
          ${await SlotList(props.ctx, props.firstAvailableDate, props.defaultPlanId)}
        </div>

        <div id="error-display" class="hidden mb-12 p-4 bg-red-50 text-red-500 text-[10px] rounded-sm text-center tracking-widest">
          ${UI_TEXT.SERVICES.ERROR_FETCH}
        </div>

        ${ConsultantSection()}
      </div>
      
      ${BookingFooter(props.shopId)} 

      <!-- 外部スクリプト -->
      ${ServicesClientScript()}
    </body>
  `;
}