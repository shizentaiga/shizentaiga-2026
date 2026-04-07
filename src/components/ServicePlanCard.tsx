/**
 * @file ServicePlanCard.tsx
 * @description 予約可能なプラン一覧（01. Select Plan）をレンダリングするコンポーネント。
 * BUSINESS_INFO から渡されるサービス配列をループ処理し、カード形式の UI を生成します。
 */

import { html } from 'hono/html'

/**
 * ServicePlanList コンポーネント
 * @param services - constants/info.ts で定義された readonly なサービス配列
 * @notes 
 * - 引数に `readonly` を付与することで、定数データ（as const）を安全に受け取れるようにしています。
 * - `data-plan-id`, `data-price`, `data-is-consulting` は、クライアントサイド JS が
 * 「どのプランが選ばれたか」を検知し、決済URLを動的に生成するための重要な接合部です。
 */
export const ServicePlanList = (services: readonly any[]) => html`
  <div id="plan-list-container" class="space-y-4">
    ${services.map((s, index) => {
      // 顧問契約プラン（retainer）かどうかを判定。価格表示や遷移先の分岐に使用。
      const isRetainer = s.id === 'retainer';
      
      return html`
        <div class="selection-card plan-card flex justify-between items-center p-6 bg-white rounded-sm cursor-pointer transition-all" 
             data-plan-id="${s.id}"
             data-price="${s.price}"
             data-is-consulting="${isRetainer ? 'true' : 'false'}"
             data-selected="${index === 0 ? 'true' : 'false'}">
          
          <div>
            <h3 class="text-sm font-bold text-gray-900">${s.name}</h3>
            <p class="text-xs text-gray-500 mt-1">${s.description}</p>
          </div>
          
          <div class="text-right">
            <span class="text-base font-bold text-gray-900">
              ${isRetainer ? '要相談' : `¥${s.price.toLocaleString()}`}
            </span>
            <span class="block text-[10px] text-gray-500 uppercase mt-1">
              ${s.duration}${s.suffix || ''}
            </span>
          </div>
          
        </div>
      `
    })}
  </div>
`

/**
 * 【メンテナンス時の注意事項】
 * * 1. JavaScript との連携（重要）:
 * 本コンポーネント内の `.plan-card` クラスおよび各 `data-` 属性は、
 * Services.tsx 内の <script> タグから参照されています。
 * クラス名や属性名を変更する場合は、必ずスクリプト側のセレクタも同期させてください。
 * * 2. 顧問契約（Retainer）の扱い:
 * `s.id === 'retainer'` の判定に基づき、価格表示を「要相談」に差し替えています。
 * 将来的に別の「要相談」プランを追加する場合は、BUSINESS_INFO 側に 
 * `needsQuote: true` などのフラグを持たせ、ここで判定することを推奨します。
 * * 3. 型エラーが発生した場合:
 * BUSINESS_INFO.services の構造を変更した際、`${s.name}` 等の参照先が存在するか確認してください。
 * TypeScript の `readonly any[]` は、元の配列を破壊的に変更（pop, push等）することを防いでいます。
 * * 4. デザインの拡張:
 * 「推奨プラン」などのラベルを追加する場合は、BUSINESS_INFO 側に `isRecommended` 等のフラグを持たせ、
 * ここで条件分岐（${s.isRecommended ? html`<span class="...">推奨</span>` : ''}）を追加してください。
 */