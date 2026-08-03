import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import BookScreen from '@/app/(customer)/book/[serviceId]';

const mockReplace = jest.fn();
const mockBook = jest.fn();
const mockCollectDeposit = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => ({ serviceId: 'svc-1', barberId: 'barber-1' }),
}));

jest.mock('@/contexts/session', () => ({
  useSession: () => ({ profile: { id: 'cust-1' } }),
}));

jest.mock('@/lib/stripe', () => ({
  useStripe: () => ({ initPaymentSheet: jest.fn(), presentPaymentSheet: jest.fn() }),
}));

jest.mock('@/lib/notifications', () => ({ scheduleReminder: jest.fn().mockResolvedValue(null) }));
jest.mock('@/lib/haptics', () => ({ hapticSuccess: jest.fn(), hapticError: jest.fn() }));
jest.mock('@/lib/payments', () => ({
  collectDeposit: (...args: unknown[]) => mockCollectDeposit(...args),
}));
jest.mock('@/lib/config', () => ({
  SHOP_ID: 'shop-1',
  STRIPE_PUBLISHABLE_KEY: 'pk_test_123',
  DEPOSITS_ENABLED: true,
}));

const mockService = {
  id: 'svc-1',
  name: 'Corte',
  price_cents: 5000,
  duration_minutes: 30,
  deposit_cents: 2000,
};

// Open every weekday so the test doesn't depend on which day it runs.
const mockAllDay = ['00:00', '23:59'];
const mockWorkingHours = {
  sun: mockAllDay,
  mon: mockAllDay,
  tue: mockAllDay,
  wed: mockAllDay,
  thu: mockAllDay,
  fri: mockAllDay,
  sat: mockAllDay,
};

// Fixtures must be `mock*`-prefixed: jest hoists these factories above the
// module body, and only that prefix is allowed to be referenced from them.
jest.mock('@/lib/queries', () => ({
  useBarber: () => ({
    data: { id: 'barber-1', name: 'Marcus', workingHours: mockWorkingHours },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useServices: () => ({
    data: [mockService],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useDayAppointments: () => ({ data: [], isLoading: false }),
  useDayBlocks: () => ({ data: [] }),
  useBookAppointment: () => ({ mutateAsync: mockBook, isPending: false }),
  useJoinWaitlist: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useRedeemPromo: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockBook.mockResolvedValue('appt-1');
  mockCollectDeposit.mockResolvedValue('paid');
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('BookScreen', () => {
  it('shows the deposit the customer will be charged', async () => {
    await render(<BookScreen />);
    expect(screen.getByText('Sinal de R$ 20,00 para confirmar')).toBeTruthy();
  });

  it('cannot confirm before a slot is picked', async () => {
    await render(<BookScreen />);
    fireEvent.press(screen.getByText('Selecione um horário'));
    expect(mockBook).not.toHaveBeenCalled();
  });

  it('books first, then collects the deposit for the created appointment', async () => {
    await render(<BookScreen />);
    // Tomorrow, so every slot is in the future whatever time the suite runs.
    await fireEvent.press(screen.getByText('Amanhã'));
    await fireEvent.press(screen.getAllByText(/^\d{2}:\d{2}$/)[0]);
    await fireEvent.press(screen.getByText(/^Confirmar /));

    await waitFor(() => expect(mockBook).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(mockCollectDeposit).toHaveBeenCalledWith(
        expect.anything(),
        'appt-1',
        expect.any(String)
      )
    );
  });

  it('still confirms the booking when the deposit is dismissed', async () => {
    mockCollectDeposit.mockResolvedValue('cancelled');
    await render(<BookScreen />);
    await fireEvent.press(screen.getByText('Amanhã'));
    await fireEvent.press(screen.getAllByText(/^\d{2}:\d{2}$/)[0]);
    await fireEvent.press(screen.getByText(/^Confirmar /));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/appointments'));
  });
});
