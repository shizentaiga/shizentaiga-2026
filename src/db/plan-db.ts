/**
 * @file /src/db/plan-db.ts
 * @description plans テーブル（マスターデータ）からプラン一覧を取得するデータアクセス層。
 * v2.7 スキーマに準拠し、プレフィックス付きカラム名を取得します。
 * * ■ 主な利用箇所 (Dependent Components):
 * 1. Services.tsx : 予約ページの親コンポーネント。サーバーサイドで本関数を呼び出しデータを取得。
 * 2. ServicePlanCard.tsx : 取得したプラン配列をループ処理し、ユーザーにプラン選択UIを提供。
 * (本ファイルで定義された ServicePlan 型が、Card側の props 定義の基盤となります)
 * * ■ 設計上の注意:
 * UI表示に必要な「単位（分・月）」などはDBに持たないため、本関数での取得後に 
 * Business Logic 層または View 層で suffix を付与する運用としています。
 */

import { Context } from 'hono'

/**
 * 取得上限の設定
 * システム負荷軽減のため、一度に取得するプラン数を制限します。
 */
const MAX_PLAN_COUNT = 100;

/**
 * プランのデータ型定義（Schema v2.7 準拠）
 * UI表示に必要な suffix はオプショナルとして定義し、後続処理で補完可能にします。
 */
export interface ServicePlan {
  plan_id: string;
  plan_name: string;
  description: string | null;
  duration_min: number;
  price_amount: number;
  plan_status: 'active' | 'inactive';
  created_at: number;
  updated_at: number;
  suffix?: string; // UI表示用の単位（"分" など）
}

/**
 * データベースから公開中のプラン一覧を取得する
 * @param c - HonoのContext
 * @returns 公開中（'active'）のプラン配列。失敗時は空配列を返します。
 */
export const getPlansFromDB = async (c: Context): Promise<ServicePlan[]> => {
  try {
    const shizentaiga_db = c.env.shizentaiga_db;

    if (!shizentaiga_db) {
      console.warn('[DB] Binding "shizentaiga_db" not found. Check wrangler.json.');
      return [];
    }

    /**
     * クエリ実行：公開中のプランを新しい順に取得
     * LIMIT を MAX_PLAN_COUNT (100) に固定することで、
     * 予期せぬ大量データによるメモリ圧迫を物理的に防ぎます。
     */
    const response = await shizentaiga_db.prepare(
      `SELECT 
        plan_id, 
        plan_name, 
        description, 
        duration_min, 
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

    console.log(`[DB] Successfully fetched ${results.length} active plans.`);
    
    return results;

  } catch (error) {
    console.error('[DB Error] Failed to fetch plans:', error);
    return [];
  }
}