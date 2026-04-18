/**
 * @file Checkout.tsx
 * @description 予約内容の最終確認ページ。
 * [v5.3 構成整理：宣言的UI・定数分離モデル]
 */

import { html } from 'hono/html'
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'

/* --- 📌 UI CONSTANTS (文言・定数の集約) --- */
const UI_TEXT = {
  TITLE: "Booking Confirmation",
  LABELS: {
    SHOP: "Shop",
    STAFF: "Specialist",
    PLAN: "Selected Plan",
    DATE: "Date",
    TIME: "Time"
  },
  BUTTON: "Proceed to Payment",
  BACK_LINK: "← Modify Selection",
  NA: "N/A"
};

const UI_STYLE = {
  LABEL: "text-[10px] text-gray-400 uppercase block mb-1",
  VALUE: "text-sm font-medium text-gray-900",
  SECTION_BORDER: "pt-4 border-t border-gray-50"
};

/* --- 📌 TYPE DEFINITIONS --- */
interface CheckoutProps {
  shopName: string;
  staffName: string;
  planName: string;
  duration: number;
  price: number;
  rawShopId: string;
  rawPlanId: string;
  date: string;
  slot: string;
  showDebug?: boolean;
  backUrl?: string;
}

export const Checkout = ({
  shopName,
  staffName,
  planName,
  duration,
  price,
  rawShopId,
  rawPlanId,
  date,
  slot,
  showDebug = false,
  backUrl = "/services"
}: CheckoutProps) => {

  /* --- 1. DATA FORMATTING (表示直前の変換) --- */

  const formattedTime = (() => {
    if (!slot) return UI_TEXT.NA;
    const unix = parseInt(slot);
    if (isNaN(unix)) return UI_TEXT.NA;
    
    return new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date(unix * 1000));
  })();

  const formattedDate = date 
    ? format(parseISO(date), 'yyyy年MM月dd日', { locale: ja }) 
    : UI_TEXT.NA;

  const displayPrice = `¥${price.toLocaleString()}`;

  /* --- 2. UI COMPONENTS --- */

  const debugTrace = showDebug ? html`
    <div class="mt-8 p-4 bg-black rounded-sm font-mono text-[9px] text-gray-500">
      <p class="text-white border-b border-gray-800 pb-2 mb-2 font-bold uppercase">Debug Trace</p>
      <div class="grid grid-cols-2 gap-2 text-green-500">
        <p>PLAN: ${planName}</p>
        <p>PRICE: ${price}</p>
        <p>SHOP_ID: ${rawShopId}</p>
        <p>RAW_SLOT: ${slot}</p>
        <p>JST_DISPLAY: ${formattedTime}</p>
      </div>
    </div>
  ` : '';

  /* --- 3. MAIN TEMPLATE --- */

  return html`
    <script src="https://cdn.tailwindcss.com"></script>
    <body class="bg-gray-50 text-gray-800 antialiased">
      <div class="max-w-xl mx-auto min-h-screen flex flex-col justify-center p-6">
        
        <div class="bg-white rounded-sm border border-gray-100 shadow-sm overflow-hidden p-8">
          
          <h1 class="text-xs font-bold tracking-[0.3em] text-gray-400 uppercase mb-8 border-b pb-4">
            ${UI_TEXT.TITLE}
          </h1>

          <div class="space-y-6">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="${UI_STYLE.LABEL}">${UI_TEXT.LABELS.SHOP}</label>
                <p class="text-base font-medium">${shopName}</p>
              </div>
              <div>
                <label class="${UI_STYLE.LABEL}">${UI_TEXT.LABELS.STAFF}</label>
                <p class="text-base font-medium">${staffName}</p>
              </div>
            </div>

            <div class="${UI_STYLE.SECTION_BORDER}">
              <label class="${UI_STYLE.LABEL}">${UI_TEXT.LABELS.PLAN}</label>
              <p class="text-lg font-bold">${planName}</p>
              <p class="text-sm text-gray-500">${duration} min / ${displayPrice}</p>
            </div>

            <div class="grid grid-cols-2 gap-4 ${UI_STYLE.SECTION_BORDER}">
              <div>
                <label class="${UI_STYLE.LABEL}">${UI_TEXT.LABELS.DATE}</label>
                <p class="${UI_STYLE.VALUE}">${formattedDate}</p>
              </div>
              <div>
                <label class="${UI_STYLE.LABEL}">${UI_TEXT.LABELS.TIME}</label>
                <p class="${UI_STYLE.VALUE}">${formattedTime}</p>
              </div>
            </div>
          </div>

          <div class="mt-10">
            <form action="/services/checkout/session" method="POST">
              <input type="hidden" name="plan_name" value="${planName}">
              <input type="hidden" name="amount" value="${price}">
              <input type="hidden" name="plan_id" value="${rawPlanId}">
              <input type="hidden" name="shop_id" value="${rawShopId}"> 
              <input type="hidden" name="date" value="${date}">
              <input type="hidden" name="slot" value="${slot}">

              <button type="submit" class="w-full bg-black text-white py-5 text-[11px] font-bold rounded-sm tracking-[0.2em] uppercase hover:bg-gray-800 transition-all">
                ${UI_TEXT.BUTTON}
              </button>
            </form>
            
            <a href="${backUrl}" class="block text-center mt-6 text-[10px] text-gray-400 uppercase tracking-widest">
              ${UI_TEXT.BACK_LINK}
            </a>
          </div>
        </div>

        ${debugTrace}

      </div>
    </body>
  `
}