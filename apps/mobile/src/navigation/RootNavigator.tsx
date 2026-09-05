import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CustomerDetailScreen } from "../screens/CustomerDetailScreen";
import { CustomerFormScreen } from "../screens/CustomerFormScreen";
import { CustomerListScreen } from "../screens/CustomerListScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { OrderDetailScreen } from "../screens/OrderDetailScreen";
import { OrderFormScreen } from "../screens/OrderFormScreen";
import { OrderListScreen } from "../screens/OrderListScreen";
import { PaymentFormScreen } from "../screens/PaymentFormScreen";
import { ScheduleScreen } from "../screens/ScheduleScreen";

export type RootStackParamList = {
  Dashboard: undefined;
  Schedule: undefined;
  CustomerList: undefined;
  CustomerDetail: { customerId: string };
  CustomerForm: { mode: "create" } | { mode: "edit"; customerId: string };
  OrderList: { customerId?: string } | undefined;
  OrderDetail: { orderId: string };
  OrderForm: { mode: "create"; customerId: string } | { mode: "edit"; orderId: string };
  PaymentForm: {
    target:
      | { mode: "create"; orderId: string; amountRemaining: string }
      | { mode: "edit"; transactionId: string; amountRemaining: string };
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Dashboard">
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ title: "Dashboard" }}
        />
        <Stack.Screen
          name="Schedule"
          component={ScheduleScreen}
          options={{ title: "Schedule" }}
        />
        <Stack.Screen
          name="CustomerList"
          component={CustomerListScreen}
          options={{ title: "Customers" }}
        />
        <Stack.Screen
          name="CustomerDetail"
          component={CustomerDetailScreen}
          options={{ title: "Customer" }}
        />
        <Stack.Screen
          name="CustomerForm"
          component={CustomerFormScreen}
          options={({ route }) => ({
            title: route.params.mode === "edit" ? "Edit Customer" : "Add Customer",
          })}
        />
        <Stack.Screen name="OrderList" component={OrderListScreen} options={{ title: "Orders" }} />
        <Stack.Screen
          name="OrderDetail"
          component={OrderDetailScreen}
          options={{ title: "Order" }}
        />
        <Stack.Screen
          name="OrderForm"
          component={OrderFormScreen}
          options={({ route }) => ({
            title: route.params.mode === "edit" ? "Edit Order" : "New Order",
          })}
        />
        <Stack.Screen
          name="PaymentForm"
          component={PaymentFormScreen}
          options={({ route }) => ({
            title: route.params.target.mode === "edit" ? "Edit Payment" : "Add Payment",
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
