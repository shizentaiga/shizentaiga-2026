/**
 * @file calendar-logic.ts
 * @description カレンダーの「日付の並び」と「見た目（CSSクラス）」を計算する純粋なロジック層。
 * [v5.6 デザイナー・ロジック分離モデル：型制約解除版]
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

/* --- 🎨 デザイナー担当エリア: スタイル定義 --- */

/**
 * カレンダーの各状態に応じた Tailwind CSS クラスの設定値
 * string 型を明示することで、自由なクラスの組み合わせを許可します。
 */
const CALENDAR_STYLE_CONFIG: Record<string, any> = {
  base: "relative py-3 text-center transition-all duration-200",
  // 月外（前月・翌月）の設定
  otherMonth: "text-gray-400 opacity-70", 
  // 月内の基本色
  currentMonth: {
    weekday: "text-gray-700",
    sunday: "text-red-500 font-medium",
    saturday: "text-blue-500 font-medium",
  },
  // 今日の強調表示
  today: "bg-accent/5 ring-1 ring-inset ring-accent/20"
};

/* --- ⚙️ エンジニア担当エリア: 計算ロジック --- */

export interface CalendarDay {
  date: Date;
  dayNum: number;
  dateStr: string;
  monthLabel?: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSunday: boolean;
  isSaturday: boolean;
  isFirstDay: boolean;
  className: string;
}

/**
 * デザインクラスを組み立てる内部関数
 */
const resolveDayClass = (isCurrentMonth: boolean, isToday: boolean, dayOfWeek: number): string => {
  const { base, otherMonth, currentMonth, today } = CALENDAR_STYLE_CONFIG;
  let classes: string[] = [base];

  if (!isCurrentMonth) {
    classes.push(otherMonth);
  } else {
    // 曜日ごとの配色
    if (dayOfWeek === 0) classes.push(currentMonth.sunday);
    else if (dayOfWeek === 6) classes.push(currentMonth.saturday);
    else classes.push(currentMonth.weekday);
    
    // 今日の強調
    if (isToday) classes.push(today);
  }

  return classes.join(" ");
};

/**
 * カレンダー表示用のデータ配列を生成
 */
export const generateCalendarData = (baseDate: Date = new Date()): CalendarDay[] => {
  const now = new Date();
  const monthStart = startOfMonth(baseDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });

  return Array.from({ length: 42 }).map((_, i) => {
    const targetDate = addDays(calendarStart, i);
    const isCurrentMonth = isSameMonth(targetDate, baseDate);
    const isToday = isSameDay(targetDate, now);
    const dayOfWeek = getDay(targetDate);
    const dayNum = getDate(targetDate);
    const isFirstDay = dayNum === 1;

    return {
      date: targetDate,
      dayNum: dayNum,
      dateStr: format(targetDate, 'yyyy-MM-dd'),
      monthLabel: (isFirstDay || i === 0) ? `${format(targetDate, 'M')}/` : undefined,
      isCurrentMonth,
      isToday,
      isSunday: dayOfWeek === 0,
      isSaturday: dayOfWeek === 6,
      isFirstDay,
      className: resolveDayClass(isCurrentMonth, isToday, dayOfWeek)
    };
  });
};