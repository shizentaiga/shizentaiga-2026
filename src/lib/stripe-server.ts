// src/lib/stripe-server.ts
import Stripe from 'stripe';

/**
 * Stripe 決済セッションを作成するユーティリティ
 * @param apiKey - Stripeの秘密鍵 (sk_test_...)
 * @param planName - 決済画面に表示される商品名
 * @param price - 決済金額（日本円は整数で指定）
 * @param successUrl - 決済完了後の戻り先URL
 * @param cancelUrl - 決済中断時の戻り先URL
 * @param metadata - システム内部で利用する紐付けデータ（slot_idなど）
 * @returns 決済ページのURL
 */
export const createStripeSession = async (
  apiKey: string,
  planName: string,
  price: number,
  successUrl: string,
  cancelUrl: string,
  metadata: Record<string, string>
) => {
  // Stripeインスタンスの初期化
  // 注：型エラー回避のため、apiVersionの明示的な指定は行わずデフォルト設定を使用します
  const stripe = new Stripe(apiKey);

  try {
    const session = await stripe.checkout.sessions.create({
      // 支払い方法（クレジットカード決済）
      payment_method_types: ['card'],
      
      // 購入商品の詳細設定
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: planName,
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      
      // 決済モード（payment: 単発決済 / subscription: サブスクリプション）
      mode: 'payment',
      
      success_url: successUrl,
      cancel_url: cancelUrl,
      
      /**
       * metadata（重要）
       * 決済完了後、Webhookを通じてシステム側に通知される識別子です。
       * これにより、どの予約枠（slot_id）が支払われたかを照合します。
       */
      metadata: metadata,
    });

    // 生成された決済用URLを返却
    return session.url || '';
    
  } catch (error) {
    // 監査用ログ：API通信失敗時に原因を特定しやすくします
    console.error('Stripe Session Creation Error:', error);
    throw error; // 呼び出し元でエラーハンドリングできるよう再送出します
  }
};