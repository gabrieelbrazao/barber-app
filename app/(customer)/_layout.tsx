import { Stack } from 'expo-router';

export default function CustomerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="barber/[id]" options={{ headerShown: true, title: '' }} />
      <Stack.Screen name="book/[serviceId]" options={{ headerShown: true, title: 'Book' }} />
    </Stack>
  );
}
