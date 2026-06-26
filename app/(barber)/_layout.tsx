import { Stack } from 'expo-router';

export default function BarberLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="edit-service"
        options={{ headerShown: true, presentation: 'modal', title: 'Service' }}
      />
    </Stack>
  );
}
