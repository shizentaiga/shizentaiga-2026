/**
 * @file /src/db/plan-db.ts
 * @description plans テーブル（マスターデータ）からプラン一覧を取得するデータアクセス層。
 * v3.0 スキーマ（Grid-Atomic Model）に準拠。
 * * ■ 主な利用箇所:
 * 1. Services.tsx : 予約ページの親コンポーネント。
 * 2. ServicePlanCard.tsx : 取得したプラン配列をループ処理。
 * * ■ 設計上の注意:
 * v3.0 より buffer_min (片付け時間) が追加されました。
 * UI上の総拘束時間は (duration_min + buffer_min) で計算する運用を推奨します。
 * 多店舗展開を見据え、shop_name による厳格なフィルタリングを必須としています。
 */

import { Context } from 'hono'

/**
 * Cloudflare Workers 環境変数の型定義
 */
type Bindings = {
  shizentaiga_db: D1Database
}

/**
 * 取得上限の設定
 * システム保護のため制限を維持します。
 */
const MAX_PLAN_COUNT = 100;

/**
 * プランのデータ型定義（Schema v3.0 準拠）
 * plan_status は DB の CHECK 制約に基づき厳密に定義します。
 */
export interface ServicePlan {
  plan_id: string;
  shop_id: string;              // 複数店舗展開を見据え追加
  plan_name: string;
  description: string | null;
  duration_min: number;         // 純粋な施術時間
  buffer_min: number;           // v3.0追加：前後の予備・清掃時間
  price_amount: number;
  /** * plan_status ライフサイクル:
   * draft:編集、active:公開、hidden:URL限定、inactive:停止、archived:廃止
   */
  plan_status: 'draft' | 'active' | 'hidden' | 'inactive' | 'archived';
  created_at: number;
  updated_at: number;
  suffix?: string;              // UI表示用の単位（"分" など、必要に応じて動的付与）
}

/**
 * データベースから公開中のプラン一覧を取得する
 * 【重要】指定された「ショップ名」に一致する店舗のプランのみを厳密に抽出します。
 * @param c - HonoのContext (Bindings を指定)
 * @param shop_name - フィルタリング対象の店舗名（例: "善幽"）
 * @returns 予約画面に表示可能なステータス（'active'）のプラン配列。
 */
export const getPlansFromDB = async (
  c: Context<{ Bindings: Bindings }>,
  shop_name: string 
): Promise<ServicePlan[]> => {
  const db = c.env.shizentaiga_db;

  // --- 1. バリデーション：ショップ名とDB接続の存在確認 ---
  
  // ショップ名が未指定の場合は、他店舗の情報流出を防ぐため即座に空配列を返す
  if (!shop_name) {
    console.error('[DB Error] shop_name is required to prevent cross-shop data leakage.');
    return [];
  }

  if (!db) {
    console.warn('[DB] Binding "shizentaiga_db" not found. Check wrangler.json.');
    return [];
  }

  try {
    /**
     * --- 2. クエリ実行：店舗名で結合し、公開中のプランを抽出 ---
     * v3.0 スキーマに基づき、plans(p) と shops(s) を INNER JOIN します。
     * 表示順は、管理者の意図を反映しやすいよう created_at DESC（新しい順）としています。
     */
    const query = `
      SELECT 
        p.plan_id, 
        p.shop_id,
        p.plan_name, 
        p.description, 
        p.duration_min, 
        p.buffer_min,
        p.price_amount, 
        p.plan_status,
        p.created_at,
        p.updated_at
      FROM plans p
      INNER JOIN shops s ON p.shop_id = s.shop_id
      WHERE s.shop_name = ? 
        AND p.plan_status = 'active'
      ORDER BY p.created_at DESC
      LIMIT ?
    `;

    // バインド引数として shop_name を第一引数に指定
    const response = await db.prepare(query)
      .bind(shop_name, MAX_PLAN_COUNT)
      .all<ServicePlan>();

    const results = response.results || [];

    console.log(`[DB] Successfully fetched ${results.length} active plans for shop: "${shop_name}".`);
    
    return results;

  } catch (error) {
    // --- 3. 例外処理とログ出力 ---
    console.error(`[DB Error] Failed to fetch plans for shop: ${shop_name}`, error);
    
    if (error instanceof Error) {
      console.error(`[Detail] ${error.message}`);
    }
    
    return [];
  }
}