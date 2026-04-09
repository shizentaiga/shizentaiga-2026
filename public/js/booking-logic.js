/**
 * @file /public/js/booking-logic.js
 * @description 予約ページ（Services.tsx）のフロントエンド制御を担当。
 * カレンダーの日付選択、UI状態の切り替え、およびD1から渡された予約枠データの描画を行います。
 * * ■ 主な機能:
 * 1. イベントデリゲーションによる日付セルクリックの捕捉
 * 2. 選択状態（data-selected）の動的切り替え
 * 3. サーバーから注入された window.AVAILABLE_SLOTS に基づくスロット表示
 * * ■ 注意事項:
 * - window.AVAILABLE_SLOTS は、本スクリプトのロード前に Services.tsx 側で定義される必要があります。
 */

// 1. ファイル自体の読み込み確認（真っ先に実行される）
console.log('>>> [CHECK 1] booking-logic.js has been LOADED.');

(function() {
  /**
   * 予約システムの初期化
   */
  const initBooking = () => {
    const calendarContainer = document.getElementById('calendar-container');
    const selectedDateDisplay = document.getElementById('selected-date-display');
    const slotList = document.getElementById('slot-list');

    // 必要なDOM要素が存在しない場合は実行を中断
    if (!calendarContainer) return;

    /**
     * カレンダーコンテナへのイベントデリゲーション
     */
    calendarContainer.addEventListener('click', (e) => {
      const target = e.target;
      const cell = target.closest('.calendar-day-cell');

      // 予約不可のセル、またはセル以外のクリックは無視
      if (!cell || cell.dataset.available === 'false') return;

      const selectedDate = cell.dataset.date;
      if (!selectedDate) return;

      // 1. UI更新：選択状態の切り替え
      document.querySelectorAll('.calendar-day-cell').forEach((el) => {
        el.dataset.selected = 'false';
      });
      cell.dataset.selected = 'true';

      // 2. 表示日付テキストの更新
      if (selectedDateDisplay) {
        selectedDateDisplay.textContent = selectedDate;
      }

      // 3. タイムスロット表示エリアの更新
      if (slotList) {
        // ロード中スピナーの描画
        slotList.innerHTML = `
          <div class="col-span-full py-8 text-center">
            <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-[#2c5282] mb-2"></div>
            <p class="text-[10px] text-[#2c5282] font-bold tracking-widest uppercase animate-pulse">
              Searching slots for ${selectedDate}...
            </p>
          </div>
        `;

        // UX向上のための疑似的な遅延処理（データ抽出とボタン生成）
        setTimeout(() => {
          /**
           * 重要：実行タイミングによって window.AVAILABLE_SLOTS が undefined になるのを防ぐため
           * 空配列をデフォルト値として参照します。
           */
          const allSlots = window.AVAILABLE_SLOTS || [];

          // デバッグ用：データの生存確認
          console.log('[Debug 1] Data Access Attempt:', {
            found_on_window: !!window.AVAILABLE_SLOTS,
            item_count: allSlots.length,
            target_date: selectedDate
          });

          // グローバル変数から該当日の有効な枠を抽出
          // Services.tsx で map しているが、念のため date_string でも比較
          const slotsForDate = allSlots.filter(slot => 
            (slot.date_string === selectedDate || slot.date === selectedDate) && 
            slot.status === 'available'
          );

          if (slotsForDate.length > 0) {
            // 予約枠が存在する場合：時間選択ボタンを生成
            slotList.innerHTML = `
              <div class="grid grid-cols-2 gap-3 w-full max-w-sm mx-auto">
                ${slotsForDate.map(slot => {
                  // 24時間表記 (HH:mm) で時刻を整形（数値キャストを挟み安全性を向上）
                  const unixTimestamp = Number(slot.start_at_unix);
                  const timeStr = new Date(unixTimestamp * 1000)
                    .toLocaleTimeString('ja-JP', { 
                      hour: '2-digit', 
                      minute: '2-digit', 
                      hour12: false 
                    });
                  
                  return `
                    <button class="py-3 px-4 bg-white border border-gray-200 text-sm font-medium hover:border-[#2c5282] hover:text-[#2c5282] transition-colors rounded-sm shadow-sm">
                      ${timeStr}
                    </button>
                  `;
                }).join('')}
              </div>
            `;
          } else {
            // 予約枠が存在しない場合のメッセージ表示
            slotList.innerHTML = `
              <div class="col-span-full py-8 text-center bg-gray-50 border border-dashed border-gray-200 rounded-sm">
                <p class="text-[11px] text-gray-500 font-bold tracking-widest">
                  ご指定の日付（${selectedDate}）に現在予約枠はありません。
                </p>
                <p class="text-[9px] text-gray-600 uppercase mt-1">No available slots for this date.</p>
              </div>
            `;
          }
        }, 500);
      }

      console.log('[Booking] Click detected:', selectedDate);
    });
  };

  /**
   * DOM構築完了後の実行制御
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBooking);
  } else {
    initBooking();
  }
})();