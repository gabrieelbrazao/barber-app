// Creates a Stripe PaymentIntent for an appointment's deposit.
//
// Security: the deposit amount is recomputed SERVER-SIDE from the service row — the
// client only sends the appointment id. The caller's JWT (RLS) proves they own the
// appointment; a service-role client then records the pending payment (clients can't
// write payment columns themselves — see migration 0005/0011).
//
// Requires the `STRIPE_SECRET_KEY` function secret:
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_...
import Stripe from 'npm:stripe';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization' }, 401);

    const { appointmentId } = await req.json();
    if (!appointmentId) return json({ error: 'appointmentId required' }, 400);

    // Caller-scoped client: RLS guarantees this appointment is theirs.
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: appt, error } = await userClient
      .from('appointments')
      .select('id, customer_id, services(deposit_cents)')
      .eq('id', appointmentId)
      .single();
    if (error || !appt) return json({ error: 'Appointment not found' }, 404);

    const deposit = (appt.services as { deposit_cents: number } | null)?.deposit_cents ?? 0;
    if (deposit <= 0) return json({ error: 'No deposit required' }, 400);

    const intent = await stripe.paymentIntents.create(
      { amount: deposit, currency: 'brl', metadata: { appointment_id: appointmentId } },
      { idempotencyKey: `appt_${appointmentId}` }
    );

    // Record the pending payment with the service-role key (bypasses RLS).
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    await admin
      .from('appointments')
      .update({ payment_status: 'pending', payment_intent_id: intent.id })
      .eq('id', appointmentId);

    return json({ clientSecret: intent.client_secret });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}
