/**
 * src/pages/Legal.tsx
 * 【法務情報ページ（規約・プライバシー・特商法）】
 * ■ 役割：利用規約や特定商取引法に基づく表記を一括管理。
 * ■ デザイン：指定された静的HTMLのデザイン・余白・フォント設定を完全に再現。
 */

import { html } from 'hono/html'
import { BUSINESS_INFO } from '../constants/info'

/* --- 1. スタイル定義（デザイン指示を反映） --- */
const styles = {
  // コンテナ
  container: `
    font-family: "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif;
    line-height: 1.6;
    color: #222;
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 24px;
    background-color: #fff;
  `,
  header: "text-align: center; margin-bottom: 60px;",
  h1: "font-size: 1.5rem; font-weight: 500; letter-spacing: 0.08em; margin-bottom: 20px;",
  
  // ナビゲーション
  navUl: "list-style: none; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 15px; font-size: 0.9rem;",
  navLink: "color: #555; text-decoration: none; border-bottom: 1px solid transparent; transition: color 0.2s, border-color 0.2s;",
  
  // セクション
  section: "margin-bottom: 60px; scroll-margin-top: 40px;",
  h2: "font-size: 1.2rem; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 20px; font-weight: 600;",
  p: "margin-bottom: 1.2em;",
  strong: "font-weight: 600;",
  
  // テーブル
  table: "width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 0.95rem;",
  th: "text-align: left; padding: 12px 15px; border-bottom: 1px solid #ddd; vertical-align: top; width: 30%; background-color: #fcfcfc; font-weight: 500; color: #555;",
  td: "text-align: left; padding: 12px 15px; border-bottom: 1px solid #ddd; vertical-align: top;",
  
  // 更新日
  lastUpdated: "font-size: 0.8rem; color: #666; text-align: right; margin-top: 40px; padding-top: 15px; border-top: 1px dotted #ddd;"
}

const navItems = [
  { href: "#terms", label: "利用規約" },
  { href: "#privacy", label: "プライバシーポリシー" },
  { href: "#cookies", label: "Cookieポリシー" },
  { href: "#commercial", label: "特定商取引法" },
  { href: "#refund", label: "返金・キャンセル" },
  { href: "#contact", label: "お問い合わせ" }
]

/* --- 2. コンポーネント本体 --- */
export const Legal = () => {
  return html`
    <div style="${styles.container}">
      <header style="${styles.header}">
        <h1 style="${styles.h1}">Legal Information</h1>
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
          <p style="${styles.p}">${BUSINESS_INFO.policies.disclaimer}</p>
          <p style="${styles.p}">予約の変更・キャンセルは、<strong style="${styles.strong}">サービス提供開始日の3日前（72時間前）まで</strong>とし、それ以降は料金の100%をキャンセル料として申し受けます。</p>
          <p style="${styles.p}">サービス内容の無断転載や転売を禁じ、紛議が生じた際は当方の所在地を管轄する裁判所を専属的合意管轄とします。</p>
        </section>

        <section id="privacy" style="${styles.section}">
          <h2 style="${styles.h2}">プライバシーポリシー (Privacy Policy)</h2>
          <p style="${styles.p}"><strong style="${styles.strong}">Applicable Regions: Japan (APPI)</strong></p>
          <p style="${styles.p}">${BUSINESS_INFO.policies.privacyBrief}</p>
          <p style="${styles.p}">法令に基づく場合を除き、ご本人の同意なく個人情報を第三者に提供・開示することはありません。</p>
          <p style="${styles.p}">個人情報の開示・訂正・削除のご要望は、お問い合わせ窓口より承ります。</p>
        </section>

        <section id="cookies" style="${styles.section}">
          <h2 style="${styles.h2}">Cookieポリシー (Cookie Policy)</h2>
          <p style="${styles.p}">当サイトでは、利便性の向上および利用状況の分析のためにCookieを使用する場合があります。これらは特定の個人を識別するものではありません。</p>
        </section>

        <section id="commercial" style="${styles.section}">
          <h2 style="${styles.h2}">特定商取引法に基づく表記 (Commercial Disclosure)</h2>
          <table style="${styles.table}">
            <tr>
              <th style="${styles.th}">事業者名称</th>
              <td style="${styles.td}">${BUSINESS_INFO.sellerName}</td>
            </tr>
            <tr>
              <th style="${styles.th}">事業責任者</th>
              <td style="${styles.td}">${BUSINESS_INFO.representative}</td>
            </tr>
            <tr>
              <th style="${styles.th}">所在地</th>
              <td style="${styles.td}">${BUSINESS_INFO.address}</td>
            </tr>
            <tr>
              <th style="${styles.th}">電話番号</th>
              <td style="${styles.td}">${BUSINESS_INFO.tel}</td>
            </tr>
            <tr>
              <th style="${styles.th}">販売価格</th>
              <td style="${styles.td}">各サービスの予約ページ、またはお申込みフォームに表示される金額（税込）</td>
            </tr>
            <tr>
              <th style="${styles.th}">支払い方法</th>
              <td style="${styles.td}">${BUSINESS_INFO.paymentMethods.join('、')}</td>
            </tr>
            <tr>
              <th style="${styles.th}">支払い時期</th>
              <td style="${styles.td}">${BUSINESS_INFO.paymentTiming}</td>
            </tr>
            <tr>
              <th style="${styles.th}">商品の引渡時期</th>
              <td style="${styles.td}">${BUSINESS_INFO.deliveryTiming}</td>
            </tr>
          </table>
        </section>

        <section id="refund" style="${styles.section}">
          <h2 style="${styles.h2}">返金・キャンセル規定 (Refund Policy)</h2>
          <p style="${styles.p}"><strong style="${styles.strong}">【キャンセル】</strong><br>
          ${BUSINESS_INFO.policies.cancelPolicy}</p>
          <p style="${styles.p}"><strong style="${styles.strong}">【不良品・不備】</strong><br>
          サービスやコンテンツに不備がある場合は、速やかに調査し再提供等の対応をいたします。<a href="#contact">窓口</a>よりご連絡ください。</p>
        </section>

        <section id="contact" style="${styles.section}">
          <h2 style="${styles.h2}">お問い合わせ (Contact Us)</h2>
          <p style="${styles.p}">各種請求や個人情報の取り扱いに関するお問い合わせは、以下の窓口へご連絡ください。</p>
          <table style="${styles.table}">
            <tr>
              <th style="${styles.th}">メール</th>
              <td style="${styles.td}"><a href="mailto:${BUSINESS_INFO.email}">${BUSINESS_INFO.email}</a></td>
            </tr>
            <tr>
              <th style="${styles.th}">営業時間</th>
              <td style="${styles.td}">${BUSINESS_INFO.businessHours}</td>
            </tr>
            <tr>
              <th style="${styles.th}">応答目安</th>
              <td style="${styles.td}">原則として3営業日以内に回答いたします。</td>
            </tr>
          </table>
        </section>

        <div style="${styles.lastUpdated}">Last Updated: ${BUSINESS_INFO.policies.lastUpdated}</div>
      </main>
    </div>
  `
}