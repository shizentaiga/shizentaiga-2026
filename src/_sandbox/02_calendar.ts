/**
 * ==========================================================
 * ローカル検証用スクリプト (Sandbox)
 * * [実行コマンド]
 * npx tsx src/_sandbox/02_calendar.ts
 * ==========================================================
 */

console.log("--- Rolling Calendar Logic Test ---");

// (1) 現在の日付を表示 (型定義 : Date を追加)
const now: Date = new Date();
console.log(`【現在の日時】: ${now.toLocaleString('ja-JP')}\n`);

/**
 * (2) 前後5週間（過去1週 + 未来4週 = 35日間）を計算して表示
 */

// 曜日のラベル定義
const dayLabels: string[] = ["日", "月", "火", "水", "木", "金", "土"];

// 計算の開始地点を「7日前」に設定する
const startDate: Date = new Date();
startDate.setDate(now.getDate() - 7);

console.log("【35日間のリスト表示】");
console.log("------------------------------------------");

// 35日間ループを回す
for (let i = 0; i < 35; i++) {
  // ループごとに1日ずつ進めたDateオブジェクトを作成
  const targetDate: Date = new Date(startDate);
  targetDate.setDate(startDate.getDate() + i);

  // 表示用のデータ抽出
  const month: number = targetDate.getMonth() + 1;
  const date: number  = targetDate.getDate();
  const day: string   = dayLabels[targetDate.getDay()];

  // 今日かどうかを判定するフラグ
  const isToday: string = targetDate.toDateString() === now.toDateString() ? "★TODAY" : "";

  // 月が変わるタイミングを視認しやすくするため、1日の時に区切りを入れる
  if (date === 1) {
    console.log(`--- ${month}月 ---`);
  }

  // 出力の整形
  const monthStr: string = `${month}月`.padStart(3, ' ');
  const dateStr: string  = `${date}日`.padStart(3, ' ');
  
  console.log(`${monthStr}${dateStr} (${day}) ${isToday}`);
}

console.log("------------------------------------------");
console.log("--- Rolling Calendar Logic End ---");

// このファイルを独立したモジュールとして扱い、変数名の重複エラーを防ぐ
export {};