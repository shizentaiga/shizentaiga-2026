import { Context } from 'hono';
import { html } from 'hono/html';
import { AdminReservationData } from '../../db/admin-repository';
import { calculatePossibleSlots } from '../../../../lib/slot-logic';

// --- スタイル定義 ---
const PAGE_STYLE = {
  headerContainer: "display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;",
  sectionCard: "background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);",
  sectionTitle: "font-size: 0.85rem; font-weight: 800; color: #64748b; margin-bottom: 1.5rem; text-transform: uppercase; letter-spacing: 0.1em; display: flex; align-items: center; gap: 8px;",
  badge: (bg: string, text: string) => `background:${bg}; color:${text}; padding:2px 8px; border-radius:4px; font-weight:bold; font-size: 10px; white-space: nowrap;`,
  sysClock: "text-align:right; font-family:ui-monospace,monospace; background:#f1f5f9; padding:10px 15px; border-radius:8px;",
  table: "width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.8rem;",
  th: "padding: 12px; border-bottom: 2px solid #f1f5f9; background: #f8fafc; text-align: left; position: sticky; top: 0; z-index: 10;",
  td: "padding: 10px 12px; border-bottom: 1px solid #f1f5f9;"
};

/**
 * 予約確認ページ（チップグリッド & アクティブ予約）
 */
export const renderReservations = async (c: Context, data: AdminReservationData | null) => {
  if (!data) return html`<div style="padding:20px; color:red;">⚠️ 予約データの読み込みに失敗しました。</div>`;

  // 選択中のスタッフ情報を特定
  const selectedStaff = data.staffs.find(s => s.staff_id === data.selectedStaffId);
  const { grids, bookedSlots, plans, nowUnix } = data;
  
  // 予約締切時間の計算（スタッフ設定値を使用）
  const leadTimeMin = selectedStaff?.min_lead_time_min || 0;
  const leadTimeSec = leadTimeMin * 60;

  // 判定ロジック：予約可能なUnixTimeの抽出
  const availableUnixTimes = grids
    .filter(g => !g.slot_id && (g.start_at_unix > nowUnix + leadTimeSec))
    .map(g => Number(g.start_at_unix));
  
  // 各プランごとの開始可能判定
  const planAvailabilities = plans
    .filter(p => p.duration_min > 0)
    .map(p => ({
      planName: p.plan_name,
      possibleSet: new Set(calculatePossibleSlots(availableUnixTimes, p.duration_min + p.buffer_min, grids[0]?.grid_size_min || 30))
    }));

  // 日付ごとにグリッドをグループ化
  const groupedGrids = grids.reduce((acc: any, g) => {
    (acc[g.date_string] = acc[g.date_string] || []).push(g);
    return acc;
  }, {});

  return html`
    <div style="${PAGE_STYLE.headerContainer}">
      <div>
        <h2 style="margin:0;">予約状況</h2>
        <p style="color: #64748b; font-size: 0.9rem;">
          <b>${selectedStaff?.staff_display_name || '未選択'}</b> のスケジュールを表示中
        </p>
      </div>
      <div style="${PAGE_STYLE.sysClock}">
        <small style="opacity:0.6; font-size:0.7rem;">SYSTEM JST</small><br>
        <span style="font-size:1rem; font-weight:bold;">${data.jstNow}</span>
      </div>
    </div>

    <section style="${PAGE_STYLE.sectionCard}">
      <h3 style="${PAGE_STYLE.sectionTitle}">🗓 確定済みの予約</h3>
      <table style="${PAGE_STYLE.table}">
        <thead>
          <tr>
            <th style="${PAGE_STYLE.th}">ユーザー / プラン</th>
            <th style="${PAGE_STYLE.th}">日時</th>
            <th style="${PAGE_STYLE.th}">合計時間</th>
          </tr>
        </thead>
        <tbody>
          ${bookedSlots.length > 0 ? bookedSlots.map(s => html`
            <tr>
              <td style="${PAGE_STYLE.td}"><small style="color:#64748b;">${s.user_email}</small><br><b>${s.plan_name}</b></td>
              <td style="${PAGE_STYLE.td}">${s.date_string}<br><b>${s.start_time_jst}</b></td>
              <td style="${PAGE_STYLE.td}">${s.total_min} min</td>
            </tr>
          `) : html`<tr><td colspan="3" style="${PAGE_STYLE.td}; text-align:center; color:#94a3b8; padding:2rem;">現在、確定した予約はありません。</td></tr>`}
        </tbody>
      </table>
    </section>

    <section style="${PAGE_STYLE.sectionCard}">
      <h3 style="${PAGE_STYLE.sectionTitle}">⚡️ 予約可能枠の判定（チップグリッド）</h3>
      <p style="font-size:0.75rem; color:#64748b; margin-bottom:1rem;">※締切設定: ${ (leadTimeMin / 60).toFixed(1) }時間前</p>

      ${Object.keys(groupedGrids).map(date => html`
        <details open style="margin-bottom:15px; border:1px solid #f1f5f9; border-radius:8px; overflow:hidden;">
          <summary style="padding:12px; background:#f8fafc; cursor:pointer; font-weight:bold; font-size:0.9rem; border-bottom:1px solid #f1f5f9;">
            📅 ${date}
          </summary>
          <table style="${PAGE_STYLE.table}">
            <thead>
              <tr>
                <th style="${PAGE_STYLE.th}; width:100px;">開始時刻</th>
                <th style="${PAGE_STYLE.th}; width:150px;">ステータス</th>
                ${planAvailabilities.map(pa => html`<th style="${PAGE_STYLE.th}; text-align:center;">${pa.planName}</th>`)}
              </tr>
            </thead>
            <tbody>
              ${groupedGrids[date].map((g: any) => {
                const isOccupied = !!g.slot_id;
                const isPassed = g.start_at_unix <= nowUnix;
                const isLeadTimeLimit = !isPassed && (g.start_at_unix <= nowUnix + leadTimeSec);
                
                let statusLabel = html`<span style="color:#10b981; font-weight:bold;">VACANT</span>`;
                let rowBg = "transparent";
                if (isOccupied) { 
                  statusLabel = html`<span style="color:#ef4444; font-weight:bold;">❌ [${g.occupied_plan_name}]</span>`; 
                  rowBg = "#fff1f2"; 
                } else if (isPassed) { 
                  statusLabel = html`<span style="color:#94a3b8;">PAST</span>`; 
                  rowBg = "#f8fafc"; 
                } else if (isLeadTimeLimit) { 
                  statusLabel = html`<span style="color:#f59e0b;">CLOSED(LT)</span>`; 
                  rowBg = "#fffbeb"; 
                }

                return html`
                  <tr style="background:${rowBg}">
                    <td style="${PAGE_STYLE.td}; font-family:monospace;"><b>${g.start_time_jst}</b></td>
                    <td style="${PAGE_STYLE.td}">${statusLabel}</td>
                    ${planAvailabilities.map(pa => html`
                      <td style="${PAGE_STYLE.td}; text-align:center;">
                        ${pa.possibleSet.has(Number(g.start_at_unix)) 
                          ? html`<span style="${PAGE_STYLE.badge('#3b82f6', 'white')}">STARTABLE</span>` 
                          : html`<span style="color:#cbd5e0;">-</span>`}
                      </td>
                    `)}
                  </tr>
                `;
              })}
            </tbody>
          </table>
        </details>
      `)}
    </section>
  `;
};