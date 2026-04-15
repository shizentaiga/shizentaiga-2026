// src/lib/stripe-server.ts
import Stripe from 'stripe';

/**
 * Stripe 決済セッションを作成するユーティリティ
 * [v3.0 成功パターン準拠]
 * @param apiKey - Stripeの秘密鍵
 * @param planName - 決済画面に表示される商品名
 * @param price - 決済金額
 * @param successUrl - 決済完了後の戻り先URL（絶対パス）
 * @param cancelUrl - 決済中断時の戻り先URL（絶対パス）
 * @param metadata - 予約IDや日時など、後続処理に必要な識別子
 */
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
    /**
     * ⭐️ Non-ASCII 対策の内部処理
     * Stripe API は URL 内の全角文字を許容しないため、
     * ここで一括して安全な URL へ変換（エンコード）します。
     */
    const safeSuccessUrl = new URL(successUrl).toString();
    const safeCancelUrl = new URL(cancelUrl).toString();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: planName,
            },
            // ⭐️ 数値であることを保証（小数点以下の切り捨て）
            unit_amount: Math.floor(price),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: safeSuccessUrl,
      cancel_url: safeCancelUrl,
      metadata: metadata,
    });

    return session.url || '';
    
  } catch (error: any) {
    // 監査用：Stripe特有のエラー内容をログに記録
    console.error('Stripe API Error Details:', error.message);
    throw error; 
  }
};