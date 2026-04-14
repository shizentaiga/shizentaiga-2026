/**
 * @file BookingFooter.tsx
 * @description 予約フローの最終確定を行う固定フッターコンポーネント。
 * [v4.4 パス一元管理・安全モデル]
 * - URLパスを変数化し、スクリプト冒頭で定義
 * - プランに応じた金額の動的表示
 * - 通常予約（Checkout）と相談（Contact）の分岐処理を維持
 */

import { html } from 'hono/html'

export const BookingFooter = () => html`
  <div class="fixed bottom-0 w-full bg-white/95 backdrop-blur-md py-6 border-t border-gray-200 z-50">
    <div class="max-w-3xl mx-auto px-6 flex justify-between items-center">
      <div class="summary">
        <div class="text-[11px] text-gray-600 font-bold mb-1 uppercase tracking-tighter">Selected Plan Price</div>
        <div id="display-price" class="text-xl md:text-2xl font-bold text-gray-900 transition-all duration-300">
          <span class="text-xs mr-1 font-normal opacity-40">JPY</span>--
        </div>
      </div>
      
      <button id="final-booking-button" 
          type="button"
          disabled
          class="bg-black text-white py-4 px-8 md:px-14 text-[11px] font-bold rounded-sm tracking-[0.2em] uppercase hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-all flex items-center group">
        <span id="button-text">Select a Plan</span>
        <i class="fa-solid fa-arrow-right ml-4 transform group-hover:translate-x-1 transition-transform"></i>
      </button>
    </div>
  </div>

  <script>
    document.addEventListener('DOMContentLoaded', () => {
      /**
       * 1. 各種パスの設定（Single Source of Truth）
       * ---------------------------------------------------------
       */
      const ROUTES = {
        CHECKOUT: '/services/checkout', // 正常系の遷移先
        CONTACT:  '/contact',           // 問い合わせページ
        ERROR:    '/error'              // 万が一の逃げ道
      };

      /**
       * 2. 編集可能な文言の設定
       * ---------------------------------------------------------
       */
      const UI_TEXT = {
        CURRENCY: 'JPY',
        CONSULTATION: '要相談',
        SELECT_PLAN: 'Select a Plan',
        SELECT_DATE: 'Select Date',
        SELECT_TIME: 'Select Time',
        BOOK_NOW: 'Book Now',
        CONTACT: 'Contact for Consultation',
        PROCESSING: 'Processing...'
      };

      // 要素の取得
      const priceDisplay = document.getElementById('display-price');
      const bookingButton = document.getElementById('final-booking-button');
      const buttonText = document.getElementById('button-text');
      const calendarContainer = document.getElementById('calendar-container');

      let currentTargetUrl = '';

      /**
       * 3. 状態の同期（メインロジック）
       */
      function syncSelection() {
        const selectedCard = document.querySelector('.plan-card[data-selected="true"]');
        if (!selectedCard) return;

        const planId = selectedCard.dataset.planId;
        const price = selectedCard.dataset.price;
        const isConsulting = selectedCard.dataset.isConsulting === 'true';

        // --- A. 価格表示の更新 ---
        if (isConsulting || price === '0') {
          priceDisplay.innerHTML = '<span class="text-sm font-bold">' + UI_TEXT.CONSULTATION + '</span>';
        } else {
          priceDisplay.innerHTML = '<span class="text-xs mr-1 font-normal opacity-40">' + UI_TEXT.CURRENCY + '</span>' + Number(price).toLocaleString();
        }

        // --- B. カレンダーの表示制御 ---
        if (calendarContainer) {
          calendarContainer.style.display = isConsulting ? 'none' : 'block';
        }

        // --- C. ボタンと遷移先の更新 ---
        if (isConsulting) {
          buttonText.textContent = UI_TEXT.CONTACT;
          currentTargetUrl = ROUTES.CONTACT + '?plan=' + planId;
          enableButton();
        } else {
          updateBookingUrl(planId);
        }
      }

      /**
       * 4. 予約URLの組み立て
       */
      function updateBookingUrl(planId) {
        const selectedRadio = document.querySelector('input[name="slot_id"]:checked');
        const selectedCell = document.querySelector('.calendar-day-cell[data-selected="true"]');

        if (selectedRadio && selectedCell) {
          const unix = selectedRadio.value;
          const date = selectedCell.getAttribute('data-date');
          
          // ROUTES.CHECKOUT を使用してパスを動的に生成
          currentTargetUrl = ROUTES.CHECKOUT + '?plan=' + planId + '&date=' + date + '&slot=' + unix;
          
          // テスト用：常にエラーページに飛ばしたい場合は以下を使用
          // currentTargetUrl = ROUTES.ERROR;

          buttonText.textContent = UI_TEXT.BOOK_NOW;
          enableButton();
        } else {
          currentTargetUrl = '';
          if (!selectedCell) {
            buttonText.textContent = UI_TEXT.SELECT_DATE;
          } else if (!selectedRadio) {
            buttonText.textContent = UI_TEXT.SELECT_TIME;
          }
          disableButton();
        }
      }

      function enableButton() {
        bookingButton.disabled = false;
        bookingButton.classList.remove('opacity-50');
      }

      function disableButton() {
        bookingButton.disabled = true;
      }

      /**
       * 5. イベント監視
       */
      document.addEventListener('change', (e) => {
        if (e.target.name === 'plan_id' || e.target.name === 'slot_id') {
          if (e.target.name === 'plan_id') {
            document.querySelectorAll('.plan-card').forEach(card => {
              card.dataset.selected = (card.dataset.planId === e.target.value) ? 'true' : 'false';
            });
          }
          syncSelection();
        }
      });

      document.addEventListener('selectionChange', () => {
        syncSelection();
      });

      bookingButton.addEventListener('click', () => {
        if (!currentTargetUrl || bookingButton.disabled) return;
        
        bookingButton.disabled = true;
        bookingButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> ' + UI_TEXT.PROCESSING;
        
        window.location.href = currentTargetUrl;
      });

      // 初期実行
      syncSelection();
    });
  </script>
`