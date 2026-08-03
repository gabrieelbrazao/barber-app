// Stripe webhook: flips an appointment to paid/refunded when Stripe confirms.
//
// Runs UNAUTHENTICATED but signature-gated — deploy with `--no-verify-jwt` and set:
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_WEBHOOK_SECRET=whsec_...
// In Deno the signature must be verified asynchronously (Web Crypto), so we use
// constructEventAsync with a SubtleCrypto provider.
import Stripe from 'npm:stripe';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  const sig = req.headers.get('Stripe-Signature');
  if (!sig) return new Response('Missing signature', { status: 400 });

  const body = await req.text(); // raw body required for verification
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      webhookSecret,
      undefined,
      cryptoProvider
    );
  } catch (e) {
    return new Response(`Webhook signature error: ${String(e)}`, { status: 400 });
  }

  const setStatus = async (intentId: string, status: 'paid' | 'refunded') => {
    await admin.from('appointments').update({ payment_status: status }).eq('payment_intent_id', intentId);
  };

  switch (event.type) {
    case 'payment_intent.succeeded':
      await setStatus((event.data.object as Stripe.PaymentIntent).id, 'paid');
      break;
    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      if (charge.payment_intent) await setStatus(String(charge.payment_intent), 'refunded');
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
