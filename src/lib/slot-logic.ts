/**
 * @file /src/lib/slot-logic.ts
 * @description 
 * 【グリッド・アトミック・ロジック】
 * 最小単位の「時間チップ（原子）」を連結し、プラン所要時間を満たす「予約枠（分子）」を合成します。
 * * ■ 判定の仕組み:
 * 1. 120分枠が必要なら、DBから取得した単位（grid_size_min）のチップが「必要枚数」「隙間なく」並んでいるかを確認する。
 * 2. 隙間の判定は、チップの開始秒(Unix)が「前回 + (grid_size_min * 60)秒」であるかで厳格に判定する。
 */

/**
 * 【補助関数】特定の開始地点から、必要枚数のチップが連続しているかを判定する（スキャン判定）
 * @param start_at_unix - 検証を開始するチップのUnixタイムスタンプ (staff_schedules.start_at_unix)
 * @param chips_needed - 連続して必要なチップの合計枚数
 * @param grid_step_sec - チップ1枚あたりの秒数（グリッド歩幅）
 * @param chip_set - 高速検索用のチップSet
 */
const isContinuousWindow = (
  start_at_unix: number,
  chips_needed: number,
  grid_step_sec: number,
  chip_set: Set<number>
): boolean => {
  // 1枚目は存在が確定しているため、2枚目（j=1）から最後の枚数分まで検証。
  // 期待される時刻にチップが存在するかを every メソッドで宣言的に判定。
  return Array.from({ length: chips_needed - 1 }, (_, index) => index + 1)
    .every(j => chip_set.has(start_at_unix + (grid_step_sec * j)));
};

/**
 * 連続するチップから予約可能な開始時間を算出する（純粋関数）
 * @param available_chips - 未予約チップのUnixタイムスタンプ配列 (staff_schedules.start_at_unix)
 * @param total_needed_min - 総拘束時間 (plans.duration_min + plans.buffer_min)
 * @param grid_size_min - 最小単位 (staff_schedules.grid_size_min)
 * @returns 予約開始候補のUnixタイムスタンプ配列
 */
export const calculatePossibleSlots = (
  available_chips: number[], 
  total_needed_min: number,
  grid_size_min: number
): number[] => {
  
  // --- [STEP 1] 入力値のバリデーションと正規化 ---
  
  // 1. ガード：データが空、または所要時間が0以下の場合は即座に終了
  if (available_chips.length === 0 || total_needed_min <= 0) return [];

  // 2. セーフティガード：15分未満の極小グリッドによる計算負荷増大を防止
  // schema.sql の DEFAULT 30 を尊重しつつ、最小15分を下回らないように丸める。
  const safe_grid_min = Math.round(Math.max(15, grid_size_min));
  
  // 3. 連続判定に使う秒数（例: 30分なら1800s）
  const grid_step_sec = safe_grid_min * 60;
  
  // 4. 必要チップ数の算出 (Math.ceil で安全側に倒して確保)
  const chips_needed = Math.ceil(total_needed_min / safe_grid_min);

  // 5. データのクレンジング (重複排除と昇順ソート)
  const unique_sorted_chips = Array.from(new Set(available_chips)).sort((a, b) => a - b);
  
  // 6. 存在確認を高速化(O(1))するためのインデックス化
  const chip_set = new Set(unique_sorted_chips);
  
  // --- [STEP 2] 連続性スキャン（宣言的抽出） ---

  // 全チップを「予約開始の候補地」とし、連続性を満たすものだけをフィルタリング
  return unique_sorted_chips.filter((start_at_unix, i) => {
    
    // A. 境界チェック：残りチップ数が「必要枚数」を下回る位置からは予約枠を作れない
    if (i > unique_sorted_chips.length - chips_needed) return false;

    // B. 連続性チェック：この開始地点から必要枚数分、隙間なくチップが並んでいるか
    return isContinuousWindow(start_at_unix, chips_needed, grid_step_sec, chip_set);
  });
};