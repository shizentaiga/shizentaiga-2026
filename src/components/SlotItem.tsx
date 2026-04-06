/**
 * @component: SlotItem
 * @description: 予約可能日時の1行分の表示。デザイナーはこのファイル内のHTML/CSSを自由に編集可能です。
 * @props: 
 * - date: 日付（例: 2026/04/10）
 * - time: 時間（例: 10:00 - 11:00）
 * - status: 内部状態（'open' | 'full' | 'closed'）
 * - statusText: 表示ラベル（'受付中' | '満席' 等）
 */

import { html } from 'hono/html'

interface SlotItemProps {
  date: string;
  time: string;
  status: 'open' | 'full' | 'closed';
  statusText: string;
}

export const SlotItem = ({
  date,
  time,
  status,
  statusText
}: SlotItemProps) => {
  // 状態に応じたスタイル定義（デザイナーが調整しやすいよう変数化）
  const badgeStyle = status === 'open' 
    ? 'background: #1a1a1a; color: #fff;' // 通常（受付中）
    : 'background: #ccc; color: #666;';    // 満席・終了時

  return html`
    <li style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #eaeaea;">
      <span style="font-family: monospace; font-size: 1.05rem;">
        📅 ${date} <span style="margin-left: 10px; color: #888;">${time}</span>
      </span>
      <span style="font-size: 0.85rem; padding: 2px 8px; border-radius: 2px; ${badgeStyle}">
        ${statusText}
      </span>
    </li>
  `
}