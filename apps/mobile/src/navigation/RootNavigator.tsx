import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { CustomerDetailScreen } from "../screens/CustomerDetailScreen";
import { CustomerFormScreen } from "../screens/CustomerFormScreen";
import { CustomerListScreen } from "../screens/CustomerListScreen";
import { OrderDetailScreen } from "../screens/OrderDetailScreen";
import { OrderFormScreen } from "../screens/OrderFormScreen";
import { OrderListScreen } from "../screens/OrderListScreen";

export type RootStackParamList = {
  CustomerList: undefined;
  CustomerDetail: { customerId: string };
  CustomerForm: { mode: "create" } | { mode: "edit"; customerId: string };
  OrderList: { customerId?: string } | undefined;
  OrderDetail: { orderId: string };
  OrderForm: { mode: "create"; customerId: string } | { mode: "edit"; orderId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="CustomerList">
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
