import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { Icon } from '@/components/ui/icon';
import { useSession } from '@/contexts/session';
import { isOwner } from '@/lib/shop';
import { useShop } from '@/lib/queries';
import { useColors } from '@/hooks/use-colors';

export default function BarberTabsLayout() {
  const c = useColors();
  const { profile } = useSession();
  const { data: shop } = useShop();
  const owner = isOwner(profile, shop);

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
        name="brand"
        options={{
          title: 'Marca',
          // Only the shop owner sees/reaches the branding admin.
          href: owner ? undefined : null,
          tabBarIcon: ({ color, size }) => <Icon name="color-palette" color={color} size={size} />,
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
