/**
 * ■ ファイルパス
 * src/_sandbox/tests/03_calendar.tsx
 * ■ 役割
 * カレンダーの月移動（範囲制限付き）の検証用。
 * リモート環境（UTC）での時差ボケを物理的に防ぐ「2日基準・数値判定モデル」。
 */

import { Hono } from 'hono';
import { generateCalendarData, CalendarDay } from '../../lib/calendar-logic';

export const test03 = new Hono();

/* ==========================================
 * 1. 設定エリア（CONFIG）
 * ========================================== */
const CALENDAR_CONFIG = {
  PREV_LIMIT: 2, // 今月より何ヶ月前まで戻れるか
  NEXT_LIMIT: 3, // 今月より何ヶ月先まで進めるか
  LOCALE: "Asia/Tokyo",
  SHOW_DEBUG: true // ★デバッグモニターのオン・オフ（true / false）
} as const;

/* ==========================================
 * 2. デザインエリア（STYLES）
 * ========================================== */
const inlineStyles = `
  .cal-wrapper { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 360px; margin: 20px auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); background: #fff; position: relative; }
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

  /* デバッグモニター用スタイル */
  .debug-monitor { 
    position: absolute; top: 0; left: 105%; width: 200px; 
    background: #1a1a1a; color: #00ff00; font-family: monospace; 
    font-size: 10px; padding: 12px; border-radius: 8px; 
    box-shadow: 0 4px 12px rgba(0,0,0,0.2); line-height: 1.6;
    border: 1px solid #333;
  }
  @media (max-width: 800px) { .debug-monitor { position: static; width: auto; margin-top: 20px; left: 0; } }
`;

test03.get('/', (c) => {
  /* ==========================================
   * 3. ロジックエリア（LOGIC）
   * ========================================== */

  // A. 【JSTの現在年月を数値で取得】
  const jstParts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: CALENDAR_CONFIG.LOCALE,
    year: 'numeric',
    month: '2-digit'
  }).formatToParts(new Date());

  const nowY = parseInt(jstParts.find(p => p.type === 'year')!.value);
  const nowM = parseInt(jstParts.find(p => p.type === 'month')!.value);

  // B. 【基準月の決定】
  const monthQuery = c.req.query('month'); 
  let targetY = nowY;
  let targetM = nowM;

  if (monthQuery && /^\d{4}-\d{2}$/.test(monthQuery)) {
    const [qY, qM] = monthQuery.split('-').map(Number);
    targetY = qY;
    targetM = qM;
  }

  // C. 【ガードレール：比較】
  const currentTotal = nowY * 12 + nowM;
  const targetTotal = targetY * 12 + targetM;
  const minTotal = currentTotal - CALENDAR_CONFIG.PREV_LIMIT;
  const maxTotal = currentTotal + CALENDAR_CONFIG.NEXT_LIMIT;

  let finalTotal = targetTotal;
  if (finalTotal < minTotal) finalTotal = minTotal;
  if (finalTotal > maxTotal) finalTotal = maxTotal;

  // 確定した年月を復元
  const resY = Math.floor((finalTotal - 1) / 12);
  const resM = ((finalTotal - 1) % 12) + 1;
  const resMonthStr = `${resY}-${String(resM).padStart(2, '0')}`;

  const baseDate = new Date(`${resMonthStr}-02`);

  // E. 【ナビゲーション用の値生成】
  const getLabel = (total: number) => {
    const y = Math.floor((total - 1) / 12);
    const m = ((total - 1) % 12) + 1;
    return { y, m, str: `${y}-${String(m).padStart(2, '0')}` };
  };

  const prev = getLabel(finalTotal - 1);
  const next = getLabel(finalTotal + 1);
  const canGoPrev = finalTotal > minTotal;
  const canGoNext = finalTotal < maxTotal;

  // F. 【データ生成】
  const calendarDays = generateCalendarData(baseDate);

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
        <title>Calendar Navigator - Debug Mode</title>
        <style>{inlineStyles}</style>
      </head>
      <body>
        <div class="cal-wrapper">
          
          {/* ★ デバッグモニター：設定がONの場合のみ表示 */}
          {CALENDAR_CONFIG.SHOW_DEBUG && (
            <div class="debug-monitor">
              <div style="border-bottom: 1px solid #333; margin-bottom: 8px; padding-bottom: 4px; color: #fff; font-weight: bold;">
                SYSTEM_STATE_MONITOR
              </div>
              <div>NOW_JST : {nowY}-{String(nowM).padStart(2, '0')}</div>
              <div>QUERY   : {monthQuery || "(empty)"}</div>
              <div>TARGET  : {resMonthStr}</div>
              <div style="margin-top: 8px; color: #888; font-size: 8px;">
                TOTAL_VAL : {finalTotal}<br/>
                LIMITS    : {minTotal} 〜 {maxTotal}
              </div>
            </div>
          )}

          <div class="cal-header">
            {canGoPrev ? (
              <a href={`?month=${prev.str}`} class="cal-btn">←</a>
            ) : (
              <span style="visibility:hidden" class="cal-btn"></span>
            )}
            
            <span class="cal-title">{resY}年 {resM}月</span>

            {canGoNext ? (
              <a href={`?month=${next.str}`} class="cal-btn">→</a>
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
          
          <div style="margin-top:20px; font-size:10px; color:#ccc; border-top:1px solid #eee; padding-top:10px;">
            Server ISO: {new Date().toISOString()}<br/>
            Target Month: {resMonthStr} (Fixed)
          </div>
        </div>
      </body>
    </html>
  );
});