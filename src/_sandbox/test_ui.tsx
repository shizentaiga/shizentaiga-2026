/**
 * ==========================================================
 * UI検証用スタンドアロンサーバー
 * [実行コマンド]
 * npx tsx --watch src/_sandbox/test_ui.tsx
 * ==========================================================
 */
import { Hono } from 'hono'
import { serve } from '@hono/node-server' // node-serverが必要な場合があります

const app = new Hono()

app.get('/', (c) => {
  const now = new Date()
  const dayLabels = ["日", "月", "火", "水", "木", "金", "土"]
  const startDate = new Date()
  startDate.setDate(now.getDate() - 7)

  // 35日間のデータ生成
  const days = Array.from({ length: 35 }).map((_, i) => {
    const targetDate = new Date(startDate)
    targetDate.setDate(startDate.getDate() + i)
    return {
      dateObj: targetDate,
      month: targetDate.getMonth() + 1,
      date: targetDate.getDate(),
      day: dayLabels[targetDate.getDay()],
      isToday: targetDate.toDateString() === now.toDateString()
    }
  })

  return c.html(
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>UI Sandbox</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@400;700&display=swap" rel="stylesheet" />
        <style>{`
          body { font-family: 'Noto Serif JP', serif; }
        `}</style>
      </head>
      <body className="bg-stone-100 text-stone-900 min-h-screen p-4 sm:p-8">
        <div className="max-w-md mx-auto">
          <header className="mb-8 text-center">
            <h1 className="text-xl font-bold tracking-widest text-stone-800">RESERVATION</h1>
            <p className="text-xs text-stone-500 mt-2">過去1週 / 未来4週のローリング表示</p>
          </header>

          <div className="space-y-3">
            {days.map((day, i) => (
              <div key={i}>
                {day.date === 1 && (
                  <div className="py-6 flex items-center gap-4">
                    <div className="h-px flex-1 bg-stone-300"></div>
                    <span className="text-sm font-bold text-stone-400">{day.month}月</span>
                    <div className="h-px flex-1 bg-stone-300"></div>
                  </div>
                )}
                
                <div className={`flex items-center justify-between p-4 bg-white border shadow-sm transition-all ${
                  day.isToday ? 'border-stone-800 ring-1 ring-stone-800' : 'border-stone-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="text-center min-w-[40px]">
                      <div className="text-[10px] text-stone-400 uppercase leading-none mb-1">{day.day}</div>
                      <div className={`text-xl font-medium leading-none ${day.isToday ? 'text-stone-900' : 'text-stone-700'}`}>
                        {day.date}
                      </div>
                    </div>
                    {day.isToday && (
                      <span className="text-[9px] tracking-tighter bg-stone-800 text-white px-1.5 py-0.5">TODAY</span>
                    )}
                  </div>

                  <button className="px-5 py-2 text-xs border border-stone-800 hover:bg-stone-800 hover:text-white transition-all duration-300 tracking-widest">
                    SELECT
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </body>
    </html>
  )
})

// 3001番ポートで独立して起動（本番が3000なら衝突しないように）
console.log('Sandbox server running on http://localhost:3001')
serve({ fetch: app.fetch, port: 3001 })

export {}