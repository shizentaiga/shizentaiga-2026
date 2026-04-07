/**
 * ==========================================================
 * ローカル検証用スクリプト (Sandbox)
 * * [実行コマンド]
 * npx tsx src/_sandbox/01_test.ts
 * ==========================================================
 */

// 1. 動作確認用のシンプルな出力
console.log("--- Sandbox Execution Start ---");

/**
 * 【ステップ1】現在の日付と曜日の取得
 * * Dateオブジェクトを使用して、実行時点の「年・月・日・曜日」を取得します。
 * 曜日は数値(0-6)で返されるため、配列を使って日本語表記に変換します。
 */

// 現在の日時インスタンスを作成
const now = new Date();

// 年・月・日の取得
const year = now.getFullYear();
const month = now.getMonth() + 1; // 月は0から始まるため+1
const date = now.getDate();

// 曜日の取得 (0:日, 1:月, 2:火, 3:水, 4:木, 5:金, 6:土)
const dayIndex = now.getDay();
const dayLabels = ["日", "月", "火", "水", "木", "金", "土"];
const dayLabel = dayLabels[dayIndex];

// コンソールへの出力
console.log(`本日の日付: ${year}年${month}月${date}日`);
console.log(`本日の曜日: ${dayLabel}曜日`);

console.log("--- Sandbox Execution End ---");

// このファイルを独立したモジュールとして扱い、変数名の重複エラーを防ぐ
export {};