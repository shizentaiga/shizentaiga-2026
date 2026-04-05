/**
 * src/pages/Top.tsx
 * 【トップページ：ブランド・アイデンティティ定義層】
 * * ■ ビジネス視点の役割：
 * 1. 信頼性の獲得: 最初のLCP（読み込み速度）とデザインの整合性で、コンサルタントとしての専門性を直感的に伝える。
 * 2. 導線の集約: 拡散したSNSではなく、価値観の伝わる note/Qiita へトラフィックを集中させる。
 * 3. 資産の保護: htmlテンプレートを採用することで、既存のSEO資産（タグ構造）を100%維持したままモダン環境へ移行。
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
        {/* 戦略的ピボット：SNSリンクは反応と目的に応じて適宜整理。
          現在は note/Qiita に絞ることで、読了後のエンゲージメントを高める設計。
        */}
        <ul class="link-list">
          <li><a href="https://note.com/taiga_shizen" target="_blank" rel="noopener">note</a></li>
          <li><a href="https://qiita.com/tshizen2506" target="_blank" rel="noopener">Qiita</a></li>
        </ul>
      </section>
    </main>
    
    <footer>
      {/* 法務リスク管理：
        決済ボタンを設置するサービス展開において、/legal（特商法）への導線維持は必須。
      */}
      <p>&copy; 2026 Taiga Shizen.</p>
      <p><small><a href="/legal" class="footer-link">特定商取引法に基づく表記</a></small></p>
      <p><small>Contact: <span class="selectable-email">contact@shizentaiga.com</span></small></p>
    </footer>
  `
}