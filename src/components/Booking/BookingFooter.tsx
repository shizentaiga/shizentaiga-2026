/**
 * @file BookingFooter.tsx
 * @description 予約フローの最終確定を行う固定フッターコンポーネント。
 * [v4.0 統合モデル]
 * - プランに応じた金額の動的表示 (¥表示 vs 要相談)
 * - カレンダーの属性ベース(data-selected)の日付取得に対応
 * - カスタムイベント selectionChange によるカレンダー連動の強化
 * - 通常予約（Checkout）と相談（Contact）の分岐処理
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
      // 要素の取得
      const priceDisplay = document.getElementById('display-price');
      const bookingButton = document.getElementById('final-booking-button');
      const buttonText = document.getElementById('button-text');
      const calendarContainer = document.getElementById('calendar-container');

      let currentTargetUrl = '';

      /**
       * 1. 状態の同期（メインロジック）
       * プラン選択状況とスロット選択状況を読み取り、UIを更新します。
       */
      function syncSelection() {
        const selectedCard = document.querySelector('.plan-card[data-selected="true"]');
        if (!selectedCard) return;

        const planId = selectedCard.dataset.planId;
        const price = selectedCard.dataset.price;
        const isConsulting = selectedCard.dataset.isConsulting === 'true';

        // --- A. 価格表示の更新 ---
        if (isConsulting || price === '0') {
          priceDisplay.innerHTML = '<span class="text-sm font-bold">要相談</span>';
        } else {
          priceDisplay.innerHTML = \`<span class="text-xs mr-1 font-normal opacity-40">JPY</span>\${Number(price).toLocaleString()}\`;
        }

        // --- B. カレンダーの表示制御 ---
        if (calendarContainer) {
          calendarContainer.style.display = isConsulting ? 'none' : 'block';
        }

        // --- C. ボタンと遷移先の更新 ---
        if (isConsulting) {
          // 【相談ケース】カレンダー不要で即座に問い合わせへ
          buttonText.textContent = 'Contact for Consultation';
          currentTargetUrl = \`/contact?plan=\${planId}\`;
          enableButton();
        } else {
          // 【通常ケース】スロットの選択状態を確認
          updateBookingUrl(planId);
        }
      }

      /**
       * 2. 予約URLの組み立て
       * 修正：カレンダーのセルから data-selected="true" を探すように変更
       */
      function updateBookingUrl(planId) {
        // SlotList.tsx のラジオボタン
        const selectedRadio = document.querySelector('input[name="slot_id"]:checked');
        
        // CalendarSection.tsx の選択済みセル（属性ベース）
        const selectedCell = document.querySelector('.calendar-day-cell[data-selected="true"]');

        if (selectedRadio && selectedCell) {
          const unix = selectedRadio.value;
          const date = selectedCell.getAttribute('data-date');
          
          currentTargetUrl = \`/api/checkout?plan=\${planId}&date=\${date}&slot=\${unix}\`;
          buttonText.textContent = 'Book Now';
          enableButton();
        } else {
          currentTargetUrl = '';
          // ガイドテキストの更新
          if (!selectedCell) {
            buttonText.textContent = 'Select Date';
          } else if (!selectedRadio) {
            buttonText.textContent = 'Select Time';
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
       * 3. イベント監視（デリゲーション & カスタムイベント）
       */
      // プラン変更やスロット選択を監視
      document.addEventListener('change', (e) => {
        if (e.target.name === 'plan_id' || e.target.name === 'slot_id') {
          // プランカードの data-selected を手動更新（スタイリング同期）
          if (e.target.name === 'plan_id') {
            document.querySelectorAll('.plan-card').forEach(card => {
              card.dataset.selected = (card.dataset.planId === e.target.value) ? 'true' : 'false';
            });
          }
          syncSelection();
        }
      });

      // カレンダーの日付クリック（CalendarSectionからの通知）を監視
      document.addEventListener('selectionChange', () => {
        syncSelection();
      });

      // ボタンクリック時の処理（二重送信防止）
      bookingButton.addEventListener('click', () => {
        if (!currentTargetUrl || bookingButton.disabled) return;
        
        bookingButton.disabled = true;
        bookingButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Processing...';
        
        window.location.href = currentTargetUrl;
      });

      // 初期実行
      syncSelection();
    });
  </script>
`