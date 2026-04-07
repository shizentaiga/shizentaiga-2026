/**
 * src/renderer.tsx
 * 【全ページ共通の額縁（レイアウト・レンダラー）】
 * * このファイルは、全ページの <html>, <head>, <body> タグを管理します。
 * 各ページ（Top, Services 等）の中身を「共通の枠」で包んで出力する役割を持ちます。
 */

import { jsxRenderer } from 'hono/jsx-renderer'
import { Link, ViteClient } from 'vite-ssr-components/hono'

/**
 * 1. 型の拡張（TypeScript 用）
 * Hono の標準機能に「タイトル」や「説明文」を渡せるようにルールを追加します。
 */
declare module 'hono' {
  interface ContextRenderer {
    (
      children: any,      // 第1引数：ページの中身（JSX）
      props?: {           // 第2引数：【修正ポイント】「?」をつけて任意（オプション）にします
        title?: string       // ページタイトル（任意）
        description?: string // ページ説明文（任意）
        ogImage?: string     // SNS共有用画像（任意）
        canonical?: string   // 正規URL（任意）
      }
    ): any 
  }
}

/**
 * 2. 共通レンダラー本体
 * 全ページで共有される HTML 構造を定義します。
 */
/* 修正箇所1: 引数に 'c' (Context) を追加し、現在のURLを取得可能にします */
export const renderer = jsxRenderer(({ children, title, description, ogImage, canonical }, c) => {
  
  // --- サイト全体の基本設定（Single Source of Truth への移行準備） ---
  const siteName = "清善 泰賀 | Taiga Shizen Official"
  const defaultDesc = "自然科学と数理モデルを基盤に、経営の盲点を外側から観測する個別診断を提供。"
  const defaultOgImage = "https://shizentaiga.com/images/og-p.webp"
  const baseUrl = "https://shizentaiga.com"

  /* 修正箇所2: SEO改善。Lighthouseで指摘された「Canonicalがルート固定」問題を解決。
     個別指定がない場合、現在のパスを自動付与して正規URLを生成します。 */
  const currentFullUrl = canonical || `${baseUrl}${c.req.path}`

  return (
    <html lang="ja">
      <head>
        {/* 基本のメタタグ */}
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        {/* SEO・タイトル管理 
          論理：個別ページで title が指定されていれば「ページ名 | サイト名」とし、
          なければ「サイト名」のみを表示します。
        */}
        <title>{title ? `${title} | ${siteName}` : siteName}</title>
        <meta name="description" content={description || defaultDesc} />
        
        {/* 修正箇所3: 動的に生成した URL を適用（SEOスコアが向上します） */}
        <link rel="canonical" href={currentFullUrl} />

        {/* SNS (OGP) 設定 */}
        <meta property="og:title" content={title || siteName} />
        <meta property="og:description" content={description || defaultDesc} />
        <meta property="og:image" content={ogImage || defaultOgImage} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />

        {/* 外部アセット読み込み
          ViteClient を削除すると、開発時の自動更新（ホットリロード）が止まるため必須です。
        */}
        <ViteClient />

        {/* 修正箇所4: デザイン崩れ対策。
            Tailwind v4 のビルド済み CSS を標準の link タグで確実に読み込みます。
            これにより Services.tsx 側の外部 CDN (script) を削除してもデザインが維持されます。 */}
        <link rel="stylesheet" href="/src/style.css" />
        
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        {/* 修正箇所5（再修正）：
            トップページ等の既存レイアウトを維持するため、
            一度 .container クラスを持つ div を戻します。
            もし Services.tsx で幅が狭すぎる場合は、Services.tsx 側で
            max-w-none などを指定して調整するのが最も安全です。
        */}
        <div className="container mx-auto">
          {children}
        </div>
      </body>
    </html>
  )
})