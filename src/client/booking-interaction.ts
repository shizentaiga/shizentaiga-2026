/**
 * @file booking-interaction.ts
 * @description 予約ページのクライアントサイド・インタラクション制御（TypeScript）。
 * カレンダーの選択状態切り替え、および時間枠のシミュレーションを担当します。
 */

const initBooking = () => {
  // DOM要素の取得（型を HTMLElement として明示）
  const calendarContainer = document.getElementById('calendar-container') as HTMLElement | null;
  const selectedDateDisplay = document.getElementById('selected-date-display') as HTMLElement | null;
  const slotList = document.getElementById('slot-list') as HTMLElement | null;

  // コンテナが存在しない場合は実行しない（他ページでのエラー防止）
  if (!calendarContainer) return;

  /**
   * カレンダー内クリックイベントのハンドリング（イベント委譲）
   */
  calendarContainer.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLElement;
    const cell = target.closest('.calendar-day-cell') as HTMLElement | null;

    // 予約枠がない、またはセル以外をクリックした場合は無視
    if (!cell || cell.dataset.available === 'false') return;

    // データ属性（data-date）のバリデーション
    const selectedDate = cell.dataset.date;
    if (!selectedDate) {
      console.warn('[Booking] Critical: data-date attribute is missing on the cell.');
      return;
    }

    // 1. UI更新：選択状態の切り替え
    document.querySelectorAll('.calendar-day-cell').forEach((el) => {
      (el as HTMLElement).dataset.selected = 'false';
    });
    cell.dataset.selected = 'true';

    // 2. 画面表示の更新（ヘッダー部分の日付表示）
    if (selectedDateDisplay) {
      selectedDateDisplay.textContent = selectedDate;
    }

    // 3. タイムスロット表示エリアのフィードバック
    if (slotList) {
      // 検索中のスピナーを表示
      slotList.innerHTML = `
        <div class="col-span-full py-8 text-center">
          <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-[#2c5282] mb-2"></div>
          <p class="text-[10px] text-[#2c5282] font-bold tracking-widest uppercase animate-pulse">
            Searching slots for ${selectedDate}...
          </p>
        </div>
      `;

      // 将来的な fetch() 処理のシミュレーション（1秒後に結果を表示）
      setTimeout(() => {
        slotList.innerHTML = `
          <div class="col-span-full py-8 text-center bg-gray-50 border border-dashed border-gray-200 rounded-sm">
            <p class="text-[11px] text-gray-500 font-bold tracking-widest">
              ご指定の日付（${selectedDate}）に現在予約枠はありません。
            </p>
            <p class="text-[9px] text-gray-400 uppercase mt-1">No available slots for this date.</p>
          </div>
        `;
      }, 1000);
    }

    // デバッグログ
    console.log(`[Booking] Selected Date: ${selectedDate}`);
  });
};

/**
 * 実行タイミングの制御：
 * すでにDOMがパース済み（async読み込み等）なら即実行、
 * そうでなければ DOMContentLoaded イベントを待つ。
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBooking);
} else {
  initBooking();
}