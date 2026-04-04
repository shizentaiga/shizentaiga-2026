/**
 * src/index.tsx
 * プロジェクト名: shizentaiga-2026
 * * このファイルは、Webサイトの「司令塔」です。
 * ブラウザから「/（トップページ）」へのリクエストが来た際、
 * 既存のHTMLをHonoのエンジンで包んで返却します。
 */

import { Hono } from 'hono'
import { html } from 'hono/html'

const app = new Hono()

// ---------------------------------------------------------
// トップページ（/）のルーティング設定
// ---------------------------------------------------------
app.get('/', (c) => {
  return c.html(html`
    <!DOCTYPE html>
    <html lang="ja">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>清善 泰賀 | Taiga Shizen Official</title>
      <meta name="description" content="自然科学と数理モデルを基盤に、経営の盲点を外側から観測する個別診断を提供。">
      <meta name="author" content="清善 泰賀">
      <meta name="robots" content="index,follow">
      <link rel="canonical" href="https://shizentaiga.com">
      
      <link rel="icon" href="/favicon.ico" sizes="any">
      <link rel="icon" href="/favicon.svg" type="image/svg+xml">
      <link rel="apple-touch-icon" href="/apple-touch-icon.png">

      <meta property="og:title" content="清善 泰賀 | Taiga Shizen Official">
      <meta property="og:description" content="不完全な論理のその先を、観測する。">
      <meta property="og:image" content="https://shizentaiga.com/images/og-p.webp">
      <meta property="og:image:width" content="1200">
      <meta property="og:image:height" content="630">
      <meta property="og:url" content="https://shizentaiga.com">
      <meta property="og:type" content="website">
      <meta property="og:site_name" content="清善 泰賀 公式ホームページ">

      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="清善 泰賀 | Taiga Shizen Official">
      <meta name="twitter:description" content="不完全な論理のその先を、観測する。">
      <meta name="twitter:image" content="https://shizentaiga.com/images/og-p.webp">

      <link rel="stylesheet" href="/style.css">

      <link rel="preload" as="image" href="/images/profile.webp">

      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Person",
            "@id": "https://shizentaiga.com/#person",
            "name": "清善 泰賀",
            "alternateName": "Taiga Shizen",
            "url": "https://shizentaiga.com/",
            "image": "https://shizentaiga.com/images/profile.webp",
            "jobTitle": ["経営コンサルタント", "著述家"],
            "description": "自然科学と数理モデルを基盤に、経営と意思決定を研究・実践する経営コンサルタント、著述家。",
            "knowsAbout": ["Management", "Automation", "Applied Mathematics"],
            "sameAs": [
              "https://note.com/taiga_shizen",
              "https://qiita.com/tshizen2506",
              "https://www.linkedin.com/in/taigashizen",
              "https://x.com/tshizen202506",
              "https://www.instagram.com/taiga_shizen",
              "https://listen.style/u/tshizen2506"
            ]
          },
          {
            "@type": "WebSite",
            "@id": "https://shizentaiga.com/#website",
            "url": "https://shizentaiga.com",
            "name": "清善泰賀 公式ホームページ",
            "publisher": { "@id": "https://shizentaiga.com/#person" },
            "inLanguage": "ja"
          }
        ]
      }
      </script>    
    </head>
    <body>
      <div class="container">
        <header>
          <h1>清善 泰賀 <span class="subtitle">Taiga Shizen</span></h1>
        </header>

        <main>
          <section id="profile">
            <div class="profile-image-area" style="aspect-ratio: 300 / 400;">
              <img src="/images/profile.webp" 
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
      </div>
    </body>
    </html>
  `)
})

export default app