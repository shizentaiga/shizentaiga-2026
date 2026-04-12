/**
 * @file /src/lib/slot-logic.ts
 * @description グリッド・アトミックモデルにおける予約枠の合成ロジック。
 * 30分単位のチップを連結し、プランの必要時間を満たす開始候補地点を算出します。
 */

/**
 * 連続するチップから予約可能な開始時間を算出する
 * @param availableChips - DBから取得した、未予約の30分単位チップ（Unix秒の配列）
 * @param totalDurationMin - 合計拘束時間 (施術 duration + 清掃 buffer)
 * @returns 予約開始候補のUnixタイムスタンプ配列
 */
export const calculatePossibleSlots = (
  availableChips: number[], 
  totalDurationMin: number
): number[] => {
  if (availableChips.length === 0) return [];

  // 1. 昇順にソート（DBでソート済みのはずだが、安全のため）
  const sortedChips = [...availableChips].sort((a, b) => a - b);
  
  // 2. プランに必要な「連続チップ枚数」を算出 (例: 90分なら 3枚)
  const chipsNeeded = Math.ceil(totalDurationMin / 30);
  const GRID_STEP = 1800; // 30分 = 1800秒

  const results: number[] = [];

  /**
   * 3. 窓関数のようなロジックで連続性をチェック
   * 各チップを開始地点と仮定し、そこから chipsNeeded 分の連続したチップが存在するか確認する
   */
  for (let i = 0; i <= sortedChips.length - chipsNeeded; i++) {
    const startUnix = sortedChips[i];
    let isContinuous = true;

    for (let j = 1; j < chipsNeeded; j++) {
      // 次のチップが「開始地点 + 30分×j」の位置にあるかチェック
      const expectedUnix = startUnix + (GRID_STEP * j);
      if (!sortedChips.includes(expectedUnix)) {
        isContinuous = false;
        break;
      }
    }

    if (isContinuous) {
      results.push(startUnix);
    }
  }

  return results;
};