/**
 * src/pages/Top.tsx
 * 元の index.html のコンテンツ構造を完全に維持したトップページコンポーネントです。
 */

import { html } from 'hono/html'

export const Top = () => {
  return html`
    <header>
      <h1>清善 泰賀 <span class="subtitle">Taiga Shizen</span></h1>
    </header>

    <main>
      <section id="profile">
        <div class="profile-image-area" style="aspect-ratio: 300 / 400;">
          <img src="images/profile.webp" 
               alt="清善 泰賀" 
               width="300" 
               height="400" 
               loading="eager"
               fetchpriority="high"
               decoding="async">
        </div>
        <p>自然科学と数理モデルを基盤に、経営と意思決定理論を研究・実践する思想家および経営コンサルタント。</p>
      </section>

      <section id="service">
        <h2>Service</h2>
        <div class="service-card">
          <h3>個別経営診断</h3>
          <p>経営の盲点を外側から観測する、個別セッション。</p>
          <a href="https://www.reservestock.jp/pc_reserves_v3/courses/58025" class="btn">詳細・予約</a>
        </div>
      </section>

      <section id="links">
        <h2>Links</h2>
        <ul class="link-list">
          <li><a href="https://note.com/taiga_shizen" target="_blank" rel="noopener">note</a></li>
          <li><a href="https://qiita.com/tshizen2506" target="_blank" rel="noopener">Qiita</a></li>
        </ul>
      </section>
    </main>
    
    <footer>
      <p>&copy; 2026 Taiga Shizen.</p>
      <p><small><a href="/legal" class="footer-link">特定商取引法に基づく表記</a></small></p>
      <p><small>Contact: <span class="selectable-email">contact@shizentaiga.com</span></small></p>
    </footer>
  `
}