/**
 * src/pages/Services.tsx
 * サービスプラン一覧、最新の予約状況、および申し込み導線を1ページに集約したコンポーネントです。
 * デザインパーツを src/components/ に委譲し、ここでは構造とデータの流し込みに専念します。
 */

import { html } from 'hono/html'
import { BUSINESS_INFO } from '../constants/info'
import { ServiceCard } from '../components/ServiceCard'
import { SlotItem } from '../components/SlotItem'

export const Services = () => {
  return html`
    <header>
      <h1>Services <span class="subtitle">Plans & Booking</span></h1>
    </header>

    <main>
      <section id="plans">
        <h2>Service Plans</h2>
        <div class="services-container">
          ${BUSINESS_INFO.services.map(s => ServiceCard({
            id: s.id || 'plan-default',
            name: s.name,
            description: s.description,
            price: s.price,
            taxText: s.taxIncluded ? '税込' : '税別',
            durationText: `${s.duration}${s.suffix || ''}`,
            isAvailable: true 
          }))}
        </div>
      </section>

      <section id="reservation" style="margin-top: 60px;">
        <h2>Available Slots</h2>
        <p style="font-size: 0.9rem; color: #555; margin-bottom: 25px;">
          セッションはオンライン（Google Meet）にて実施いたします。
        </p>
        
        <div class="slots-area" style="background: #fafafa; padding: 25px; border-radius: 2px;">
          <ul style="list-style: none; padding: 0; margin: 0;">
            ${BUSINESS_INFO.availableSlots.map(slot => SlotItem({
              date: slot.date,
              time: slot.time,
              status: 'open',
              statusText: '受付中'
            }))}
          </ul>
        </div>
      </section>

      <section id="booking-flow" style="margin-top: 80px; padding: 60px 20px; background: #1a1a1a; color: #fff; text-align: center; border-radius: 2px;">
        <h2 style="color: #fff; border: none; padding: 0; margin-bottom: 20px;">Booking & Inquiry</h2>
        <p style="margin-bottom: 30px; line-height: 1.8; opacity: 0.9;">
          ご希望の「プラン名」と「候補日時」を記載の上、<br class="pc-only">
          下記アドレスまでメールにてご連絡ください。
        </p>
        <div style="margin-bottom: 40px;">
          <a href="mailto:${BUSINESS_INFO.email}" class="btn" style="background: #fff; color: #1a1a1a; border-color: #fff; font-weight: 500; padding: 15px 40px;">
            ${BUSINESS_INFO.email}
          </a>
        </div>
        <p style="font-size: 0.85rem; opacity: 0.9;">
          原則、3営業日以内に詳細（事前ヒアリング事項・決済方法等）をご案内いたします。
        </p>
      </section>

      <hr />

      <section id="notes" style="font-size: 0.85rem; color: #555; line-height: 1.7;">
        <p><strong>キャンセルポリシー:</strong> ${BUSINESS_INFO.policies.cancelPolicy}</p>
        <p><strong>免責事項:</strong> ${BUSINESS_INFO.policies.disclaimer}</p>
      </section>
    </main>
  `
}