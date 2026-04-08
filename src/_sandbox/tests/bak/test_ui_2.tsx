/**
 * ==========================================================
 * [実行コマンド]
 * npx tsx src/_sandbox/test_ui_2.tsx
 * ==========================================================
 */
import { Hono } from 'hono'
import { serve } from '@hono/node-server'

const app = new Hono()

const tailwindConfig = `
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          'primary': '#1a1a1a',
          'accent': '#2c5282',
          'text-main': '#333333',
          'text-sub': '#555555',
        }
      }
    }
  }
`

app.get('/', (c) => {
  const now = new Date()
  
  // 1. 基準となる「7日前」を計算
  const startDate = new Date()
  startDate.setDate(now.getDate() - 7)

  // 【最重要】グリッドのズレを直すための計算
  // 7日前の「曜日(0-6)」を取得。この数だけ空のセルを前に置くことで、
  // カレンダーの列（SUN/MON...）と実際の日付の曜日を一致させます。
  const startDayIndex = startDate.getDay(); 
  const emptyCells = Array.from({ length: startDayIndex });

  // 35日間のデータ生成
  const days = Array.from({ length: 35 }).map((_, i) => {
    const targetDate = new Date(startDate.getTime()); 
    targetDate.setDate(startDate.getDate() + i);
    
    const dayIndex = targetDate.getDay();
    let dayClass = "py-2 cursor-pointer hover:bg-gray-100 rounded-full transition-colors text-[11px]";

    // 曜日による色分け
    if (dayIndex === 0) {
      dayClass += " text-red-600 font-medium";  // 日曜：赤
    } else if (dayIndex === 6) {
      dayClass += " text-blue-600 font-medium"; // 土曜：青
    } else {
      dayClass += " text-text-main";           // 平日
    }
        
    return {
      dateObj: targetDate,
      date: targetDate.getDate(),
      dayClass,
      isToday: targetDate.toDateString() === now.toDateString()
    }
  })

  return c.html(
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Calendar Logic Test - Shizen Taiga</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <script dangerouslySetInnerHTML={{ __html: tailwindConfig }} />
        <style>{`
          .cal-sun { color: #dc2626; font-weight: 500; }
          .cal-sat { color: #2563eb; font-weight: 500; }
        `}</style>
      </head>
      <body className="bg-gray-100 p-10">
        
        <div className="max-w-md mx-auto bg-white p-8 rounded-sm shadow-sm border border-gray-100 font-sans text-text-main">
          
          <div className="mb-6 font-medium text-primary text-sm tracking-widest uppercase text-center">
            RESERVATION SLOT
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-[10px] text-center">
            {/* 曜日ヘッダー（ここも色を固定） */}
            <div className="text-red-600 py-2 font-medium">SUN</div>
            <div className="py-2 text-gray-400">MON</div>
            <div className="py-2 text-gray-400">TUE</div>
            <div className="py-2 text-gray-400">WED</div>
            <div className="py-2 text-gray-400">THU</div>
            <div className="py-2 text-gray-400">FRI</div>
            <div className="text-blue-600 py-2 font-medium">SAT</div>

            {/* 2. 空セルをレンダリング（これで開始位置がずれるのを防ぐ） */}
            {emptyCells.map((_, i) => (
              <div key={`empty-${i}`} className="py-2"></div>
            ))}

            {/* 3. 日付をレンダリング */}
            {days.map((day, i) => (
              <div 
                key={i}
                className={`relative ${day.dayClass} ${
                  day.isToday ? 'bg-accent text-white font-medium hover:bg-accent/90 outline outline-1 outline-offset-1 outline-accent/30' : ''
                }`}
              >
                {day.date}
                {day.date === 1 && (
                  <span className={`absolute -top-1 -left-1 text-[8px] px-1 rounded-sm ${day.isToday ? 'bg-white text-accent' : 'bg-stone-100 text-stone-400'}`}>
                    {(day.dateObj.getMonth() + 1)}月
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 text-[10px] text-text-sub border-t pt-4 space-y-1 text-center">
            <p>※本日の日付が強調されます。</p>
          </div>
        </div>

      </body>
    </html>
  )
})

console.log('Sandbox server running on http://localhost:3002')
serve({ fetch: app.fetch, port: 3002 })

export {}