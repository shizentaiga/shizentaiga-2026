/**
 * @file Error.tsx
 * @description 汎用エラー表示ページ。
 * 予約、決済、システムエラーなど、すべての例外系を抽象化して受け入れます。
 */

export const ErrorPage = ({ message }: { message?: string }) => {
  return (
    <div class="max-w-xl mx-auto py-20 px-6 text-center">
      <div class="mb-8">
        <span class="text-4xl text-gray-300">⚠️</span>
      </div>
      
      <h1 class="text-xl font-medium tracking-[0.2em] text-gray-900 mb-4 uppercase">
        Attention
      </h1>
      
      <p class="text-sm text-gray-600 leading-relaxed mb-8">
        {message || '申し訳ございません。処理の途中でエラーが発生しました。'}
        <br />
        通信環境を確認いただくか、最初からやり直してください。
      </p>

      <div class="pt-8 border-t border-gray-100">
        <a 
          href="/" 
          class="inline-block px-8 py-3 bg-gray-900 text-white text-[10px] tracking-[0.2em] uppercase rounded-sm hover:bg-gray-800 transition-colors"
        >
          Back to Top
        </a>
      </div>
    </div>
  )
}