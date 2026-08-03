/**
 * Deposit collection (Stripe PaymentSheet).
 *
 * The client never sets an amount: `create-payment-intent` recomputes the deposit
 * from the service row and the webhook is what flips `payment_status` to paid, so
 * a tampered client can at worst skip paying — never mark itself paid.
 */

import * as Linking from 'expo-linking';

import { AppError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

export type DepositOutcome = 'paid' | 'cancelled';

type PaymentSheet = {
  initPaymentSheet: (params: {
    merchantDisplayName: string;
    paymentIntentClientSecret: string;
    returnURL?: string;
  }) => Promise<{ error?: { code?: string; message: string } }>;
  presentPaymentSheet: () => Promise<{ error?: { code?: string; message: string } }>;
};

export async function createDepositIntent(appointmentId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-payment-intent', {
    body: { appointmentId },
  });
  if (error) throw error;
  const clientSecret = (data as { clientSecret?: string } | null)?.clientSecret;
  if (!clientSecret) throw new AppError('Não foi possível iniciar o pagamento do sinal.');
  return clientSecret;
}

/**
 * Opens the sheet for an appointment's deposit. Returns 'cancelled' when the user
 * dismisses it — the appointment stays booked with `payment_status = 'pending'`.
 */
export async function collectDeposit(
  sheet: PaymentSheet,
  appointmentId: string,
  merchantDisplayName: string
): Promise<DepositOutcome> {
  const clientSecret = await createDepositIntent(appointmentId);

  const init = await sheet.initPaymentSheet({
    merchantDisplayName,
    paymentIntentClientSecret: clientSecret,
    // Required so wallets/3DS redirects can hand control back to this build.
    returnURL: Linking.createURL('stripe-redirect'),
  });
  if (init.error) throw new AppError('Não foi possível abrir o pagamento do sinal.');

  const present = await sheet.presentPaymentSheet();
  if (present.error) {
    if (present.error.code === 'Canceled') return 'cancelled';
    throw new AppError('O pagamento do sinal não foi concluído.');
  }
  return 'paid';
}
