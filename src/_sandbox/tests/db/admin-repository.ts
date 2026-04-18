/**
 * 管理画面用 データリポジトリ
 * 複数店舗・複数スタッフ対応版
 */
import { D1Database } from '@cloudflare/workers-types';

// --- 型定義 ---

export interface Plan {
  plan_id: string;
  plan_name: string;
  duration_min: number;
  buffer_min: number;
  price_amount: number;
  plan_status: string;
}

export interface Shop {
  shop_id: string;
  shop_name: string;
}

export interface Staff {
  staff_id: string;
  staff_display_name: string;
  min_lead_time_min: number;
}

/** 基本設定用データ構造 */
export interface AdminSettingsData {
  shops: Shop[];            // 全店舗リスト
  staffs: Staff[];          // 選択店舗に属する全スタッフリスト
  plans: Plan[];            // 選択店舗に紐づくプランリスト
  selectedShopId: string;
  selectedStaffId: string;
  jstNow: string;
}

/** 予約確認（チップグリッド）用データ構造 */
export interface AdminReservationData extends AdminSettingsData {
  nowUnix: number;
  bookedSlots: any[];
  grids: any[];
}

// --- 公開関数 ---

/**
 * 基本設定画面に必要な情報を取得
 * 将来的には引数で shopId, staffId を受け取れるように設計
 */
export const getAdminSettings = async (
  db: D1Database, 
  targetShopId: string = 'shp_zenyu'
): Promise<AdminSettingsData | null> => {
  try {
    // 1. 全店舗リストを取得（セレクトボックス用）
    const { results: allShops } = await db.prepare(`SELECT shop_id, shop_name FROM shops`).all<Shop>();
    
    // 2. 選択された店舗が存在するか確認
    const selectedShop = allShops.find(s => s.shop_id === targetShopId);
    if (!selectedShop) return null;

    // 3. その店舗に所属する全スタッフを取得
    const { results: staffs } = await db.prepare(`
      SELECT staff_id, staff_display_name, min_lead_time_min 
      FROM staffs WHERE shop_id = ?
    `).bind(targetShopId).all<Staff>();

    // 4. その店舗に紐づくプラン一覧を取得
    const { results: plans } = await db.prepare(`
      SELECT plan_id, plan_name, duration_min, buffer_min, price_amount, plan_status
      FROM plans WHERE shop_id = ? ORDER BY price_amount DESC
    `).bind(targetShopId).all<Plan>();

    // 現在時刻
    const { jst_now } = await db.prepare("SELECT datetime('now', '+9 hours') as jst_now").first<any>();

    return {
      shops: allShops || [],
      staffs: staffs || [],
      plans: plans || [],
      selectedShopId: targetShopId,
      selectedStaffId: staffs[0]?.staff_id || '', // デフォルトで一人目のスタッフ
      jstNow: jst_now
    };
  } catch (e) {
    console.error('DB Fetch Error in getAdminSettings:', e);
    throw e;
  }
};

/**
 * 予約確認（チップグリッド）に必要な情報を取得
 */
export const getAdminReservations = async (
  db: D1Database, 
  targetShopId: string = 'shp_zenyu',
  targetStaffId?: string
): Promise<AdminReservationData | null> => {
  try {
    const settings = await getAdminSettings(db, targetShopId);
    if (!settings) return null;

    // スタッフが指定されていない場合は一人目を選択
    const staffId = targetStaffId || settings.selectedStaffId;

    // 1. 予約済みスロット
    const { results: bookedSlots } = await db.prepare(`
      SELECT s.user_email, p.plan_name, s.date_string, 
             time(s.start_at_unix, 'unixepoch', '+9 hours') as start_time_jst, 
             s.actual_duration_min + s.actual_buffer_min as total_min
      FROM slots s JOIN plans p ON s.plan_id = p.plan_id
      WHERE s.staff_id = ? AND s.booking_status = 'booked' 
      ORDER BY s.start_at_unix ASC
    `).bind(staffId).all<any>();

    // 2. スケジュールグリッド
    const { results: grids } = await db.prepare(`
      SELECT sch.date_string, sch.start_at_unix, sch.grid_size_min, 
             time(sch.start_at_unix, 'unixepoch', '+9 hours') as start_time_jst,
             rg.slot_id, p.plan_name as occupied_plan_name
      FROM staff_schedules sch
      LEFT JOIN reservation_grid rg ON sch.schedule_id = rg.schedule_id
      LEFT JOIN slots s ON rg.slot_id = s.slot_id
      LEFT JOIN plans p ON s.plan_id = p.plan_id
      WHERE sch.staff_id = ? ORDER BY sch.date_string ASC, sch.start_at_unix ASC
    `).bind(staffId).all<any>();

    // 3. Unix現在時刻
    const { now_unix } = await db.prepare("SELECT strftime('%s', 'now') as now_unix").first<any>();

    return {
      ...settings,
      selectedStaffId: staffId,
      nowUnix: Number(now_unix),
      bookedSlots: bookedSlots || [],
      grids: grids || []
    };
  } catch (e) {
    console.error('DB Fetch Error in getAdminReservations:', e);
    throw e;
  }
};