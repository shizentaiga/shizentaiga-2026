/**
 * ■ ファイルパス
 * src/_sandbox/tests/03_calendar.tsx
 * ■ 役割
 * カレンダーの月移動（範囲制限付き）の検証用。
 * formatInTimeZone を導入し、リモート環境（UTCサーバー）での表示のズレを完全に解消。
 */

import { Hono } from 'hono';
import { generateCalendarData, CalendarDay } from '../../lib/calendar-logic';
import { startOfMonth, addMonths, subMonths, isAfter, isBefore } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz'; // タイムゾーン解決の決定打

export const test03 = new Hono();

/* ==========================================
 * 1. 設定エリア（CONFIG）
 * ========================================== */
const CALENDAR_CONFIG = {
  PREV_LIMIT: 2, 
  NEXT_LIMIT: 3, 
  LOCALE: "Asia/Tokyo"
} as const;

/* ==========================================
 * 2. デザインエリア（STYLES）
 * ========================================== */
const inlineStyles = `
  .cal-wrapper { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 360px; margin: 20px auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); background: #fff; }
  .cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
  .cal-btn { text-decoration: none; color: #666; background: #f8f9fa; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 14px; transition: all 0.2s; border: 1px solid #eee; }
  .cal-btn:hover { background: #e9ecef; border-color: #ddd; }
  .cal-title { font-weight: 700; font-size: 17px; color: #1a1a1a; letter-spacing: -0.02em; }
  .cal-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 10px; }
  .cal-weekday { text-align: center; font-size: 11px; color: #adb5bd; font-weight: 600; text-transform: uppercase; padding: 5px 0; }
  .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; }
  .cal-day { text-align: center; padding: 10px 0; font-size: 14px; border-radius: 6px; color: #495057; }
  .cal-sun { color: #fa5252; font-weight: 500; } 
  .cal-sat { color: #228be6; font-weight: 500; }
  .cal-other { color: #dee2e6; opacity: 0.5; }
`;

test03.get('/', (c) => {
  /* ==========================================
   * 3. ロジックエリア（LOGIC）
   * ========================================== */

  // A. 【JST基準点の設定】
  // サーバーがUTC 4/15 23:00 でも、JST 4/16 08:00 として扱い、かつ 00:00:00 に丸める
  const now = new Date();
  const jstNow = toZonedTime(now, CALENDAR_CONFIG.LOCALE);
  const thisMonthStart = startOfMonth(jstNow);

  // B. 【移動限界の計算】
  const minLimitMonth = subMonths(thisMonthStart, CALENDAR_CONFIG.PREV_LIMIT);
  const maxLimitMonth = addMonths(thisMonthStart, CALENDAR_CONFIG.NEXT_LIMIT);

  // C. 【ベース日時の決定】
  const monthQuery = c.req.query('month');
  let baseDate: Date;

  if (monthQuery && /^\d{4}-\d{2}$/.test(monthQuery)) {
    // 常に JST の 00:00:00 を明示的にパース
    baseDate = new Date(`${monthQuery}-01T00:00:00+09:00`);
  } else {
    baseDate = thisMonthStart;
  }

  // D. 【ガードレール】
  if (isBefore(baseDate, minLimitMonth)) baseDate = minLimitMonth;
  if (isAfter(baseDate, maxLimitMonth)) baseDate = maxLimitMonth;

  // E. 【データ生成】
  const calendarDays = generateCalendarData(baseDate);

  // F. 【ナビゲーションの状態判定】
  // 💡 全ての format を formatInTimeZone に差し替え、サーバーのローカル時差を無視させる
  const canGoPrev = isAfter(baseDate, minLimitMonth);
  const canGoNext = isBefore(baseDate, maxLimitMonth);
  
  const prevMonthStr = formatInTimeZone(subMonths(baseDate, 1), CALENDAR_CONFIG.LOCALE, 'yyyy-MM');
  const nextMonthStr = formatInTimeZone(addMonths(baseDate, 1), CALENDAR_CONFIG.LOCALE, 'yyyy-MM');
  const currentTitle = formatInTimeZone(baseDate, CALENDAR_CONFIG.LOCALE, 'yyyy年 MM月');

  /* ==========================================
   * 4. テンプレートエリア（TEMPLATE）
   * ========================================== */
  
  const getDayClass = (day: CalendarDay) => {
    let classes = ['cal-day'];
    if (!day.isCurrentMonth) classes.push('cal-other');
    else if (day.isSunday) classes.push('cal-sun');
    else if (day.isSaturday) classes.push('cal-sat');
    return classes.join(' ');
  };

  return c.html(
    <html>
      <head>
        <title>Calendar Navigator - JST Fixed</title>
        <style>{inlineStyles}</style>
      </head>
      <body>
        <div class="cal-wrapper">
          <div class="cal-header">
            {canGoPrev ? (
              <a href={`?month=${prevMonthStr}`} class="cal-btn">←</a>
            ) : (
              <span style="visibility:hidden" class="cal-btn"></span>
            )}
            
            <span class="cal-title">{currentTitle}</span>

            {canGoNext ? (
              <a href={`?month=${nextMonthStr}`} class="cal-btn">→</a>
            ) : (
              <span style="visibility:hidden" class="cal-btn"></span>
            )}
          </div>

          <div class="cal-weekdays">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
              <div class="cal-weekday">{d}</div>
            ))}
          </div>

          <div class="cal-grid">
            {calendarDays.map((day) => (
              <div class={getDayClass(day)}>
                {day.dayNum}
              </div>
            ))}
          </div>
          
          {/* デバッグ用：リモート環境での時差を可視化 */}
          <div style="margin-top:20px; font-size:10px; color:#ccc; border-top:1px solid #eee; padding-top:10px;">
            Server ISO: {new Date().toISOString()}<br/>
            JST Fixed: {formatInTimeZone(baseDate, CALENDAR_CONFIG.LOCALE, 'yyyy-MM-dd HH:mm:ss')}
          </div>
        </div>
      </body>
    </html>
  );
});