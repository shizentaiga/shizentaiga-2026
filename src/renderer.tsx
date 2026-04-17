/**
 * src/renderer.tsx
 * 【全ページ共通の額縁（レイアウト・レンダラー）】
 * ■ 役割：
 * 1. 共通基盤の提供: <html>, <head>, <body> を一括管理し、保守性を向上。
 * 2. アイデンティティの定義: JSON-LD (LD+JSON) を通じ、検索エンジンへ「清善 泰賀」の概念を正確に伝達。
 * 3. パフォーマンス最適化: ViteClient による HMR 維持と、メタデータの動的生成。
 */

import { jsxRenderer } from 'hono/jsx-renderer'
import { Link, ViteClient } from 'vite-ssr-components/hono'

/**
 * 1. 型の拡張（TypeScript 用）
 */
declare module 'hono' {
  interface ContextRenderer {
    (
      children: any,      // 第1引数：ページの中身（JSX）
      props?: {           // 第2引数：任意（オプション）
        title?: string       // ページタイトル
        description?: string // ページ説明文
        ogImage?: string     // SNS共有用画像
        canonical?: string   // 正規URL
      }
    ): any 
  }
}

/**
 * 2. 共通レンダラー本体
 */
export const renderer = jsxRenderer(({ children, title, description, ogImage, canonical }) => {
  
  // --- サイト全体の基本設定（Single Source of Truth） ---
  const siteName = "清善 泰賀 | Taiga Shizen Official"
  const defaultDesc = "自然科学と数理モデルを基盤に、経営の盲点を外側から観測する個別診断を提供。"
  const defaultOgImage = "https://shizentaiga.com/images/og-p.webp"
  const baseUrl = "https://shizentaiga.com"

  /**
   * 💡 構造化データ（JSON-LD）の定義
   * 以前の静的HTML版の @graph 構造を継承しつつ、リザスト情報を完全に排除。
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${baseUrl}/#person`,
        "name": "清善 泰賀",
        "alternateName": "Taiga Shizen",
        "url": baseUrl,
        "image": `${baseUrl}/images/profile.webp`,
        "jobTitle": ["経営コンサルタント", "著述家"],
        "description": "自然科学と数理モデルを基盤に、経営と意思決定を研究・実践する経営コンサルタント、著述家。",
        "knowsAbout": ["Management", "Automation", "Applied Mathematics"],
        "sameAs": [
          "https://note.com/taiga_shizen",
          "https://qiita.com/tshizen2506",
          "https://www.linkedin.com/in/taigashizen/",
          "https://x.com/tshizen202506",
          "https://www.instagram.com/taiga_shizen/",
          "https://listen.style/u/tshizen2506"
        ]
      },
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        "url": baseUrl,
        "name": "清善泰賀 公式ホームページ",
        "publisher": { "@id": `${baseUrl}/#person` },
        "inLanguage": "ja"
      }
    ]
  }

  return (
    <html lang="ja">
      <head>
        {/* 基本のメタタグ */}
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        {/* SEO・タイトル管理 */}
        <title>{title ? `${title} | ${siteName}` : siteName}</title>
        <meta name="description" content={description || defaultDesc} />
        <link rel="canonical" href={canonical || baseUrl} />

        {/* 💡 構造化データ（JSON-LD）の出力 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* SNS (OGP) 設定 */}
        <meta property="og:title" content={title || siteName} />
        <meta property="og:description" content={description || "不完全な論理のその先を、観測する。"} />
        <meta property="og:image" content={ogImage || defaultOgImage} />
        <meta property="og:url" content={canonical || baseUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="清善 泰賀 公式ホームページ" />
        <meta name="twitter:card" content="summary_large_image" />

        {/* 外部アセット読み込み */}
        <ViteClient />
        <Link href="/src/style.css" rel="stylesheet" />
        
        {/* ファビコン最適化 */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        <div className="container">
          {children}
        </div>
      </body>
    </html>
  )
})