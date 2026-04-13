/**
 * @file ServicePlanCard.tsx
 * @description 予約可能なプラン一覧（01. Select Plan）をレンダリングするコンポーネント。
 * * --- 今回の教訓と修正のポイント ---
 * 1. 【HTMXとのデータ連携】:
 * hx-include が値を拾うためには、HTML要素が name 属性と value を持っている必要があります。
 * div の data 属性ではなく、<input> 要素（今回は radio）を使うのが正解です。
 * 2. 【labelタグの活用】:
 * カード全体を <label> にすることで、中のラジオボタンを hidden にしても、
 * カードをクリックするだけで「値の選択」が成立します。
 * 3. 【Tailwindの条件付きスタイル】:
 * has-checked モディファイアを使用し、JavaScriptを使わずに
 * 「選択されたプランの枠線を青くする」というUIフィードバックを実現しました。
 * 4. 【ビジネスロジックの埋め込み】:
 * 相談プラン(duration=0)や無料プラン(price=0)を「要相談」として判定し、
 * BookingFooterへ「決済が必要か否か」を伝える data-is-consulting 属性を付与しました。
 */

import { html } from 'hono/html'

export const ServicePlanList = (services: readonly any[]) => {
  // プラン未登録時のゼロデータ表示
  if (!services || services.length === 0) {
    return html`
      <div class="p-12 text-center border-2 border-dashed border-gray-100 rounded-sm bg-white">
        <p class="text-sm text-gray-400">現在、提供可能なサービスプランがございません。</p>
        <p class="text-[10px] text-gray-300 mt-2">管理画面からプランを登録してください。</p>
      </div>
    `;
  }

  return html`
    <div id="plan-list-container" class="space-y-4">
      ${services.map((s, index) => {
        /**
         * 判定ロジック:
         * 1. duration_min が 0 (アドバイザープラン等)
         * 2. price_amount が 0 (無料または要見積もり)
         * いずれかの場合を「要相談(Consulting)」として扱います。
         */
        const isConsulting = s.duration_min === 0 || s.price_amount === 0;
        
        // 単位の制御: 相談プランなら「1ヶ月〜」等の期間表記、通常なら「分」
        const displaySuffix = isConsulting ? '1ヶ月〜' : '分';
        
        // 初回レンダリング時の選択状態（最初の要素をデフォルトに）
        const isSelected = index === 0;

        return html`
          <label 
            class="selection-card plan-card flex justify-between items-center p-6 bg-white rounded-sm cursor-pointer transition-all border border-transparent has-checked:border-blue-500 has-checked:bg-blue-50/30" 
            data-plan-id="${s.plan_id}"
            data-price="${s.price_amount}"
            data-is-consulting="${isConsulting ? 'true' : 'false'}"
            data-selected="${isSelected ? 'true' : 'false'}"
          >
            
            <input type="radio" 
                   name="plan_id" 
                   value="${s.plan_id}" 
                   class="hidden" 
                   ${isSelected ? 'checked' : ''}>
            
            <div class="pr-4">
              <h3 class="text-sm font-bold text-gray-900">${s.plan_name}</h3>
              <p class="text-xs text-gray-500 mt-1 leading-relaxed">${s.description || ''}</p>
            </div>
            
            <div class="text-right shrink-0">
              <span class="text-base font-bold text-gray-900">
                ${isConsulting ? '要相談' : `¥${s.price_amount.toLocaleString()}`}
              </span>
              
              <span class="block text-[11px] text-gray-600 uppercase mt-1">
                ${s.duration_min > 0 ? s.duration_min : ''}${displaySuffix}
              </span>
            </div>
          </label>
        `
      })}
    </div>
  `;
}