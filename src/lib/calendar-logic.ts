/**
 * @file calendar-logic.ts
 * @description カレンダーの「日付の並び」と「見た目（CSSクラス）」を計算する純粋なロジック層。
 */

import { 
  format, 
  startOfMonth, 
  startOfWeek, 
  addDays, 
  isSameDay, 
  isSameMonth, 
  getDay, 
  getDate 
} from 'date-fns';

/**
 * カレンダーの「1日分」が持つべき情報の定義（型）
 */
export interface CalendarDay {
  date: Date;
  dayNum: number;
  dateStr: string;      // HTMX通信用 'YYYY-MM-DD'
  monthLabel?: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSunday: boolean;
  isSaturday: boolean;
  isFirstDay: boolean;
  className: string;
}

/**
 * カレンダー表示用のデータ配列（計42日分）を生成
 */
export const generateCalendarData = (baseDate: Date = new Date()): CalendarDay[] => {
  const now = new Date();
  
  /**
   * [計算戦略]
   * 1. 表示したい月の「初日」を求める
   * 2. その日の「週の開始日（日曜日）」を求める。これがカレンダーの左上隅になる。
   */
  const monthStart = startOfMonth(baseDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });

  return Array.from({ length: 42 }).map((_, i) => {
    // 基準日から i 日加算して、対象日の Date オブジェクトを生成
    const targetDate = addDays(calendarStart, i);

    // 判定ロジック
    const isCurrentMonth = isSameMonth(targetDate, baseDate);
    const isToday = isSameDay(targetDate, now);
    const dayOfWeek = getDay(targetDate); // 0=日, 1=月...6=土
    const dayNum = getDate(targetDate);
    const isFirstDay = dayNum === 1;

    /**
     * 【HTMX通信用の文字列生成】
     * format(targetDate, 'yyyy-MM-dd') を使用。
     * 手動の文字列結合 `${y}-${m}-${d}` に比べ、ゼロ埋め(Pad)のミスが起きないため安全。
     */
    const dateStr = format(targetDate, 'yyyy-MM-dd');

    /**
     * 【デザインロジック】
     * Tailwind CSS のクラス組み立て
     */
    let classes = "relative py-3 text-center transition-all duration-200 ";
    
    if (!isCurrentMonth) {
      // 月外の日付は薄く表示（前後の月の残像）
      classes += "text-gray-300 opacity-40 bg-gray-50/30 ";
    } else {
      // 月内の日付の配色
      if (dayOfWeek === 0) classes += "text-red-500 font-medium ";      // 日曜
      else if (dayOfWeek === 6) classes += "text-blue-500 font-medium "; // 土曜
      else classes += "text-gray-700 ";
      
      // 今日の場合はアクセントカラーで強調
      if (isToday) classes += "bg-accent/5 ring-1 ring-inset ring-accent/20 ";
    }

    return {
      date: targetDate,
      dayNum: dayNum,
      dateStr: dateStr, 
      monthLabel: (isFirstDay || i === 0) ? `${format(targetDate, 'M')}/` : undefined,
      isCurrentMonth,
      isToday,
      isSunday: dayOfWeek === 0,
      isSaturday: dayOfWeek === 6,
      isFirstDay,
      className: classes.trim()
    };
  });
};