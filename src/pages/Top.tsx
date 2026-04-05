/**
 * src/pages/Top.tsx
 * 【トップページの内容（コンテンツ本体）】
 * * このファイルは、サイトの「顔」となるトップページの中身だけを記述します。
 * 外枠（<html>等）は renderer.tsx が、足元は Footer.tsx が担当します。
 */

import { html } from 'hono/html'
import { Footer } from '../components/Footer'
import { BUSINESS_INFO } from '../constants/info'

export const Top = () => {
  return html`
    <main>
      <section id="profile">
        <header>
          <h1>清善 泰賀 <span class="subtitle">Taiga Shizen</span></h1>
        </header>
        
        {/* 画像エリア
            元の index.tsx にあったパフォーマンス最適化設定
            (aspect-ratio, eager, high priority, async) を完璧に移植しています。
        */}
        <div class="profile-image-area" style="aspect-ratio: 300 / 400; margin-bottom: 20px;">
          <img src="/images/profile.webp" 
               alt="清善 泰賀" 
               width="300" 
               height="400" 
               loading="eager"
               fetchpriority="high"
               decoding="async"
               style="max-width: 100%; height: auto;">
        </div>
        
        <p>自然科学と数理モデルを基盤に、経営と意思決定理論を研究・実践する思想家および経営コンサルタント。</p>
      </section>

      <section id="service" style="margin-top: 40px;">
        <h2>Service</h2>
        
        <div class="service-card" style="padding: 20px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 15px;">
          <h3>${BUSINESS_INFO.prices.individualDiagnosis.label}</h3>
          <p>経営の盲点を外側から観測する、個別セッション。</p>
          
          {/* 価格表記の動的生成 (localeString() で ¥49,500 のように整形) */}
          <p><strong>価格: ¥${BUSINESS_INFO.prices.individualDiagnosis.amount.toLocaleString()}（税込） / ${BUSINESS_INFO.prices.individualDiagnosis.duration}</strong></p>
          
          <a href="https://www.reservestock.jp/pc_reserves_v3/courses/58025" class="btn">詳細・予約</a>
        </div>
      </section>

      <section id="links" style="margin-top: 40px;">
        <h2>Links</h2>
        <ul class="link-list" style="list-style: none; padding: 0;">
          <li style="margin-bottom: 10px;">
            <a href="${BUSINESS_INFO.links.note}" target="_blank" rel="noopener">note (公式ブログ)</a>
          </li>
          <li style="margin-bottom: 10px;">
            <a href="${BUSINESS_INFO.links.qiita}" target="_blank" rel="noopener">Qiita (技術知見)</a>
          </li>
          {/* 他のSNSリンク (Linkedin, X など) も必要に応じて <li> を増やして表示します。 */}
        </ul>
      </section>

      ${Footer()}
    </main>
  `
}

/**
 * 💡 メンテナンス・マニュアル
 * 1. テキストの変更: 直接 HTML タグ内の文字を書き換えます。
 * 2. サービスの追加: service-card の div ごとコピーして増やしてください。
 * 3. 注意点: 画像の設定を変更すると、ページの表示速度（LCP）に悪影響を与えるリスクがあります。
 * 特に loading="eager" fetchpriority="high" は重要です。
 */