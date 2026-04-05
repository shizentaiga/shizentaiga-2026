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
 * 修正リスク：ここを削除すると、各ページで title 等を指定した際にコンパイルエラーが発生します。
 */
declare module 'hono' {
  interface ContextRenderer {
    (
      children: any,      // ページの中身（JSX）
      props: {
        title?: string       // ページタイトル（任意）
        description?: string // ページ説明文（任意）
        ogImage?: string     // SNS共有用画像（任意）
        canonical?: string   // 正規URL（任意）
      }
    ): any // 実行環境による型の不一致を防ぐため any を指定
  }
}

/**
 * 2. 共通レンダラー本体
 * 全ページで共有される HTML 構造を定義します。
 */
export const renderer = jsxRenderer(({ children, title, description, ogImage, canonical }) => {
  
  // --- サイト全体の基本設定（Single Source of Truth への移行準備） ---
  // 修正ポイント：サイト名や共通説明文を変更したい場合はここを書き換えます。
  const siteName = "清善 泰賀 | Taiga Shizen Official"
  const defaultDesc = "自然科学と数理モデルを基盤に、経営の盲点を外側から観測する個別診断を提供。"
  const defaultOgImage = "https://shizentaiga.com/images/og-p.webp"
  const baseUrl = "https://shizentaiga.com"

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
        <link rel="canonical" href={canonical || baseUrl} />

        {/* SNS (OGP) 設定
          修正リスク：og:type を "article" 等に変える場合は、ページごとの条件分岐が必要です。
        */}
        <meta property="og:title" content={title || siteName} />
        <meta property="og:description" content={description || defaultDesc} />
        <meta property="og:image" content={ogImage || defaultOgImage} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />

        {/* 外部アセット読み込み
          修正ポイント：新しい CSS ファイルを追加する場合は <Link> を増やします。
          リスク：ViteClient を削除すると、開発時の自動更新（ホットリロード）が止まります。
        */}
        <ViteClient />
        <Link href="/src/style.css" rel="stylesheet" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        {/* メインコンテンツの挿入位置
          修正ポイント：全ページ共通の「背景色」や「枠組み」を変えたい場合は 
          container クラスのスタイル（style.css）またはここの div 構造を変更します。
        */}
        <div className="container">
          {children}
        </div>
      </body>
    </html>
  )
})