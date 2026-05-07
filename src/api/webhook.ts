import { Stripe } from 'stripe';
import { confirmBooking } from '../db/repositories/booking-db';

export const handleStripeWebhook = async (c: any) => {
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);

  const signature = c.req.header('stripe-signature');
  const body = await c.req.text();
  let event: Stripe.Event;

  try {
    // 1. 署名検証
    event = stripe.webhooks.constructEvent(
      body,
      signature || '',
      c.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error(`[Webhook Error] Signature verification failed: ${err.message}`);
    return c.text(`Webhook Error: ${err.message}`, 400);
  }

  // 2. 決済完了イベントの処理
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;
    const email = session.customer_details?.email || '';
    const paymentIntentId = session.payment_intent as string;

    if (metadata && metadata.slot) {
      // DB更新実行
      const result = await confirmBooking(c, {
        plan_id: metadata.plan_id,
        date: metadata.date,
        slot: metadata.slot,
        email: email,
        payment_intent_id: paymentIntentId,
      });

      // 3. 成功時のみ Resend でメール送信
      if (result.success) {
        c.executionCtx.waitUntil(
          sendConfirmationEmail(c, email, metadata.date, metadata.plan_id)
        );
      }
    }
  }

  // 4. Stripeに対して 200 OK を速やかに返す
  return c.json({ received: true }, 200);
};

/**
 * Resend を使用した予約完了メール送信
 */
async function sendConfirmationEmail(c: any, to: string, date: string, planName: string) {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${c.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'contact@shizentaiga.com',
        to: [to],
        subject: '【善幽】ご予約確定のお知らせ',
        html: `<p>ご予約が確定いたしました。</p>
               <p>日時：${date}</p>
               <p>プラン：${planName}</p>
               <p>Google Meet等のURLは別途ご連絡いたします。</p>
               <p>清善 泰賀</p>`,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('[Resend Error]', error);
    }
  } catch (e) {
    console.error('[Resend Exception]', e);
  }
}