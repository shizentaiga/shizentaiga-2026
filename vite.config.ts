import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig } from 'vite'
import ssrPlugin from 'vite-ssr-components/plugin'
import hono from '@hono/vite-build' // Honoのビルド用プラグインを追加

export default defineConfig({
  plugins: [
    cloudflare(), 
    ssrPlugin(),
    // 引数としてサーバーサイドのエントリポイントを指定します
    hono({
      entry: './src/index.tsx' 
    })
  ],
    build: {
    // クライアントサイドとサーバーサイドの入力（エントリポイント）を定義
    rollupOptions: {
      input: {
        // 1. サーバーサイド（メインロジック）
        index: './src/index.tsx', 
        // 2. クライアントサイド（予約カレンダーの操作用TS）
        'booking-interaction': './src/client/booking-interaction.ts'
      },
      output: {
        // ビルド後のJSファイルを static/js フォルダに書き出す設定
        // これにより、Services.tsx から /static/js/booking-interaction.js で参照可能になります
        entryFileNames: 'static/js/[name].js',
      }
    }
  }
})