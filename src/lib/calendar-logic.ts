/**
 * @file calendar-logic.ts
 * @description 
 * カレンダーの「日付の並び」と「見た目（CSSクラス）」を計算する純粋なロジック層。
 * * ■ 呼び出し元: 
 * 主に `src/pages/Services.tsx` のデータ準備フェーズで呼び出され、
 * 返却されたデータが `src/components/CalendarSection` に渡されて描画されます。
 * * ■ 参照しているもの:
 * 標準の JavaScript Date オブジェクトのみを参照し、特定のDBには依存していません。
 */

/**
 * カレンダーの「1日分」が持つべき情報の定義（型）
 */
export interface CalendarDay {
  date: Date;           // JavaScript標準の日付オブジェクト
  dayNum: number;       // 日にちの数字（例: 15）
  dateStr: string;      // ★最重要: HTMX通信用 'YYYY-MM-DD' 文字列（例: "2026-04-15"）
  monthLabel?: string;  // 月の変わり目に表示するラベル（例: "4/"）
  isCurrentMonth: boolean; // 今月のデータかどうか（前後の月をグレーアウトするため）
  isToday: boolean;     // 今日かどうか
  isSunday: boolean;    // 日曜日（赤字用）
  isSaturday: boolean;  // 土曜日（青字用）
  isFirstDay: boolean;  // 1日かどうか
  className: string;    // Tailwind CSSのクラス名（見た目の決定）
}

/**
 * カレンダー表示用のデータ配列（計42日分）を生成する関数
 * * 【改版時の注意点】:
 * 1. 42日分（6週分）を返す仕様は、多くのカレンダーUIの標準です。数を変えるとレイアウトが崩れます。
 * 2. `dateStr` の生成ロジックを変更する際は、DB（D1）側の `date_string` の形式とズレないよう注意してください。
 * 3. タイムゾーンによる「1日のズレ」を防ぐため、Dateオブジェクトの直接操作ではなく、
 * 可能な限り `dateStr` (文字列) をベースに比較・通信を行うようにしてください。
 */
export const generateCalendarData = (baseDate: Date = new Date()): CalendarDay[] => {
  // 基準となる年月を特定
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  
  // 今日という日を特定（toDateStringで時刻を切り捨てて比較用に使用）
  const now = new Date();
  const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toDateString();

  // カレンダーの表示開始日を計算（月の初日の曜日を調べ、前月の残りを埋めるための開始日を特定）
  const firstDayOfMonth = new Date(year, month, 1);
  const startDayIndex = firstDayOfMonth.getDay();

  const startDate = new Date(firstDayOfMonth.getTime());
  startDate.setDate(firstDayOfMonth.getDate() - startDayIndex);

  // 6週間分（42日間）のデータを生成
  return Array.from({ length: 42 }).map((_, i) => {
    // 1日ずつ日付をずらして判定
    const targetDate = new Date(startDate.getTime());
    targetDate.setDate(startDate.getDate() + i);

    const isCurrentMonth = targetDate.getMonth() === month;
    const isSunday = targetDate.getDay() === 0;
    const isSaturday = targetDate.getDay() === 6;
    const isToday = targetDate.toDateString() === todayStr;
    const isFirstDay = targetDate.getDate() === 1;

    /**
     * 【HTMX通信用の文字列生成】
     * タイムゾーンのズレを避けるため、toISOString()等を使わず、数値を直接結合。
     * これが /services/slots?date=YYYY-MM-DD のパラメータとして使われます。
     */
    const y = targetDate.getFullYear();
    const m = (targetDate.getMonth() + 1).toString().padStart(2, '0');
    const d = targetDate.getDate().toString().padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;

    /**
     * 【デザインロジック】
     * 見た目に関する分岐。ここを修正すると、カレンダーの文字色や背景色が変わります。
     */
    let classes = "relative py-3 text-center transition-all duration-200 ";
    
    if (!isCurrentMonth) {
      // 月外の日付は薄く表示
      classes += "text-gray-300 opacity-40 bg-gray-50/30 ";
    } else {
      // 月内の日付の配色
      if (isSunday) classes += "text-red-500 font-medium ";
      else if (isSaturday) classes += "text-blue-500 font-medium ";
      else classes += "text-gray-700 ";
      
      // 今日の場合は枠線をつける
      if (isToday) classes += "bg-accent/5 ring-1 ring-inset ring-accent/20 ";
    }

    // 各日付のオブジェクトを返却
    return {
      date: targetDate,
      dayNum: targetDate.getDate(),
      dateStr: dateStr, 
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