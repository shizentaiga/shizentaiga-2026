/**
 * 管理画面用 データリポジトリ
 * DB(D1)からのデータ取得・整形ロジックを集約します。
 */
import { D1Database } from '@cloudflare/workers-types';

// --- 型定義 ---

export interface AdminSettingsData {
  shopName: string;
  staffDisplayName: string;
  minLeadTimeMin: number;
  jstNow: string;
  plans: Plan[];
}

export interface Plan {
  plan_id: string;
  plan_name: string;
  duration_min: number;
  buffer_min: number;
  price_amount: number;
  plan_status: string;
}

/**
 * 基本設定画面に必要な情報を一括取得する
 */
export const getAdminSettings = async (db: D1Database): Promise<AdminSettingsData | null> => {
  try {
    // 1. 店舗・スタッフ・現在時刻の基本情報を取得
    const master = await db.prepare(`
      SELECT 
        sh.shop_name, 
        st.staff_display_name, 
        st.min_lead_time_min,
        datetime('now', '+9 hours') as jst_now,
        sh.shop_id
      FROM shops sh
      INNER JOIN staffs st ON sh.shop_id = st.shop_id
      WHERE sh.shop_id = 'shp_zenyu' 
      LIMIT 1
    `).first<any>();

    if (!master) return null;

    // 2. プラン一覧を取得
    const { results: plans } = await db.prepare(`
      SELECT plan_id, plan_name, duration_min, buffer_min, price_amount, plan_status
      FROM plans 
      WHERE shop_id = ? 
      ORDER BY price_amount DESC
    `).bind(master.shop_id).all<Plan>();

    return {
      shopName: master.shop_name,
      staffDisplayName: master.staff_display_name,
      minLeadTimeMin: master.min_lead_time_min,
      jstNow: master.jst_now,
      plans: plans || []
    };
  } catch (e) {
    console.error('DB Fetch Error in getAdminSettings:', e);
    throw e;
  }
};