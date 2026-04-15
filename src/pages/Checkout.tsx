/**
 * @file Checkout.tsx
 * @description 予約内容の最終確認ページ。
 * [v4.9 date-fns 統合モデル]
 * - date-fns を導入し、日付・時刻操作の堅牢性と可読性を向上。
 * - 正規表現を排除し、宣言的なフォーマット指定に統一。
 */

import { html } from 'hono/html'
import { format, fromUnixTime, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'

/* --- 📌 TYPE DEFINITIONS --- */
interface CheckoutProps {
  shopName: string;
  staffName: string;
  planName: string;
  duration: number;
  price: number;
  rawShopId: string;
  rawPlanId: string;
  date: string; // "YYYY-MM-DD"
  slot: string; // UNIX timestamp (string)
  showDebug?: boolean;
  backUrl?: string;
  locale?: string;
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
  backUrl = "/services",
  locale = "ja-JP"
}: CheckoutProps) => {

  /* --- 1. DATA FORMATTING (表示データの整形) --- */

  // 時刻の整形: UNIXタイムスタンプを "HH:mm" 形式に変換
  const formattedTime = slot 
    ? format(fromUnixTime(parseInt(slot)), 'HH:mm') 
    : 'N/A';

  // 日付の整形: "YYYY-MM-DD" を "YYYY年MM月DD日" 形式に変換
  const formattedDate = date 
    ? format(parseISO(date), 'yyyy年MM月dd日', { locale: ja }) 
    : 'N/A';

  // 通貨表示の整形
  const displayPrice = `¥${price.toLocaleString()}`;

  /* --- 2. UI COMPONENTS (パーツ定義) --- */

  // デバッグ用表示ブロック
  const debugTrace = showDebug ? html`
    <div class="mt-8 p-4 bg-black rounded-sm font-mono text-[9px] text-gray-500">
      <p class="text-white border-b border-gray-800 pb-2 mb-2 font-bold uppercase">Debug Trace</p>
      <div class="grid grid-cols-2 gap-2 text-green-500">
        <p>PLAN: ${planName}</p>
        <p>PRICE: ${price}</p>
        <p>SHOP_ID: ${rawShopId}</p>
        <p>SLOT: ${slot}</p>
      </div>
    </div>
  ` : '';

  /* --- 3. MAIN TEMPLATE (レンダリング) --- */

  return html`
    <script src="https://cdn.tailwindcss.com"></script>
    <body class="bg-gray-50 text-gray-800 antialiased">
      <div class="max-w-xl mx-auto min-h-screen flex flex-col justify-center p-6">
        
        <div class="bg-white rounded-sm border border-gray-100 shadow-sm overflow-hidden p-8">
          
          <h1 class="text-xs font-bold tracking-[0.3em] text-gray-400 uppercase mb-8 border-b pb-4">
            Booking Confirmation
          </h1>

          <div class="space-y-6">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-[10px] text-gray-400 uppercase block mb-1">Shop</label>
                <p class="text-base font-medium">${shopName}</p>
              </div>
              <div>
                <label class="text-[10px] text-gray-400 uppercase block mb-1">Specialist</label>
                <p class="text-base font-medium">${staffName}</p>
              </div>
            </div>

            <div class="pt-4 border-t border-gray-50">
              <label class="text-[10px] text-gray-400 uppercase block mb-1">Selected Plan</label>
              <p class="text-lg font-bold">${planName}</p>
              <p class="text-sm text-gray-500">${duration} min / ${displayPrice}</p>
            </div>

            <div class="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
              <div>
                <label class="text-[10px] text-gray-400 uppercase block mb-1">Date</label>
                <p>${formattedDate}</p>
              </div>
              <div>
                <label class="text-[10px] text-gray-400 uppercase block mb-1">Time</label>
                <p>${formattedTime}</p>
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
                Proceed to Payment
              </button>
            </form>
            
            <a href="${backUrl}" class="block text-center mt-6 text-[10px] text-gray-400 uppercase tracking-widest">
              ← Modify Selection
            </a>
          </div>
        </div>

        ${debugTrace}

      </div>
    </body>
  `
}