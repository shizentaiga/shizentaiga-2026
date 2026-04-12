/**
 * src/components/Footer.tsx
 * 【全ページ共通フッター部品】
 * * サイトの下部に表示される著作権表示やリンクを管理します。
 * info.ts から情報を参照するため、基本情報の変更は info.ts 側で行います。
 */

import { html } from 'hono/html'
import { BUSINESS_INFO } from '../../constants/info'

export const Footer = () => {
  // 現在の西暦を取得（毎年書き換える手間を省くための自動化）
  const currentYear = new Date().getFullYear()

  return html`
    <footer style="margin-top: 80px; padding: 40px 20px; border-top: 1px solid #eee; text-align: center; font-size: 0.9rem; color: #666;">
      <div class="footer-content">
        
        <p>&copy; ${currentYear} ${BUSINESS_INFO.representative}. All Rights Reserved.</p>
        
        <nav style="margin: 15px 0;">
          <a href="/legal" style="margin: 0 10px; color: #444; text-decoration: none;">特定商取引法に基づく表記</a>
          <span style="color: #ccc;">|</span>
          <span style="margin: 0 10px;">Contact: ${BUSINESS_INFO.email}</span>
        </nav>

        <p style="font-size: 0.8rem; color: #999; line-height: 1.6;">
          運営：${BUSINESS_INFO.sellerName} <br>
          営業時間：${BUSINESS_INFO.businessHours}
        </p>
        
      </div>
    </footer>
  `
}

/**
 * 💡 メンテナンス・マニュアル
 * 1. リンクの追加: <nav> タグの中に新しい <a> タグを記述してください。
 * 2. デザインの変更: footer タグの style 属性（インラインスタイル）を書き換えます。
 * 3. 外部監査・法務へのアピール:
 * 「${BUSINESS_INFO.email}」のように一元管理された定数を参照しているため、
 * 万が一の連絡先変更時も、サイト内全ての表記が漏れなく更新される安全な設計です。
 */