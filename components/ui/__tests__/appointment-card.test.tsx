import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { AppointmentCard } from '@/components/ui/appointment-card';

const START = '2026-06-30T14:00:00.000Z';

describe('AppointmentCard', () => {
  it('summarizes the booking in one accessible label', async () => {
    await render(
      <AppointmentCard
        serviceName="Corte"
        partyName="Marcus"
        startTime={START}
        status="confirmed"
      />
    );
    expect(screen.getByLabelText(/^Corte, Marcus, .+ às .+, Confirmado$/)).toBeTruthy();
  });

  it('keeps actions outside the summary so their buttons stay reachable', async () => {
    await render(
      <AppointmentCard
        serviceName="Corte"
        partyName="Marcus"
        startTime={START}
        status="pending"
        actions={<Text>Cancelar</Text>}
      />
    );
    expect(screen.getByText('Cancelar')).toBeTruthy();
    expect(screen.getByText('Pendente')).toBeTruthy();
  });
});
