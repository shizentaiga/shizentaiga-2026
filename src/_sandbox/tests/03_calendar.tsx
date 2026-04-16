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

  // A. 【JSTの現在年月を数値で取得】
  // サーバーがUTCでも、Intlを使用してJSTの「年」「月」の数値を強制取得する
  const jstParts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: CALENDAR_CONFIG.LOCALE,
    year: 'numeric',
    month: '2-digit'
  }).formatToParts(new Date());

  const nowY = parseInt(jstParts.find(p => p.type === 'year')!.value);
  const nowM = parseInt(jstParts.find(p => p.type === 'month')!.value);

  // B. 【基準月の決定】
  const monthQuery = c.req.query('month'); // "2026-04"
  let targetY = nowY;
  let targetM = nowM;

  if (monthQuery && /^\d{4}-\d{2}$/.test(monthQuery)) {
    const [qY, qM] = monthQuery.split('-').map(Number);
    targetY = qY;
    targetM = qM;
  }

  // C. 【ガードレール：月を総数（total months）に変換して比較】
  // 時差の影響を受ける Date オブジェクトの比較を止め、純粋な数値計算に切り替え
  const currentTotal = nowY * 12 + nowM;
  const targetTotal = targetY * 12 + targetM;
  const minTotal = currentTotal - CALENDAR_CONFIG.PREV_LIMIT;
  const maxTotal = currentTotal + CALENDAR_CONFIG.NEXT_LIMIT;

  // 範囲外なら補正
  let finalTotal = targetTotal;
  if (finalTotal < minTotal) finalTotal = minTotal;
  if (finalTotal > maxTotal) finalTotal = maxTotal;

  // 確定した年月を復元
  const resY = Math.floor((finalTotal - 1) / 12);
  const resM = ((finalTotal - 1) % 12) + 1;
  const resMonthStr = `${resY}-${String(resM).padStart(2, '0')}`;

  // D. 【表示用 Date オブジェクトの生成：ハック】
  // 💡 「1日」を指定するとUTC環境で「前月末」に滑り落ちるリスクがあるため、
  // 意図的に「2日」を指定。これにより、9時間のズレが起きても同じ月の中に確実に留まる。
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
        <title>Calendar Navigator - JST Fixed</title>
        <style>{inlineStyles}</style>
      </head>
      <body>
        <div class="cal-wrapper">
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