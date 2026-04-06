/**
 * @component: ServiceCard
 * @description: サービスプランの個別カード。デザイナーはこのファイル内のHTML/CSSを自由に編集可能です。
 * @props: 
 * - id: プラン識別子（予約導線の制御に使用）
 * - name: プラン名
 * - description: サービスの説明文
 * - price: 金額（数値）
 * - taxText: 「税込」または「税別」
 * - durationText: 「60分」「1回」等の単位
 * - isAvailable: 現在予約受付中かどうか（true/false）
 */

import { html } from 'hono/html'

interface ServiceCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  taxText: string;
  durationText: string;
  isAvailable: boolean;
}

export const ServiceCard = ({
  id,
  name,
  description,
  price,
  taxText,
  durationText,
  isAvailable
}: ServiceCardProps) => {
  return html`
    <div 
      class="service-item" 
      data-plan-id="${id}"
      style="border-bottom: 1px solid #eee; padding: 40px 0; opacity: ${isAvailable ? '1' : '0.6'};"
    >
      <h3 style="font-size: 1.4rem; margin-bottom: 10px;">
        ${name}
      </h3>
      
      <p style="color: #555; margin-bottom: 15px; line-height: 1.6;">
        ${description}
      </p>
      
      <p style="font-size: 1.1rem; letter-spacing: 0.05rem;">
        <strong>¥${price.toLocaleString()}</strong> 
        <span style="font-size: 0.9rem; color: #777;">
          (${taxText}) / ${durationText}
        </span>
      </p>

      ${!isAvailable ? html`
        <p style="font-size: 0.8rem; color: #d9534f; margin-top: 10px;">
          ※現在、こちらのプランは新規受付を停止しております。
        </p>
      ` : ''}
    </div>
  `
}