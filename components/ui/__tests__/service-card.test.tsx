import { fireEvent, render, screen } from '@testing-library/react-native';

import { ServiceCard } from '@/components/ui/service-card';

describe('ServiceCard', () => {
  it('shows the price and duration a customer is committing to', async () => {
    await render(<ServiceCard name="Corte" priceCents={5000} durationMinutes={45} />);
    expect(screen.getByText('R$ 50,00')).toBeTruthy();
    expect(screen.getByText('45 min')).toBeTruthy();
  });

  it('books through the CTA, labelled with the service so it is distinguishable', async () => {
    const onBook = jest.fn();
    await render(
      <ServiceCard name="Barba" priceCents={3000} durationMinutes={30} onBook={onBook} />
    );
    fireEvent.press(screen.getByLabelText('Agendar Barba'));
    expect(onBook).toHaveBeenCalledTimes(1);
  });

  it('renders no CTA when there is nothing to book', async () => {
    await render(<ServiceCard name="Barba" priceCents={3000} durationMinutes={30} />);
    expect(screen.queryByText('Agendar')).toBeNull();
  });
});
