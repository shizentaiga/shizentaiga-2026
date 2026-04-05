/**
 * src/renderer.tsx
 * 【全ページ共通の額縁（レイアウト・レンダラー）】
 * * このファイルは、全ページの <html>, <head>, <body> タグを管理します。
 * 各ページの中身を「共通の枠」で包んで出力する役割を持ちます。
 */

import { jsxRenderer } from 'hono/jsx-renderer'
import { Link, ViteClient } from 'vite-ssr-components/hono'
import { BUSINESS_INFO } from './constants/info' // 情報源をインポート

/**
 * 1. 型の拡張（TypeScript 用）
 * Hono の標準機能に「タイトル」や「説明文」を渡せるようにルールを追加します。
 */
declare module 'hono' {
  interface ContextRenderer {
    (
      children: any,
      props: {
        title?: string
        description?: string
        ogImage?: string
        canonical?: string
      }
    ): any
  }
}

/**
 * 2. 共通レンダラー本体
 */
export const renderer = jsxRenderer(({ children, title, description, ogImage, canonical }) => {
  
  // --- 基本設定の同期 ---
  const siteName = BUSINESS_INFO.brandName
  const defaultDesc = BUSINESS_INFO.defaultDesc
  const tagline = BUSINESS_INFO.tagline
  const defaultOgImage = "https://shizentaiga.com/images/og-p.webp"
  const baseUrl = "https://shizentaiga.com"

  return (
    <html lang="ja">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        {/* SEO・タイトル管理 */}
        <title>{title ? `${title} | ${siteName}` : siteName}</title>
        <meta name="description" content={description || defaultDesc} />
        <link rel="canonical" href={canonical || baseUrl} />

        {/* SNS (OGP) 設定 */}
        <meta property="og:title" content={title || siteName} />
        <meta property="og:description" content={description || tagline} />
        <meta property="og:image" content={ogImage || defaultOgImage} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />

        {/* 構造化データ (JSON-LD) 
            元の index.tsx から移植。情報の源泉 (info.ts) と同期させています。
        */}
        <script type="application/ld+json">
        {JSON.stringify({
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
              "description": defaultDesc,
              "knowsAbout": ["Management", "Automation", "Applied Mathematics"],
              "sameAs": [
                BUSINESS_INFO.links.note,
                BUSINESS_INFO.links.qiita,
                BUSINESS_INFO.links.x,
                BUSINESS_INFO.links.linkedin,
                BUSINESS_INFO.links.instagram,
                BUSINESS_INFO.links.listen
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
        })}
        </script>

        <ViteClient />
        <Link href="/src/style.css" rel="stylesheet" />
        
        {/* 各種アイコン設定 */}
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

/**
 * 💡 メンテナンス・マニュアル
 * 1. 共通設定の変更: info.ts を変更してください。このファイルが自動で読み込みます。
 * 2. 新しいアイコンの追加: <head> 内に <link> を追加してください。
 * 3. JSON-LD の変更: script タグ内の JSON 構造を修正してください。
 */