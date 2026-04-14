/**
 * @file Checkout.tsx
 * @description 最小構成の確認用ページ
 */
export const Checkout = ({ shopId, planId, date, slot }: { shopId: string; planId: string; date?: string; slot?: string }) => {
  return (
    <div style="padding: 20px;">
      <h1>Checkout Test</h1>
      <p>Shop: {shopId}</p>
      <p>Plan: {planId}</p>
      <p>Date: {date || 'N/A'}</p>
      <p>Slot: {slot || 'N/A'}</p>
      <hr />
      <a href="/services">Back</a>
    </div>
  )
}