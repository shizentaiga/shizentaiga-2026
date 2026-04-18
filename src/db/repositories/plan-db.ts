/**
 * @file /src/db/plan-db.ts
 * @description plans テーブル（マスターデータ）からプラン一覧を取得するデータアクセス層。
 * * 【基本仕様】
 * - v3.2 スキーマ（Grid-Atomic Model）に準拠。
 * - 表示順序: 運用上の利便性を考慮し、一律「作成日時の昇順（追加した順）」で取得します。
 * (古いプランを削除して作り直すことで、擬似的に表示順を調整可能な設計です)
 * * 【メンテナンス履歴】
 * - v3.2: shop_id による抽出関数(getPlansByShopId)を追加し、多店舗展開時の重複リスクを回避。
 * - v3.2: 既存の Services.tsx との互換性維持のため、shop_name による抽出も残存。
 * - v3.2: 型安全向上のため、ジェネリクスによる Bindings 解決を導入。
 */

import { Context } from 'hono'

/**
 * Cloudflare Workers 環境変数の基底型定義
 */
type Bindings = {
  shizentaiga_db: D1Database;
}

/** 1リクエストで取得するプランの最大件数 */
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
 * 1. 🆕 モダン関数 (ショップIDベース)
 * ------------------------------------------------------------------
 * 推奨される取得方法です。shop_id をキーに安全にプランを抽出します。
 */

/**
 * データベースから特定の「ショップID」に紐づく公開中のプラン一覧を取得する
 * [表示順] created_at ASC (追加した順)
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
      ORDER BY created_at ASC LIMIT ?
    `;

    // 実行時に ServicePlan 型として結果を受け取ります
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
 * 2. 🏛️ レガシー関数 (ショップ名ベース)
 * ------------------------------------------------------------------
 * 既存の Services.tsx 等の動作を担保するために維持しています。
 * 内部的には shops テーブルと JOIN して ID を特定し、プランを取得します。
 */

/**
 * ショップ名からプラン一覧を取得する
 * [表示順] p.created_at ASC (追加した順)
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
      ORDER BY p.created_at ASC LIMIT ?
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