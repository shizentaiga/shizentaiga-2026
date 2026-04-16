/**
 * 【実戦：DB不具合切り分けノウハウ v3.0】
 * * 1. 物理排他の整合性チェック (reservation_grid)
 * - 原因：staff_schedules（30分枠）と slots（予約）の紐付けミス。
 * - 調査：`SELECT * FROM reservation_grid WHERE schedule_id = 'xxxx';`
 * 1つのスケジュール枠に対して複数のスロットが紐づこうとすると、
 * UNIQUE制約(schedule_id)により物理的にエラーを吐くのが正常な挙動。
 * * 2. 外部キー制約の罠 (PRAGMA foreign_keys)
 * - D1はデフォルトで外部キー制約が「OFF」の場合がある。
 * - 対策：接続時に `PRAGMA foreign_keys = ON;` を投げる。
 * これが効いていれば、shopsを消した際に紐づくstaffsも自動で消える(CASCADE)。
 * * 3. 期限切れ仮予約 (expires_at)
 * - `pending` 状態のまま放置されたレコードは、`expires_at < unix_now` で
 * 論理的に除外するか、バッチで削除する。
 * * --- 開発者用チートシート ---
 * # 物理スキーマの全テーブル一覧
 * npx wrangler d1 execute shizentaiga_db --local --command=".tables"
 * # 特定テーブルの完全なCREATE文を表示
 * npx wrangler d1 execute shizentaiga_db --local --command="SELECT sql FROM sqlite_master WHERE name='slots';"
 */


/**
 * @file 02_db_check.tsx
 * @description 
 * 多店舗・多プラン対応の「予約整合性デバッグモニター」
 * * 【主な機能】
 * 1. マスタデータ可視化：プランごとの設定（時間・金額）を表示
 * 2. 予約状況の表示：確定済みのスロットを一覧化
 * 3. 連続枠判定（中核）：提供された slot-logic を使い、各プランが
 * 「その時間から開始可能か」を動的にシミュレーションして表示。
 */

import { Hono } from 'hono';
import { html } from 'hono/html';
import { calculatePossibleSlots } from '../../lib/slot-logic';

// --- 型定義 ---
type Bindings = { shizentaiga_db: D1Database; }
type Plan = {
  plan_id: string;
  plan_name: string;
  duration_min: number;
  buffer_min: number;
  price_amount: number;
  plan_status: string;
};

export const test02 = new Hono<{ Bindings: Bindings }>();

// --- スタイル定義 (メンテナンス性を高めるため集約) ---
const styles = {
  body: "padding: 30px; font-family: sans-serif; background: #f4f7f6; max-width: 1200px; margin: auto; color: #2d3748; line-height: 1.5;",
  header: "background: #1a202c; color: white; padding: 25px; border-radius: 8px; margin-bottom: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center;",
  sectionTitle: "font-size: 0.9rem; color: #4a5568; border-left: 4px solid #4299e1; padding-left: 10px; margin: 40px 0 15px 0; text-transform: uppercase; letter-spacing: 0.05em;",
  cardGrid: "display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;",
  table: "width: 100%; border-collapse: collapse; background: white; font-size: 0.85rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05);",
  th: "padding: 12px; border: 1px solid #e2e8f0; background: #edf2f7; text-align: left;",
  td: "padding: 12px; border: 1px solid #e2e8f0;",
  badgeOk: "background:#c6f6d5; color:#22543d; padding:4px 10px; border-radius:20px; font-weight:bold; font-size: 0.7rem; white-space: nowrap;",
};

test02.get('/', async (c) => {
  if (!c.env.shizentaiga_db) return c.text("❌ D1 Database Connection Error", 500);

  try {
    // 1. 基本情報の取得 (店舗・担当者)
    const master = await c.env.shizentaiga_db.prepare(`
      SELECT sh.shop_id, sh.shop_name, st.staff_id, st.staff_display_name,
             datetime('now', '+9 hours') as jst_now
      FROM shops sh
      INNER JOIN staffs st ON sh.shop_id = st.shop_id
      WHERE sh.shop_id = 'shp_zenyu' LIMIT 1
    `).first<any>();

    if (!master) return c.html(html`<div style="padding:20px; color:red;">⚠️ 店舗(shp_zenyu)が見つかりません。</div>`);

    // 2. プランマスタの取得
    const { results: allPlans } = await c.env.shizentaiga_db.prepare(`
      SELECT * FROM plans WHERE shop_id = ? ORDER BY price_amount DESC
    `).bind(master.shop_id).all<Plan>();

    // 3. 確定済み予約(Slots)の取得
    const { results: bookedSlots } = await c.env.shizentaiga_db.prepare(`
      SELECT s.user_email, p.plan_name, s.date_string,
             time(s.start_at_unix, 'unixepoch', '+9 hours') as start_time_jst,
             s.actual_duration_min, s.actual_buffer_min
      FROM slots s
      JOIN plans p ON s.plan_id = p.plan_id
      WHERE s.staff_id = ? AND s.booking_status = 'booked'
      ORDER BY s.start_at_unix ASC
    `).bind(master.staff_id).all<any>();

    // 4. スケジュール枠(Grids)の取得
    const { results: grids } = await c.env.shizentaiga_db.prepare(`
      SELECT sch.date_string, sch.start_at_unix, sch.grid_size_min,
             time(sch.start_at_unix, 'unixepoch', '+9 hours') as start_time_jst,
             rg.slot_id, p.plan_name as occupied_plan_name
      FROM staff_schedules sch
      LEFT JOIN reservation_grid rg ON sch.schedule_id = rg.schedule_id
      LEFT JOIN slots s ON rg.slot_id = s.slot_id
      LEFT JOIN plans p ON s.plan_id = p.plan_id
      WHERE sch.staff_id = ?
      ORDER BY sch.date_string ASC, sch.start_at_unix ASC
    `).bind(master.staff_id).all<any>();

    // --- [Core Logic] プランごとの「連続空き枠」を事前計算 ---
    const availableUnixTimes = grids.filter(g => !g.slot_id).map(g => Number(g.start_at_unix));
    const gridSize = grids[0]?.grid_size_min || 30;

    // 表示ループ内で計算を繰り返さないよう、プランごとに予約可能開始時刻を Set化
    const planAvailabilities = allPlans
      .filter(p => p.duration_min > 0) // 0分プラン(特別枠)は除外
      .map(p => {
        const totalNeeded = p.duration_min + p.buffer_min;
        const possibleStarts = calculatePossibleSlots(availableUnixTimes, totalNeeded, gridSize);
        return { planName: p.plan_name, possibleSet: new Set(possibleStarts) };
      });

    return c.html(html`
      <body style="${styles.body}">
        
        <header style="${styles.header}">
          <div>
            <h1 style="margin: 0; font-size: 1.4rem; color: #63b3ed;">Master Integrity Monitor</h1>
            <p style="margin: 5px 0 0 0; color: #a0aec0;">${master.shop_name} / 担当: ${master.staff_display_name}</p>
          </div>
          <div style="text-align: right; font-family: monospace;">
            <small style="color: #a0aec0;">SERVER JST</small><br>${master.jst_now}
          </div>
        </header>

        <h3 style="${styles.sectionTitle}">1. Service Plan Master</h3>
        <div style="${styles.cardGrid}">
          ${allPlans.map(p => html`
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; border-top: 4px solid ${p.duration_min === 0 ? '#a0aec0' : '#4299e1'};">
              <div style="display: flex; justify-content: space-between;">
                <strong>${p.plan_name}</strong>
                <span style="font-size: 0.7rem; color: #a0aec0;">${p.plan_status}</span>
              </div>
              <div style="margin-top: 12px; font-size: 0.85rem; color: #4a5568;">
                ¥${p.price_amount.toLocaleString()} / ${p.duration_min}分 (+予備${p.buffer_min}分)
              </div>
              ${p.duration_min === 0 ? html`<div style="margin-top: 8px; font-size: 0.7rem; color: #ed8936;">※特別枠（判定対象外）</div>` : ''}
            </div>
          `)}
        </div>

        <h3 style="${styles.sectionTitle}; border-left-color: #f56565;">2. Active Reservations</h3>
        <table style="${styles.table}">
          <thead>
            <tr>
              <th style="${styles.th}">User / Plan</th>
              <th style="${styles.th}">Date / Time</th>
              <th style="${styles.th}">Constrain (Total)</th>
            </tr>
          </thead>
          <tbody>
            ${bookedSlots.length > 0 ? bookedSlots.map(s => html`
              <tr>
                <td style="${styles.td}">${s.user_email}<br><b>${s.plan_name}</b></td>
                <td style="${styles.td}">${s.date_string} <b>${s.start_time_jst}</b></td>
                <td style="${styles.td}">${s.actual_duration_min + s.actual_buffer_min} min</td>
              </tr>
            `) : html`<tr><td colspan="3" style="${styles.td}; text-align: center; color: #a0aec0;">予約なし</td></tr>`}
          </tbody>
        </table>

        <h3 style="${styles.sectionTitle}; border-left-color: #48bb78;">3. Availability Logic Grid</h3>
        <div style="background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
          <table style="${styles.table}">
            <thead style="position: sticky; top: 0; z-index: 10;">
              <tr>
                <th style="${styles.th}; width: 220px;">Time Slot</th>
                <th style="${styles.th}">Atomic Status</th>
                ${planAvailabilities.map(pa => html`<th style="${styles.th}; text-align: center;">${pa.planName}</th>`)}
              </tr>
            </thead>
            <tbody>
              ${grids.map(g => {
                const isOccupied = !!g.slot_id;
                return html`
                  <tr style="background: ${isOccupied ? '#fff5f5' : 'transparent'};">
                    <td style="${styles.td}">${g.date_string} <b>${g.start_time_jst}</b></td>
                    <td style="${styles.td}; text-align: center;">
                      <span style="color: ${isOccupied ? '#c53030' : '#2f855a'}; font-weight: bold;">
                        ${isOccupied ? `❌ [${g.occupied_plan_name}]` : '✅ VACANT'}
                      </span>
                    </td>
                    ${planAvailabilities.map(pa => {
                      const canStart = pa.possibleSet.has(Number(g.start_at_unix));
                      return html`
                        <td style="${styles.td}; text-align: center;">
                          ${canStart ? html`<span style="${styles.badgeOk}">STARTABLE</span>` : html`<span style="color:#cbd5e0;">-</span>`}
                        </td>
                      `;
                    })}
                  </tr>
                `;
              })}
            </tbody>
          </table>
        </div>

        <footer style="margin: 40px 0; text-align: center; color: #a0aec0; font-size: 0.75rem;">
          GRID-ATOMIC INTEGRITY MONITORING SYSTEM
        </footer>
      </body>
    `);
  } catch (e: any) {
    return c.json({ status: "❌ Error", message: e.message }, 500);
  }
});