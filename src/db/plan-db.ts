/**
 * @file /src/db/plan-db.ts
 * @description plans テーブル（マスターデータ）からプラン一覧を取得するデータアクセス層。
 * v3.0 スキーマ（Grid-Atomic Model）に準拠。
 * * ■ 主な利用箇所 (Dependent Components):
 * 1. Services.tsx : 予約ページの親コンポーネント。
 * 2. ServicePlanCard.tsx : 取得したプラン配列をループ処理。
 * * ■ 設計上の注意:
 * v3.0 より buffer_min (片付け時間) が追加されました。
 * UI上の総拘束時間は (duration_min + buffer_min) で計算する運用を推奨します。
 */

import { Context } from 'hono'

/**
 * 取得上限の設定
 * 100件を超えるプランが登録されることは稀ですが、システム保護のため制限を維持します。
 */
const MAX_PLAN_COUNT = 100;

/**
 * プランのデータ型定義（Schema v3.0 準拠）
 * plan_status は DB の CHECK 制約に基づき厳密に定義します。
 */
export interface ServicePlan {
  plan_id: string;
  shop_id: string;             // 複数店舗展開を見据え追加
  plan_name: string;
  description: string | null;
  duration_min: number;        // 純粋な施術時間
  buffer_min: number;          // v3.0追加：前後の予備・清掃時間
  price_amount: number;
  /** * plan_status ライフサイクル:
   * draft:編集、active:公開、hidden:URL限定、inactive:停止、archived:廃止
   */
  plan_status: 'draft' | 'active' | 'hidden' | 'inactive' | 'archived';
  created_at: number;
  updated_at: number;
  suffix?: string;             // UI表示用の単位（"分" など、必要に応じて動的付与）
}

/**
 * データベースから公開中のプラン一覧を取得する
 * @param c - HonoのContext
 * @returns 予約画面に表示可能なステータス（'active'）のプラン配列。
 */
export const getPlansFromDB = async (c: Context): Promise<ServicePlan[]> => {
  try {
    const shizentaiga_db = c.env.shizentaiga_db;

    if (!shizentaiga_db) {
      console.warn('[DB] Binding "shizentaiga_db" not found. Check wrangler.json.');
      return [];
    }

    /**
     * クエリ実行：公開中のプランを取得
     * v3.0 で追加された buffer_min を忘れずに SELECT 対象に含めます。
     * 表示順は、管理者の意図を反映しやすいよう created_at DESC（新しい順）としています。
     */
    const response = await shizentaiga_db.prepare(
      `SELECT 
        plan_id, 
        shop_id,
        plan_name, 
        description, 
        duration_min, 
        buffer_min,
        price_amount, 
        plan_status,
        created_at,
        updated_at
       FROM plans 
       WHERE plan_status = 'active'
       ORDER BY created_at DESC
       LIMIT ?`
    ).bind(MAX_PLAN_COUNT).all();

    const results = (response.results || []) as unknown as ServicePlan[];

    console.log(`[DB] Successfully fetched ${results.length} active plans. (v3.0 Grid-Ready)`);
    
    return results;

  } catch (error) {
    console.error('[DB Error] Failed to fetch plans from shizentaiga_db:', error);
    
    // エラー詳細が管理画面等で見えるよう、Error インスタンスならメッセージを出力
    if (error instanceof Error) {
      console.error(`[Detail] ${error.message}`);
    }
    
    return [];
  }
}