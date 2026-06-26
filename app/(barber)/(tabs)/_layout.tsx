import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { Icon } from '@/components/ui/icon';
import { useColors } from '@/hooks/use-colors';

export default function BarberTabsLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.tabIconDefault,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, size }) => <Icon name="calendar" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Serviços',
          tabBarIcon: ({ color, size }) => <Icon name="pricetags" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <Icon name="person" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
