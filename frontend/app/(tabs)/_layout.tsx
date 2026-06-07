import { Tabs } from "expo-router";
import { Bluetooth, Layers, Radio, SlidersHorizontal } from "lucide-react-native";

import { colors, fonts } from "@/src/theme/colors";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.white,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.borderSubtle,
          borderTopWidth: 1,
          height: 88,
          paddingTop: 10,
          paddingBottom: 28,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.medium,
          fontSize: 11,
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="remote"
        options={{
          title: "Télécommande",
          tabBarIcon: ({ color }) => <Radio size={22} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="eq"
        options={{
          title: "Égaliseur",
          tabBarIcon: ({ color }) => (
            <SlidersHorizontal size={22} color={color} strokeWidth={1.8} />
          ),
        }}
      />
      <Tabs.Screen
        name="explorer"
        options={{
          title: "Explorateur",
          tabBarIcon: ({ color }) => <Bluetooth size={22} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Bibliothèque",
          tabBarIcon: ({ color }) => <Layers size={22} color={color} strokeWidth={1.8} />,
        }}
      />
    </Tabs>
  );
}
