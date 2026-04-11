/**
 * @file ServicePlanCard.tsx
 * @description 予約可能なプラン一覧（01. Select Plan）をレンダリングするコンポーネント。
 * DBから取得したプラン配列をループ処理し、カード形式の UI を生成します。
 */

import { html } from 'hono/html'
// DBアクセス関連の型定義をインポート
import { ServicePlan } from '../db/plan-db'

/**
 * ServicePlanList コンポーネント
 * @param services - db/plan-db.ts から取得した ServicePlan[] 
 */
export const ServicePlanList = (services: readonly any[]) => {
  // --- 【追記】プランが1件も登録されていない場合のゼロデータ表示 ---
  if (!services || services.length === 0) {
    return html`
      <div class="p-12 text-center border-2 border-dashed border-gray-100 rounded-sm bg-white">
        <p class="text-sm text-gray-400">現在、提供可能なサービスプランがございません。</p>
        <p class="text-[10px] text-gray-300 mt-2">管理画面からプランを登録してください。</p>
      </div>
    `;
  }

  // プランが存在する場合のみ、以下のリストをレンダリング
  return html`
    <div id="plan-list-container" class="space-y-4">
      ${services.map((s, index) => {
        // 顧問契約プラン（pln_advisor）判定
        const isRetainer = s.plan_id === 'pln_advisor';
        
        // UI補足：DBに単位がない場合のフォールバック
        const displaySuffix = s.suffix || (isRetainer ? '1ヶ月〜' : '分');

        return html`
          <div class="selection-card plan-card flex justify-between items-center p-6 bg-white rounded-sm cursor-pointer transition-all" 
               data-plan-id="${s.plan_id}"
               data-price="${s.price_amount}"
               data-is-consulting="${isRetainer ? 'true' : 'false'}"
               data-selected="${index === 0 ? 'true' : 'false'}">
            
            <div>
              <h3 class="text-sm font-bold text-gray-900">${s.plan_name}</h3>
              <p class="text-xs text-gray-500 mt-1">${s.description || ''}</p>
            </div>
            
            <div class="text-right">
              <span class="text-base font-bold text-gray-900">
                ${isRetainer ? '要相談' : `¥${s.price_amount.toLocaleString()}`}
              </span>
              <span class="block text-[11px] text-gray-600 uppercase mt-1">
                ${s.duration_min > 0 ? s.duration_min : ''}${displaySuffix}
              </span>
            </div>
            
          </div>
        `
      })}
    </div>
  `;
}

/**
 * 【運用上のメモ】
 * 本コンポーネントはDBからのデータ取得を前提としています。
 * 多店舗展開時、各店舗の plan_id に基づき、動的に内容が切り替わります。
 * 静的データ（info.ts）への依存は、DB運用の確定に伴い廃止されました。
 */