/**
 * @file booking-interaction.ts
 * @description 予約ページのクライアントサイド・インタラクションを制御します。
 * 主な機能: カレンダーの日付選択状態の切り替え、選択された日付の表示更新。
 */

export const initBookingInteraction = () => {
  // DOM要素の取得(型を HTMLElement として指定)
  const calendarContainer = document.getElementById('calendar-container')as HTMLElement | null;
  const selectedDateDisplay = document.getElementById('selected-date-display')as HTMLElement | null;
  const slotList = document.getElementById('slot-list')as HTMLElement | null;

  // カレンダーコンテナが存在しない場合は実行しない（他ページでのエラー防止）
  if (!calendarContainer) return;

  /**
   * カレンダー内クリックイベントのハンドリング
   * 個別のセルではなく親要素で検知する「イベント委譲」を採用
   */
  calendarContainer.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLElement;
    const cell = target.closest('.calendar-day-cell') as HTMLElement as HTMLElement | null;

    // クリックされたのが日付セルでない、または予約不可（available="false"）の場合は中断
    if (!cell || cell.dataset.available === 'false') return;

    // 1. 選択状態の解除
    // ページ内の全セルから選択属性をリセット
    document.querySelectorAll('.calendar-day-cell').forEach((el) => {
      (el as HTMLElement).dataset.selected = 'false';
    });

    // 2. 新しい選択状態の適用
    // クリックされたセルのカスタム属性を書き換え（CSSの .selection-card[data-selected="true"] と連動）
    cell.dataset.selected = 'true';

    // 3. 画面表示の更新
    const selectedDate = cell.dataset.date;
    if (selectedDate && selectedDateDisplay) {
      selectedDateDisplay.textContent = selectedDate;
    }

    // 4. タイムスロット表示エリアのフィードバック
    // ※ ここに将来的に「予約枠生成ロジック」を呼び出す処理を追加します
    if (slotList) {
        // 1. まずはスピナーを出す
        slotList.innerHTML = `Searching...`;

        // 2. 本来はここで fetch()。
        // テスト用に「1秒後に『枠なし』と表示する」シミュレーションを入れる
        setTimeout(() => {
            slotList.innerHTML = `<p>ご指定の日付に予約枠はありません。</p>`;
        }, 1000);
        
        slotList.innerHTML = `
        <div class="col-span-full py-8 text-center">
          <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-[#2c5282] mb-2"></div>
          <p class="text-[10px] text-[#2c5282] font-bold tracking-widest uppercase">
            Searching slots for ${selectedDate}...
          </p>
        </div>
      `;
    }

    // デバッグ用（本番公開前に削除可能）
    console.log(`[Booking] Date selected: ${selectedDate}`);
  });
};