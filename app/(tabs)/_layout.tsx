import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#10122d', borderTopColor: '#2a2e64', height: 92 },
        tabBarActiveTintColor: '#d685ff',
        tabBarInactiveTintColor: '#8589b5',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon color={color as string} icon="⌂" />,
        }}
      />
      <Tabs.Screen
        name="apps"
        options={{
          title: 'Apps',
          tabBarIcon: ({ color }) => <TabIcon color={color as string} icon="▦" />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }) => <TabIcon color={color as string} icon="▥" />,
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: 'Family',
          tabBarIcon: ({ color }) => <TabIcon color={color as string} icon="♧" />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabIcon color={color as string} icon="⚙" />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ color, icon }: { color: string; icon: string }) {
  return <Text style={{ color, fontSize: 22 }}>{icon}</Text>;
}
