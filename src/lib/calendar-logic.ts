/**
 * 公式HP改善プロジェクト: カレンダー生成ロジック（最終版）
 */

export interface CalendarDay {
  date: Date;
  dayNum: number;
  monthLabel?: string;   // "4/" などの月表示用
  isCurrentMonth: boolean;
  isToday: boolean;
  isSunday: boolean;
  isSaturday: boolean;
  isFirstDay: boolean;   // 月の切り替わり判定用
  className: string;
}

export const generateCalendarData = (baseDate: Date = new Date()): CalendarDay[] => {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  
  const now = new Date();
  const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toDateString();

  const firstDayOfMonth = new Date(year, month, 1);
  const startDayIndex = firstDayOfMonth.getDay();

  const startDate = new Date(firstDayOfMonth.getTime());
  startDate.setDate(firstDayOfMonth.getDate() - startDayIndex);

  return Array.from({ length: 42 }).map((_, i) => {
    const targetDate = new Date(startDate.getTime());
    targetDate.setDate(startDate.getDate() + i);

    const isCurrentMonth = targetDate.getMonth() === month;
    const isSunday = targetDate.getDay() === 0;
    const isSaturday = targetDate.getDay() === 6;
    const isToday = targetDate.toDateString() === todayStr;
    const isFirstDay = targetDate.getDate() === 1;

    let classes = "relative py-3 text-center transition-all duration-200 ";
    
    if (!isCurrentMonth) {
      classes += "text-gray-300 opacity-40 bg-gray-50/30 ";
    } else {
      if (isSunday) classes += "text-red-500 font-medium ";
      else if (isSaturday) classes += "text-blue-500 font-medium ";
      else classes += "text-gray-700 ";
      
      if (isToday) classes += "bg-accent/5 ring-1 ring-inset ring-accent/20 ";
    }

    return {
      date: targetDate,
      dayNum: targetDate.getDate(),
      // 1日、またはカレンダーの左上端(i=0)に月情報を付与
      monthLabel: (isFirstDay || i === 0) ? `${targetDate.getMonth() + 1}/` : undefined,
      isCurrentMonth,
      isToday,
      isSunday,
      isSaturday,
      isFirstDay,
      className: classes.trim()
    };
  });
};