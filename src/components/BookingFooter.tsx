/**
 * @file BookingFooter.tsx
 * @description 予約フローの最終確定を行う固定フッターコンポーネント。
 * 金額の動的表示、プランに応じた遷移先(Checkout/Contact)の切り替えロジックを含みます。
 */

import { html } from 'hono/html'

/**
 * BookingFooter コンポーネント
 */
export const BookingFooter = () => html`
  <div class="fixed bottom-0 w-full bg-white/95 backdrop-blur-md py-6 border-t border-gray-200 z-[100]">
    <div class="max-w-3xl mx-auto px-6 flex justify-between items-center">
      <div class="summary">
        <div class="text-[10px] text-gray-400 font-bold mb-1 uppercase tracking-tighter">Current Plan</div>
        <div id="display-price" class="text-xl md:text-2xl font-bold text-gray-900">
          <span class="text-xs mr-1 font-normal opacity-40">JPY</span>--
        </div>
      </div>
      
      <button id="final-booking-button" 
          type="button"
          class="bg-black text-white py-4 px-8 md:px-14 text-[11px] font-bold rounded-sm tracking-[0.2em] uppercase hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center group">
        <span id="button-text">Select a Plan</span>
        <i class="fa-solid fa-arrow-right ml-4 transform group-hover:translate-x-1 transition-transform"></i>
      </button>
    </div>
  </div>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const planCards = document.querySelectorAll('.plan-card');
      const calendarContainer = document.getElementById('calendar-container');
      const priceDisplay = document.getElementById('display-price');
      const bookingButton = document.getElementById('final-booking-button');
      const buttonText = document.getElementById('button-text');

      // 遷移先URLを保持する変数
      let currentTargetUrl = '';

      function syncSelection() {
        const selectedCard = document.querySelector('.plan-card[data-selected="true"]');
        if (!selectedCard) return;

        // データ属性の取得
        const planId = selectedCard.dataset.planId;
        const price = selectedCard.dataset.price;
        const isRetainer = selectedCard.dataset.isConsulting === 'true';

        // 1. 金額表示の更新
        if (isRetainer) {
          priceDisplay.innerHTML = '要相談';
        } else {
          // JSのテンプレートリテラル内なので、Honoと競合しないよう、うまくエスケープ
          priceDisplay.innerHTML = \`<span class="text-xs mr-1 font-normal opacity-40">JPY</span>\${Number(price).toLocaleString()}\`;
        }

        // 2. カレンダーの表示制御
        if (calendarContainer) {
          calendarContainer.style.display = isRetainer ? 'none' : 'block';
        }

        // 3. ボタンテキストの更新
        if (isRetainer) {
          buttonText.textContent = 'Inquiry (Consultation)';
          currentTargetUrl = '/contact?plan=' + planId;
          enableButton();
        } else {
          buttonText.textContent = 'Book Now';
          updateBookingUrl(planId);
        }
      }

      function updateBookingUrl(planId) {
        const selectedSlot = document.querySelector('.calendar-day-cell[data-selected="true"]');
        if (selectedSlot) {
          const slotDate = selectedSlot.dataset.date;
          const slotId = selectedSlot.dataset.slotId;
          currentTargetUrl = \`/api/checkout?plan=\${planId}&date=\${slotDate}&slot=\${slotId}\`;
          enableButton();
        } else {
          currentTargetUrl = '';
          disableButton();
        }
      }

      function enableButton() {
        bookingButton.disabled = false;
        bookingButton.classList.remove('opacity-50');
      }

      function disableButton() {
        bookingButton.disabled = true;
        bookingButton.classList.add('opacity-50');
      }

      // 4. クリック時の遷移処理（二重クリック防止策 v1.2準拠）
      bookingButton.addEventListener('click', () => {
        if (!currentTargetUrl || bookingButton.disabled) return;
        
        // ボタンを無効化して連打を防ぐ
        bookingButton.disabled = true;
        bookingButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Processing...';
        
        // 遷移実行
        window.location.href = currentTargetUrl;
      });

      planCards.forEach(card => {
        card.addEventListener('click', () => {
          planCards.forEach(c => c.dataset.selected = 'false');
          card.dataset.selected = 'true';
          syncSelection();
        });
      });

      document.addEventListener('selectionChange', () => {
        const selectedCard = document.querySelector('.plan-card[data-selected="true"]');
        if (selectedCard) updateBookingUrl(selectedCard.dataset.planId);
      });

      syncSelection();
    });
  </script>
`