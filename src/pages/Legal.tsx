/**
 * src/pages/Legal.tsx
 * 【法務情報ページ（規約・プライバシー・特商法）】
 * * 利用規約や特定商取引法に基づく表記を一括管理します。
 * メンテナンス：文言の多くは src/constants/info.ts から自動同期されます。
 */

import { html } from 'hono/html'
import { Footer } from '../components/Layout/Footer'
import { BUSINESS_INFO } from '../constants/info'

export const Legal = () => {
  return html`
    <header style="text-align: center; margin-bottom: 60px;">
      <h1 style="font-size: 1.5rem; font-weight: 500; letter-spacing: 0.08em;">Legal Information</h1>
      <nav>
        <ul style="list-style: none; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 15px; font-size: 0.9rem;">
          <li><a href="#terms" style="color: #555; text-decoration: none;">利用規約</a></li>
          <li><a href="#privacy" style="color: #555; text-decoration: none;">プライバシーポリシー</a></li>
          <li><a href="#cookies" style="color: #555; text-decoration: none;">Cookieポリシー</a></li>
          <li><a href="#commercial" style="color: #555; text-decoration: none;">特定商取引法</a></li>
          <li><a href="#refund" style="color: #555; text-decoration: none;">返金・キャンセル</a></li>
          <li><a href="#contact" style="color: #555; text-decoration: none;">お問い合わせ</a></li>
        </ul>
      </nav>
    </header>

    <main>
      <section id="terms" style="margin-bottom: 60px; scroll-margin-top: 40px;">
        <h2 style="font-size: 1.2rem; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 20px;">利用規約 (Terms of Service)</h2>
        <p>${BUSINESS_INFO.policies.disclaimer}</p>
        <p>予約の変更・キャンセルは、<strong>サービス提供開始日の3日前（72時間前）まで</strong>とし、それ以降は料金の100%をキャンセル料として申し受けます。</p>
        <p>サービス内容の無断転載や転売を禁じ、紛議が生じた際は当方の所在地を管轄する裁判所を専属的合意管轄とするものとします。</p>
      </section>

      <section id="privacy" style="margin-bottom: 60px;">
        <h2 style="font-size: 1.2rem; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 20px;">プライバシーポリシー (Privacy Policy)</h2>
        <p><strong>Applicable Regions: Japan (APPI)</strong></p>
        <p>${BUSINESS_INFO.policies.privacyBrief}</p>
        <p>法令に基づく場合を除き、ご本人の同意なく個人情報を第三者に提供・開示することはありません。</p>
        <p>個人情報の開示・訂正・削除のご要望は、お問い合わせ窓口より承ります。</p>
      </section>

      <section id="cookies" style="margin-bottom: 60px;">
        <h2 style="font-size: 1.2rem; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 20px;">Cookieポリシー (Cookie Policy)</h2>
        <p>当サイトでは、利便性の向上および利用状況の分析のためにCookieを使用する場合があります。これらは特定の個人を識別するものではありません。</p>
      </section>

      <section id="commercial" style="margin-bottom: 60px;">
        <h2 style="font-size: 1.2rem; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 20px;">特定商取引法に基づく表記 (Commercial Disclosure)</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.95rem;">
          <tr style="border-bottom: 1px solid #ddd;">
            <th style="text-align: left; padding: 12px; background: #fcfcfc; width: 30%;">事業者名称</th>
            <td style="padding: 12px;">${BUSINESS_INFO.sellerName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <th style="text-align: left; padding: 12px; background: #fcfcfc;">事業責任者</th>
            <td style="padding: 12px;">${BUSINESS_INFO.representative}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <th style="text-align: left; padding: 12px; background: #fcfcfc;">所在地</th>
            <td style="padding: 12px;">${BUSINESS_INFO.address}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <th style="text-align: left; padding: 12px; background: #fcfcfc;">電話番号</th>
            <td style="padding: 12px;">${BUSINESS_INFO.tel}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <th style="text-align: left; padding: 12px; background: #fcfcfc;">販売価格</th>
            <td style="padding: 12px;">各サービスの予約ページ、またはお申込みフォームに表示される金額（税込）</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <th style="text-align: left; padding: 12px; background: #fcfcfc;">支払い方法</th>
            <td style="padding: 12px;">${BUSINESS_INFO.paymentMethods.join('、')}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <th style="text-align: left; padding: 12px; background: #fcfcfc;">支払い時期</th>
            <td style="padding: 12px;">${BUSINESS_INFO.paymentTiming}</td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <th style="text-align: left; padding: 12px; background: #fcfcfc;">商品の引渡時期</th>
            <td style="padding: 12px;">${BUSINESS_INFO.deliveryTiming}</td>
          </tr>
        </table>
      </section>

      <section id="refund" style="margin-bottom: 60px;">
        <h2 style="font-size: 1.2rem; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 20px;">返金・キャンセル規定 (Refund Policy)</h2>
        <p><strong>【キャンセル】</strong><br>
        ${BUSINESS_INFO.policies.cancelPolicy}</p>
        <p><strong>【不良品・不備】</strong><br>
        サービスやコンテンツに不備がある場合は、速やかに調査し再提供等の対応をいたします。窓口よりご連絡ください。</p>
      </section>

      <section id="contact" style="margin-bottom: 60px;">
        <h2 style="font-size: 1.2rem; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 20px;">お問い合わせ (Contact Us)</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.95rem;">
          <tr style="border-bottom: 1px solid #ddd;">
            <th style="text-align: left; padding: 12px; background: #fcfcfc; width: 30%;">メール</th>
            <td style="padding: 12px;"><a href="mailto:${BUSINESS_INFO.email}">${BUSINESS_INFO.email}</a></td>
          </tr>
          <tr style="border-bottom: 1px solid #ddd;">
            <th style="text-align: left; padding: 12px; background: #fcfcfc;">営業時間</th>
            <td style="padding: 12px;">${BUSINESS_INFO.businessHours}</td>
          </tr>
        </table>
      </section>

      <div style="font-size: 0.8rem; color: #666; text-align: right; margin-top: 40px; padding-top: 15px; border-top: 1px dotted #ddd;">
        Last Updated: ${BUSINESS_INFO.policies.lastUpdated}
      </div>
    </main>

    ${Footer()}
  `
}