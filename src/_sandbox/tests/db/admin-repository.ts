/**
 * 【管理画面専用 データリポジトリ】
 * * ■ 責務
 * 管理画面（00_admin.tsx）が必要とするD1データベースへのアクセスを統合管理します。
 * 店舗、スタッフ、プランのマスタデータ操作、および予約状況の集計を担います。
 * * ■ 設計方針
 * 1. 依存性の最小化: D1Database にのみ依存し、ビジネスロジックは最小限に留めています。
 * 2. 設定の集約: ショップIDやタイムゾーン等の定数値は最上部の `ADMIN_REPO_CONFIG` で管理します。
 * 3. 破壊的変更の回避: プラン削除は `plan_status` を 'archived' に変更する「論理削除」を採用しています。
 * 4. 並び順（ソート）: プラン一覧は運用上の利便性のため `created_at ASC` (作成順) で取得します。
 * * ■ 改良・拡張時のガイド
 * ・店舗の切り替え機能を実装する場合、各関数の `targetShopId` 引数を利用してください。
 * ・表示順を変更したい場合は、`getAdminSettings` 内の SQL クエリの `ORDER BY` 句を修正してください。
 * ・物理削除が必要な場合は、`deletePlan` 関数を `DELETE` 文に書き換えてください（外部キー制約に注意）。
 * ・新しいマスタ（例：スタッフの出勤日等）を追加する場合は、型定義と `getAdminSettings` を拡張してください。
 */

import { D1Database } from '@cloudflare/workers-types';

// --- システム共通の固定値設定 ---
const ADMIN_REPO_CONFIG = {
  DEFAULT_SHOP_ID: 'shp_zenyu', // デフォルトのショップID
  PLAN_STATUS: {
    ACTIVE: 'active',
    ARCHIVED: 'archived'
  },
  TIMEZONE_OFFSET: '+9 hours'
};

// --- 型定義 ---

export interface Plan {
  plan_id: string;
  shop_id: string;
  plan_name: string;
  description?: string;
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

// --- 公開関数（取得系） ---

/**
 * 基本設定画面に必要な情報を取得
 */
export const getAdminSettings = async (
  db: D1Database, 
  targetShopId: string = ADMIN_REPO_CONFIG.DEFAULT_SHOP_ID
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

    // 4. その店舗に紐づくプラン一覧を取得 (archived以外、追加した順)
    const { results: plans } = await db.prepare(`
      SELECT plan_id, shop_id, plan_name, description, duration_min, buffer_min, price_amount, plan_status
      FROM plans 
      WHERE shop_id = ? AND plan_status != ? 
      ORDER BY created_at ASC
    `).bind(targetShopId, ADMIN_REPO_CONFIG.PLAN_STATUS.ARCHIVED).all<Plan>();

    // 現在時刻
    const { jst_now } = await db.prepare(
      `SELECT datetime('now', '${ADMIN_REPO_CONFIG.TIMEZONE_OFFSET}') as jst_now`
    ).first<any>();

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
  targetShopId: string = ADMIN_REPO_CONFIG.DEFAULT_SHOP_ID,
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
             time(s.start_at_unix, 'unixepoch', '${ADMIN_REPO_CONFIG.TIMEZONE_OFFSET}') as start_time_jst, 
             s.actual_duration_min + s.actual_buffer_min as total_min
      FROM slots s JOIN plans p ON s.plan_id = p.plan_id
      WHERE s.staff_id = ? AND s.booking_status = 'booked' 
      ORDER BY s.start_at_unix ASC
    `).bind(staffId).all<any>();

    // 2. スケジュールグリッド
    const { results: grids } = await db.prepare(`
      SELECT sch.date_string, sch.start_at_unix, sch.grid_size_min, 
             time(sch.start_at_unix, 'unixepoch', '${ADMIN_REPO_CONFIG.TIMEZONE_OFFSET}') as start_time_jst,
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

// --- 公開関数（更新系） ---

/**
 * プランの新規作成または更新 (Upsert)
 */
export const upsertPlan = async (
  db: D1Database,
  plan: Partial<Plan> & { shop_id: string }
): Promise<void> => {
  const now = Math.floor(Date.now() / 1000);
  // plan_id がなければ新規発行、あればそれを使用
  const id = plan.plan_id || `pln_${crypto.randomUUID().split('-')[0]}`;

  await db.prepare(`
    INSERT INTO plans (
      plan_id, shop_id, plan_name, description, 
      duration_min, buffer_min, price_amount, plan_status,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(plan_id) DO UPDATE SET
      plan_name = excluded.plan_name,
      description = excluded.description,
      duration_min = excluded.duration_min,
      buffer_min = excluded.buffer_min,
      price_amount = excluded.price_amount,
      plan_status = excluded.plan_status,
      updated_at = excluded.updated_at
  `).bind(
    id,
    plan.shop_id,
    plan.plan_name,
    plan.description || '',
    plan.duration_min,
    plan.buffer_min,
    plan.price_amount,
    plan.plan_status || ADMIN_REPO_CONFIG.PLAN_STATUS.ACTIVE,
    now,
    now
  ).run();
};

/**
 * プランの論理削除 (Archivedに更新)
 */
export const deletePlan = async (
  db: D1Database,
  planId: string
): Promise<void> => {
  const now = Math.floor(Date.now() / 1000);
  await db.prepare(`
    UPDATE plans 
    SET plan_status = ?, updated_at = ? 
    WHERE plan_id = ?
  `).bind(ADMIN_REPO_CONFIG.PLAN_STATUS.ARCHIVED, now, planId).run();
};