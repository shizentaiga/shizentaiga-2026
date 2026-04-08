/**
 * @file /public/js/booking-logic.js
 * @description 
 * 予約ページ（Services.tsx）におけるカレンダー操作およびタイムスロット表示の
 * クライアントサイド・インタラクションを制御します。
 * * ■ 主な機能:
 * 1. カレンダーの日付セルクリック時のイベントハンドリング
 * 2. 選択状態（data-selected）のUI切り替え
 * 3. 選択された日付に応じたタイムスロット表示のシミュレーション（スピナー表示含む）
 */

(function() {
  /**
   * 予約システムの初期化関数
   */
  const initBooking = () => {
    const calendarContainer = document.getElementById('calendar-container');
    const selectedDateDisplay = document.getElementById('selected-date-display');
    const slotList = document.getElementById('slot-list');

    // 必要なDOM要素が存在しない場合は実行を中断（不具合防止）
    if (!calendarContainer) return;

    /**
     * カレンダーコンテナへのイベントデリゲーション
     * 個別セルではなく親要素でイベントを捕捉し、メモリ効率を高めています。
     */
    calendarContainer.addEventListener('click', (e) => {
      const target = e.target;
      const cell = target.closest('.calendar-day-cell');

      // 予約不可のセル、またはセル以外のクリックは無視
      if (!cell || cell.dataset.available === 'false') return;

      const selectedDate = cell.dataset.date;
      if (!selectedDate) return;

      // 1. UI更新：全てのセルの選択状態を解除し、クリックされたセルのみ選択状態にする
      document.querySelectorAll('.calendar-day-cell').forEach((el) => {
        el.dataset.selected = 'false';
      });
      cell.dataset.selected = 'true';

      // 2. 表示日付の更新（ヘッダー等の日付テキスト）
      if (selectedDateDisplay) {
        selectedDateDisplay.textContent = selectedDate;
      }

      // 3. タイムスロット表示エリアの更新（非同期通信のシミュレーション）
      if (slotList) {
        // ロード中のスピナーを表示
        slotList.innerHTML = `
          <div class="col-span-full py-8 text-center">
            <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-[#2c5282] mb-2"></div>
            <p class="text-[10px] text-[#2c5282] font-bold tracking-widest uppercase animate-pulse">
              Searching slots for ${selectedDate}...
            </p>
          </div>
        `;

        // 疑似的な待ち時間を経て結果を表示
        setTimeout(() => {
          slotList.innerHTML = `
            <div class="col-span-full py-8 text-center bg-gray-50 border border-dashed border-gray-200 rounded-sm">
              <p class="text-[11px] text-gray-500 font-bold tracking-widest">
                ご指定の日付（${selectedDate}）に現在予約枠はありません。
              </p>
              <p class="text-[9px] text-gray-600 uppercase mt-1">No available slots for this date.</p>
            </div>
          `;
        }, 800);
      }

      console.log('[Booking] Click detected:', selectedDate);
    });
  };

  /**
   * 実行タイミングの制御
   * DOMの解析が終わっていない場合は完了を待ち、終わっている場合は即座に実行します。
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBooking);
  } else {
    initBooking();
  }
})();