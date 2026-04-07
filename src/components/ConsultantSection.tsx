/**
 * @file ConsultantSection.tsx
 * @description コンサルタントの紹介セクションを表示するコンポーネント。
 * プロフィールの文言や肩書きなどの修正は、このファイルで行います。
 */

import { html } from 'hono/html'

/**
 * ConsultantSection コンポーネント
 * @notes
 * - デザインの統一感を保つため、カード状のボーダーとシャドウを適用しています。
 * - 構造をシンプルに保ち、後任者が要素（画像やSNSリンク等）を追加しやすい設計にしています。
 */
export const ConsultantSection = () => html`
  <section class="mb-12 bg-white p-8 border border-gray-100 shadow-sm rounded-sm">
    <h2 class="text-xs font-bold tracking-[0.2em] text-gray-500 mb-6 uppercase">
      03. Consultant
    </h2>

    <div class="flex items-start gap-6">
      <div class="flex-1">
        <strong class="text-lg font-bold text-gray-900">清善 泰賀</strong>
        <p class="text-[10px] text-[#2c5282] font-bold tracking-widest mt-1 uppercase">
          Management Consultant
        </p>

        <p class="mt-4 text-xs text-[#555] leading-relaxed">
          戦略策定から資金調達まで、実働に裏打ちされた知見を提供します。
        </p>
      </div>
    </div>
  </section>
`