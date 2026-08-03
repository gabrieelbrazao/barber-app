import { Stack } from 'expo-router';

export default function CustomerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="barber/[id]"
        options={{ headerShown: true, title: '', headerBackTitle: 'Voltar' }}
      />
      <Stack.Screen
        name="book/[serviceId]"
        options={{ headerShown: true, title: 'Agendar', headerBackTitle: 'Voltar' }}
      />
      <Stack.Screen
        name="reschedule/[appointmentId]"
        options={{ headerShown: true, title: 'Remarcar', headerBackTitle: 'Voltar' }}
      />
      <Stack.Screen
        name="review/[appointmentId]"
        options={{ headerShown: true, title: 'Avaliar', headerBackTitle: 'Voltar' }}
      />
    </Stack>
  );
}
