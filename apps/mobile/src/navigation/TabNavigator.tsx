import type { CompositeScreenProps } from "@react-navigation/native";
import { createBottomTabNavigator, type BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text } from "react-native";
import { CustomerListScreen } from "../screens/CustomerListScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { FinancialScreen } from "../screens/FinancialScreen";
import { OrderListScreen } from "../screens/OrderListScreen";
import { ScheduleScreen } from "../screens/ScheduleScreen";
import type { RootStackParamList } from "./RootNavigator";

export type TabParamList = {
  Calendar: undefined;
  Customers: undefined;
  Home: undefined;
  Jobs: undefined;
  Financial: undefined;
};

// Screens hosted by the tab bar still need to navigate to screens that live
// on the parent root stack (OrderDetail, CustomerForm, etc.) — this composite
// type is what lets `navigation.navigate("OrderDetail", ...)` typecheck from
// inside a tab screen, matching React Navigation's own recommended pattern
// for nested navigators.
export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ fontSize: 22, color }}>{emoji}</Text>;
}

export function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{ tabBarActiveTintColor: "#0a7ea4", headerShown: false }}
    >
      <Tab.Screen
        name="Calendar"
        component={ScheduleScreen}
        options={{
          tabBarLabel: "Calendar",
          tabBarIcon: ({ color }) => <TabIcon emoji="📅" color={color} />,
        }}
      />
      <Tab.Screen
        name="Customers"
        component={CustomerListScreen}
        options={{
          tabBarLabel: "Customers",
          tabBarIcon: ({ color }) => <TabIcon emoji="👥" color={color} />,
        }}
      />
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} />,
        }}
      />
      <Tab.Screen
        name="Jobs"
        component={OrderListScreen}
        options={{
          tabBarLabel: "Jobs",
          tabBarIcon: ({ color }) => <TabIcon emoji="🧰" color={color} />,
        }}
      />
      <Tab.Screen
        name="Financial"
        component={FinancialScreen}
        options={{
          tabBarLabel: "Financial",
          tabBarIcon: ({ color }) => <TabIcon emoji="💰" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
