/**
 * @file /src/db/plan-db.ts
 * @description plans テーブル（マスターデータ）からプラン一覧を取得するデータアクセス層。
 * v3.2 スキーマ（Grid-Atomic Model）に準拠。
 * * [v3.2 移行フェーズ]
 * - 重複リスク回避のため、shop_id による抽出関数(getPlansByShopId)を追加。
 * - 既存の shop_name による抽出(getPlansFromDB)も互換性のために維持。
 * - index.tsx 等での型不一致エラーを防ぐため、ジェネリクスによる Bindings 解決を導入。
 */

import { Context } from 'hono'

/**
 * Cloudflare Workers 環境変数の基底型定義
 */
type Bindings = {
  shizentaiga_db: D1Database;
}

const MAX_PLAN_COUNT = 100;

/**
 * プランのデータ型定義
 */
export interface ServicePlan {
  plan_id: string;
  shop_id: string;
  plan_name: string;
  description: string | null;
  duration_min: number;
  buffer_min: number;
  price_amount: number;
  plan_status: 'draft' | 'active' | 'hidden' | 'inactive' | 'archived';
  created_at: number;
  updated_at: number;
  suffix?: string;
}

/**
 * ------------------------------------------------------------------
 * 1. 🆕 NEW FUNCTIONS (Shop ID Based)
 * ------------------------------------------------------------------
 */

/**
 * データベースから特定の「ショップID」に紐づく公開中のプラン一覧を取得する
 * <T extends Bindings> を使うことで、c.env の型を安全に保ちつつ呼び出し側の型定義を許容します。
 */
export const getPlansByShopId = async <T extends Bindings>(
  c: Context<{ Bindings: T }>,
  shop_id: string 
): Promise<ServicePlan[]> => {
  const db = c.env.shizentaiga_db;

  if (!shop_id) {
    console.error('[DB Error] shop_id is required.');
    return [];
  }

  if (!db) {
    console.warn('[DB Error] shizentaiga_db binding not found.');
    return [];
  }

  try {
    const query = `
      SELECT 
        plan_id, shop_id, plan_name, description, duration_min, 
        buffer_min, price_amount, plan_status, created_at, updated_at
      FROM plans 
      WHERE shop_id = ? AND plan_status = 'active' 
      ORDER BY created_at DESC LIMIT ?
    `;

    // db が D1Database であることが型推論されるため、ジェネリクスが使用可能になります
    const response = await db.prepare(query)
      .bind(shop_id, MAX_PLAN_COUNT)
      .all<ServicePlan>();

    return response.results || [];
  } catch (error) {
    console.error(`[DB Error] getPlansByShopId failed for shop_id: ${shop_id}`, error);
    return [];
  }
}

/**
 * 特定のショップIDとプランIDに一致するプランを1件取得する
 */
export const getPlanById = async <T extends Bindings>(
  c: Context<{ Bindings: T }>,
  shop_id: string,
  plan_id: string
): Promise<ServicePlan | null> => {
  const plans = await getPlansByShopId(c, shop_id);
  return plans.find(p => p.plan_id === plan_id) || null;
}


/**
 * ------------------------------------------------------------------
 * 2. 🏛️ LEGACY FUNCTIONS (Shop Name Based)
 * ------------------------------------------------------------------
 * 既存の Services.tsx 等の動作を担保するために維持します。
 */

export const getPlansFromDB = async (
  c: Context<{ Bindings: Bindings }>,
  shop_name: string 
): Promise<ServicePlan[]> => {
  const db = c.env.shizentaiga_db;

  if (!shop_name || !db) {
    if (!shop_name) console.error('[DB Error] shop_name is required.');
    return [];
  }

  try {
    const query = `
      SELECT 
        p.plan_id, p.shop_id, p.plan_name, p.description, 
        p.duration_min, p.buffer_min, p.price_amount, 
        p.plan_status, p.created_at, p.updated_at
      FROM plans p
      INNER JOIN shops s ON p.shop_id = s.shop_id
      WHERE s.shop_name = ? AND p.plan_status = 'active'
      ORDER BY p.created_at DESC LIMIT ?
    `;

    const response = await db.prepare(query)
      .bind(shop_name, MAX_PLAN_COUNT)
      .all<ServicePlan>();

    return response.results || [];
  } catch (error) {
    console.error(`[DB Legacy Error] Failed to fetch for shop: ${shop_name}`, error);
    return [];
  }
}