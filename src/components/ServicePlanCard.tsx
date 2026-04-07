/**
 * @file ServicePlanCard.tsx
 * @description 予約可能なプラン一覧（01. Select Plan）をレンダリングするコンポーネント。
 * BUSINESS_INFO から渡されるサービス配列をループ処理し、カード形式の UI を生成します。
 */

import { html } from 'hono/html'

/**
 * ServicePlanList コンポーネント
 * * @param services - constants/info.ts で定義された readonly なサービス配列
 * @notes 
 * - 引数に `readonly` を付与することで、定数データ（as const）を安全に受け取れるようにしています。
 * - `data-selected` 属性は、現在 JavaScript 側で最初の要素を true にしていますが、
 * 将来的にクライアントサイドの JS で選択状態を切り替える際のフックとなります。
 */
export const ServicePlanList = (services: readonly any[]) => html`
  <div class="space-y-4">
    ${services.map((s, index) => html`
      <div class="selection-card flex justify-between items-center p-6 bg-white rounded-sm cursor-pointer transition-all" 
           data-selected="${index === 0 ? 'true' : 'false'}">
        
        <div>
          <h3 class="text-sm font-bold text-gray-900">${s.name}</h3>
          <p class="text-xs text-gray-500 mt-1">${s.description}</p>
        </div>
        
        <div class="text-right">
          <span class="text-base font-bold text-gray-900">¥${s.price.toLocaleString()}</span>
          <span class="block text-[10px] text-gray-400 uppercase mt-1">
            ${s.duration}${s.suffix || ''}
          </span>
        </div>
        
      </div>
    `)}
  </div>
`

/**
 * 【メンテナンス時の注意事項】
 * * 1. 型エラーが発生した場合:
 * BUSINESS_INFO.services の構造を変更した際、`${s.name}` 等の参照先が存在するか確認してください。
 * TypeScript の `readonly any[]` は、元の配列を破壊的に変更（pop, push等）することを防いでいます。
 * * 2. サービスレベルの影響:
 * 価格表示には `.toLocaleString()` を使用し、カンマ区切りを保証しています。
 * 通貨記号（¥）の有無や消費税の表記ルールを変更する場合は、本ファイル内の HTML 構造を直接修正してください。
 * * 3. デザインの拡張:
 * 「推奨プラン」などのラベルを追加する場合は、BUSINESS_INFO 側に `isRecommended` 等のフラグを持たせ、
 * ここで条件分岐（${s.isRecommended ? html`...` : ''}）を追加することを検討してください。
 */