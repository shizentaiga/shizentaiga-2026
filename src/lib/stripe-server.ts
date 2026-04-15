/**
 * @file stripe-server.ts
 * @description Stripe 決済セッションを作成するユーティリティ
 * [v5.4 構造的最適化：型推論パススルーモデル]
 */
import Stripe from 'stripe';

export const createStripeSession = async (
  apiKey: string,
  planName: string,
  price: number,
  successUrl: string,
  cancelUrl: string,
  metadata: Record<string, string>
) => {
  const stripe = new Stripe(apiKey);

  try {
    // 1. 外部依存（非ASCII文字）対策
    const safeSuccessUrl = new URL(successUrl).toString();
    const safeCancelUrl = new URL(cancelUrl).toString();

    // 2. 決済アイテムの情報を変数として独立（ネスト解消）
    // 型を直接指定せず、createメソッドに渡す際に型チェックを任せる
    const lineItem = {
      price_data: {
        currency: 'jpy',
        product_data: { 
          name: planName 
        },
        unit_amount: Math.floor(price),
      },
      quantity: 1,
    };

    // 3. セッション作成
    // 設定項目をフラットに並べることで、一目で内容が把握可能
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [lineItem],
      success_url: safeSuccessUrl,
      cancel_url: safeCancelUrl,
      metadata: metadata,
    });

    return session.url || '';
    
  } catch (error: any) {
    console.error('Stripe API Error Details:', error.message);
    throw error; 
  }
};