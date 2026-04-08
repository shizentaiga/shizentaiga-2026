/**
 * @file /public/js/booking-interaction.js
 * @description 予約ページのクライアントサイド・インタラクションを制御
 */

// export を外し、windowオブジェクトに紐付けることで、外部から呼び出せるようにします
window.initBookingInteraction = () => {
  const calendarContainer = document.getElementById('calendar-container');
  const selectedDateDisplay = document.getElementById('selected-date-display');
  const slotList = document.getElementById('slot-list');

  if (!calendarContainer) return;

  calendarContainer.addEventListener('click', (e) => {
    const target = e.target;
    const cell = target.closest('.calendar-day-cell');

    if (!cell || cell.dataset.available === 'false') return;

    // 1. 選択状態の解除
    document.querySelectorAll('.calendar-day-cell').forEach((el) => {
      el.dataset.selected = 'false';
    });

    // 2. 新しい選択状態の適用
    cell.dataset.selected = 'true';

    // 3. 画面表示の更新
    const selectedDate = cell.dataset.date;
    if (selectedDate && selectedDateDisplay) {
      selectedDateDisplay.textContent = selectedDate;
    }

    // 4. タイムスロット表示エリアのフィードバック
    if (slotList) {
      // スピナー表示
      slotList.innerHTML = `
        <div class="col-span-full py-8 text-center">
          <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-[#2c5282] mb-2"></div>
          <p class="text-[10px] text-[#2c5282] font-bold tracking-widest uppercase">
            Searching slots for ${selectedDate}...
          </p>
        </div>
      `;

      // テスト用シミュレーション（1秒後にメッセージ）
      setTimeout(() => {
        slotList.innerHTML = `
          <div class="col-span-full py-8 text-center bg-gray-50 border border-dashed border-gray-200">
            <p class="text-[11px] text-gray-500 font-bold tracking-widest">
              ご指定の日付（${selectedDate}）に現在予約枠はありません。
            </p>
          </div>
        `;
      }, 800);
    }

    console.log(`[Booking] Date selected: ${selectedDate}`);
  });
};