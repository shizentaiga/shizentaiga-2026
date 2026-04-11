import { ulid } from 'ulid';

/**
 * [ID発行規約] shizentaiga_db v2.5 準拠
 * 形式: プレフィックス(3文字) + アンダースコア + ULID
 * * 【ULID採用の理由】
 * 1. 高い一意性: 衝突リスクを極限まで抑えたID生成が可能。
 * 2. 時系列ソート: ID自体が生成順に並ぶ性質を持ち、DBのインデックス効率と検索性能を最適化。
 * 3. 視認性の向上: 先頭にテーブル略称を付与することで、ログやDB単体でデータの出自を即座に特定可能。
 */

/**
 * 各テーブルに対応するプレフィックスの型定義
 */
export type IdPrefix = 
  | 'shp'  // shops (店舗)
  | 'stf'  // staffs (スタッフ)
  | 'pln'  // plans (プラン)
  | 'sch'  // staff_schedules (稼働枠)
  | 'slt'  // slots (予約枠)
  | 'evt'; // processed_events (決済ログ)

/**
 * テーブル識別子(prefix)を付与したULIDを生成する
 * * @example
 * const newSlotId = generateId('slt'); // "slt_01AN4Z07..."
 * * @param prefix テーブルごとのプレフィックス
 * @returns prefix_ULID 形式の文字列
 */
export const generateId = (prefix: IdPrefix): string => {
  return `${prefix}_${ulid()}`;
};

/**
 * IDが指定されたプレフィックスで始まっているか検証する
 * * @param id 検証対象のID文字列
 * @param expectedPrefix 期待されるプレフィックス
 * @returns 検証結果（boolean）
 */
export const isValidId = (id: string, expectedPrefix: IdPrefix): boolean => {
  return id.startsWith(`${expectedPrefix}_`);
};