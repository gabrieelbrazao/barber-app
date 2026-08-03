import { collectDeposit, createDepositIntent } from '@/lib/payments';

const mockInvoke = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } },
}));
jest.mock('expo-linking', () => ({ createURL: (p: string) => `barberapp://${p}` }));

function sheet(overrides: {
  init?: { error?: { code?: string; message: string } };
  present?: { error?: { code?: string; message: string } };
}) {
  return {
    initPaymentSheet: jest.fn().mockResolvedValue(overrides.init ?? {}),
    presentPaymentSheet: jest.fn().mockResolvedValue(overrides.present ?? {}),
  };
}

beforeEach(() => {
  mockInvoke.mockReset();
  mockInvoke.mockResolvedValue({ data: { clientSecret: 'pi_1_secret' }, error: null });
});

describe('createDepositIntent', () => {
  it('sends only the appointment id — the amount is computed server-side', async () => {
    await createDepositIntent('appt-1');
    expect(mockInvoke).toHaveBeenCalledWith('create-payment-intent', {
      body: { appointmentId: 'appt-1' },
    });
  });

  it('throws a user-facing error when the function returns no client secret', async () => {
    mockInvoke.mockResolvedValue({ data: {}, error: null });
    await expect(createDepositIntent('appt-1')).rejects.toThrow(
      'Não foi possível iniciar o pagamento do sinal.'
    );
  });
});

describe('collectDeposit', () => {
  it('reports paid when the sheet completes', async () => {
    const s = sheet({});
    await expect(collectDeposit(s, 'appt-1', 'The Sharp Edge')).resolves.toBe('paid');
    expect(s.initPaymentSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantDisplayName: 'The Sharp Edge',
        paymentIntentClientSecret: 'pi_1_secret',
      })
    );
  });

  it('reports cancelled (not an error) when the user dismisses the sheet', async () => {
    const s = sheet({ present: { error: { code: 'Canceled', message: 'canceled' } } });
    await expect(collectDeposit(s, 'appt-1', 'Shop')).resolves.toBe('cancelled');
  });

  it('throws when the payment itself fails', async () => {
    const s = sheet({ present: { error: { code: 'Failed', message: 'card declined' } } });
    await expect(collectDeposit(s, 'appt-1', 'Shop')).rejects.toThrow(
      'O pagamento do sinal não foi concluído.'
    );
  });

  it('never presents the sheet when initialization fails', async () => {
    const s = sheet({ init: { error: { message: 'bad key' } } });
    await expect(collectDeposit(s, 'appt-1', 'Shop')).rejects.toThrow(
      'Não foi possível abrir o pagamento do sinal.'
    );
    expect(s.presentPaymentSheet).not.toHaveBeenCalled();
  });
});
