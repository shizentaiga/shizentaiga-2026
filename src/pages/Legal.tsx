/**
 * src/pages/Legal.tsx
 * 【法務情報ページ（規約・プライバシー・特商法）】
 * ■ 役割：利用規約や特定商取引法に基づく表記を一括管理。
 * ■ メンテナンス：文言の多くは src/constants/info.ts から自動同期。
 */

import { html } from 'hono/html'
import { Footer } from '../components/Layout/Footer'
import { BUSINESS_INFO } from '../constants/info'

/* --- 1. スタイル定数 --- */
const styles = {
  header: "text-align: center; margin-bottom: 60px;",
  h1: "font-size: 1.5rem; font-weight: 500; letter-spacing: 0.08em;",
  navUl: "list-style: none; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 15px; font-size: 0.9rem;",
  navLink: "color: #555; text-decoration: none;",
  section: "margin-bottom: 60px; scroll-margin-top: 40px;",
  h2: "font-size: 1.2rem; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 20px;",
  table: "width: 100%; border-collapse: collapse; font-size: 0.95rem;",
  tableRow: "border-bottom: 1px solid #ddd;",
  tableHeader: "text-align: left; padding: 12px; background: #fcfcfc; width: 30%;",
  tableData: "padding: 12px;",
  footerInfo: "font-size: 0.8rem; color: #666; text-align: right; margin-top: 40px; padding-top: 15px; border-top: 1px dotted #ddd;"
}

/* --- 2. リンクナビゲーション定義 --- */
const navItems = [
  { href: "#terms", label: "利用規約" },
  { href: "#privacy", label: "プライバシーポリシー" },
  { href: "#cookies", label: "Cookieポリシー" },
  { href: "#commercial", label: "特定商取引法" },
  { href: "#refund", label: "返金・キャンセル" },
  { href: "#contact", label: "お問い合わせ" }
]

/* --- 3. コンポーネント本体 --- */
export const Legal = () => {
  return html`
    <header style="${styles.header}">
      <h1 style="${styles.h1}">Legal</h1>
      <nav>
        <ul style="${styles.navUl}">
          ${navItems.map(item => html`
            <li><a href="${item.href}" style="${styles.navLink}">${item.label}</a></li>
          `)}
        </ul>
      </nav>
    </header>

    <main>
      <section id="terms" style="${styles.section}">
        <h2 style="${styles.h2}">利用規約 (Terms of Service)</h2>
        <p>${BUSINESS_INFO.policies.disclaimer}</p>
        <p>予約の変更・キャンセルは、<strong>サービス提供開始日の3日前（72時間前）まで</strong>とし、それ以降は料金の100%をキャンセル料として申し受けます。</p>
        <p>サービス内容の無断転載や転売を禁じ、紛議が生じた際は当方の所在地を管轄する裁判所を専属的合意管轄とするものとします。</p>
      </section>

      <section id="privacy" style="${styles.section}">
        <h2 style="${styles.h2}">プライバシーポリシー (Privacy Policy)</h2>
        <p><strong>Applicable Regions: Japan (APPI)</strong></p>
        <p>${BUSINESS_INFO.policies.privacyBrief}</p>
        <p>法令に基づく場合を除き、ご本人の同意なく個人情報を第三者に提供・開示することはありません。</p>
        <p>個人情報の開示・訂正・削除のご要望は、お問い合わせ窓口より承ります。</p>
      </section>

      <section id="cookies" style="${styles.section}">
        <h2 style="${styles.h2}">Cookieポリシー (Cookie Policy)</h2>
        <p>当サイトでは、利便性の向上および利用状況の分析のためにCookieを使用する場合があります。これらは特定の個人を識別するものではありません。</p>
      </section>

      <section id="commercial" style="${styles.section}">
        <h2 style="${styles.h2}">特定商取引法に基づく表記 (Commercial Disclosure)</h2>
        <table style="${styles.table}">
          <tr style="${styles.tableRow}">
            <th style="${styles.tableHeader}">事業者名称</th>
            <td style="${styles.tableData}">${BUSINESS_INFO.sellerName}</td>
          </tr>
          <tr style="${styles.tableRow}">
            <th style="${styles.tableHeader}">事業責任者</th>
            <td style="${styles.tableData}">${BUSINESS_INFO.representative}</td>
          </tr>
          <tr style="${styles.tableRow}">
            <th style="${styles.tableHeader}">所在地</th>
            <td style="${styles.tableData}">${BUSINESS_INFO.address}</td>
          </tr>
          <tr style="${styles.tableRow}">
            <th style="${styles.tableHeader}">電話番号</th>
            <td style="${styles.tableData}">${BUSINESS_INFO.tel}</td>
          </tr>
          <tr style="${styles.tableRow}">
            <th style="${styles.tableHeader}">販売価格</th>
            <td style="${styles.tableData}">各サービスの予約ページ、またはお申込みフォームに表示される金額（税込）</td>
          </tr>
          <tr style="${styles.tableRow}">
            <th style="${styles.tableHeader}">支払い方法</th>
            <td style="${styles.tableData}">${BUSINESS_INFO.paymentMethods.join('、')}</td>
          </tr>
          <tr style="${styles.tableRow}">
            <th style="${styles.tableHeader}">支払い時期</th>
            <td style="${styles.tableData}">${BUSINESS_INFO.paymentTiming}</td>
          </tr>
          <tr style="${styles.tableRow}">
            <th style="${styles.tableHeader}">商品の引渡時期</th>
            <td style="${styles.tableData}">${BUSINESS_INFO.deliveryTiming}</td>
          </tr>
        </table>
      </section>

      <section id="refund" style="${styles.section}">
        <h2 style="${styles.h2}">返金・キャンセル規定 (Refund Policy)</h2>
        <p><strong>【キャンセル】</strong><br>
        ${BUSINESS_INFO.policies.cancelPolicy}</p>
        <p><strong>【不良品・不備】</strong><br>
        サービスやコンテンツに不備がある場合は、速やかに調査し再提供等の対応をいたします。窓口よりご連絡ください。</p>
      </section>

      <section id="contact" style="${styles.section}">
        <h2 style="${styles.h2}">お問い合わせ (Contact Us)</h2>
        <table style="${styles.table}">
          <tr style="${styles.tableRow}">
            <th style="${styles.tableHeader}">メール</th>
            <td style="${styles.tableData}"><a href="mailto:${BUSINESS_INFO.email}">${BUSINESS_INFO.email}</a></td>
          </tr>
          <tr style="${styles.tableRow}">
            <th style="${styles.tableHeader}">営業時間</th>
            <td style="${styles.tableData}">${BUSINESS_INFO.businessHours}</td>
          </tr>
        </table>
      </section>

      <div style="${styles.footerInfo}">
        Last Updated: ${BUSINESS_INFO.policies.lastUpdated}
      </div>
    </main>

    ${Footer()}
  `
}