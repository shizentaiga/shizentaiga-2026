/**
 * @file index.tsx
 * @description ルーティング定義。
 */

import { Hono } from 'hono'
import { renderer } from './renderer' 
import { handleStripeWebhook } from './api/webhook'

/* --- 🧱 PAGES --- */
import { Top } from './pages/Top'      
import { Legal } from './pages/Legal' 
import { ErrorPage } from './pages/Services/Error'
import { ContactPage } from './pages/Services/Contact'

/* --- ⚙️ SERVICE HANDLERS --- */
import { 
  ServicesPage, 
  handleSlotList, 
  renderCheckoutPage, 
  handleStripeSession, 
  renderSuccessPage 
} from './pages/Services/Services'

import sandboxBridge from './_sandbox/_bridge';

type Bindings = { shizentaiga_db: D1Database; STRIPE_SECRET_KEY: string; }

const app = new Hono<{ Bindings: Bindings }>({ strict: false }) // 末尾スラッシュ削除

/* --- ⚡️ API / WEBHOOK (最優先・レンダラー不要) --- */
app.post('/api/webhook/stripe', handleStripeWebhook);

/* --- 🛡️ MIDDLEWARE --- */
app.all('*', renderer)
app.route('/_debug', sandboxBridge); 

/* --- ROUTES --- */
app.get('/', (c) => c.render(<Top />));
app.get('/legal', (c) => c.render(<Legal />));
app.get('/contact', (c) => c.render(<ContactPage />));
app.get('/error', (c) => c.render(<ErrorPage />));

// Services Flow
app.get('/services', ServicesPage);
app.get('/services/slots', handleSlotList);
app.get('/services/checkout', renderCheckoutPage);
app.post('/services/checkout/session', handleStripeSession);
app.get('/services/success', renderSuccessPage);

export default app;