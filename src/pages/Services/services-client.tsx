import { html } from 'hono/html'

/**
 * 💡 サービス予約ページ専用 クライアントサイド・スクリプト
 */
export const ServicesClientScript = () => html`
  <script>
    window.addEventListener('load', function() {
      
      // --- 🛠 内部関数群 ---

      /** スロット取得の実行（HTMX） */
      function executeSlotRequest(date, planId) {
        if (!date || !planId || !window.htmx) return;
        
        htmx.ajax('GET', '/services/slots', {
          values: { date, plan_id: planId },
          target: '#slot-list-container'
        });
      }

      /** プラン変更時のハンドラ */
      function handlePlanChange(e) {
        if (e.target?.name !== 'plan_id') return;

        const selectedPlanId = e.target.value;
        const selectedCell = document.querySelector('.calendar-day-cell[data-selected="true"]');
        if (!selectedCell) return;

        executeSlotRequest(selectedCell.getAttribute('data-date'), selectedPlanId);
      }

      /** 日付選択時のハンドラ */
      function handleDateClick(e) {
        const cell = e.target.closest('.calendar-day-cell');
        if (!cell) return;

        const date = cell.getAttribute('data-date');
        const planId = document.querySelector('input[name="plan_id"]:checked')?.value;

        // UI更新: 既存の選択を解除して新規選択を付与
        document.querySelectorAll('.calendar-day-cell[data-selected="true"]')
          .forEach(el => el.setAttribute('data-selected', 'false'));
        cell.setAttribute('data-selected', 'true');

        executeSlotRequest(date, planId);
      }

      /** HTMX読み込み後の処理 */
      function handleHtmxAfterLoad(evt) {
        if (evt.detail.target.id !== 'slot-list-container') return;
        document.getElementById('error-display')?.classList.add('hidden');
      }

      // --- 🚀 イベントリスナー登録 ---

      document.addEventListener('change', handlePlanChange);
      document.addEventListener('click', handleDateClick);
      document.body.addEventListener('htmx:afterOnLoad', handleHtmxAfterLoad);
      
    });
  </script>
`;