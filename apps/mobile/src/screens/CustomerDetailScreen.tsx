import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Customer, Order } from "@the-pool-hub/types";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { archiveCustomer, getCustomer } from "../api/customers";
import { listOrders } from "../api/orders";
import { ApiError } from "../lib/api-client";
import { formatCurrency, formatDateTime } from "../lib/format";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "CustomerDetail">;

function formatAddress(customer: Customer): string | null {
  const cityState = [customer.city, customer.state].filter(Boolean).join(", ");
  const lines = [customer.street, [cityState, customer.zip].filter(Boolean).join(" ")].filter(
    Boolean,
  );
  return lines.length > 0 ? lines.join("\n") : null;
}

export function CustomerDetailScreen({ route, navigation }: Props) {
  const { customerId } = route.params;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [customerResult, ordersResult] = await Promise.all([
        getCustomer(customerId),
        listOrders({ customerId }),
      ]);
      setCustomer(customerResult.customer);
      setOrders(ordersResult.orders);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load customer.");
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function handleArchive() {
    Alert.alert(
      "Archive customer?",
      "This will remove them from your active customer list. Their history is kept.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            try {
              await archiveCustomer(customerId);
              navigation.goBack();
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof ApiError ? err.message : "Failed to archive customer.",
              );
            }
          },
        },
      ],
    );
  }

  if (isLoading && !customer) {
    return <ActivityIndicator style={styles.loading} />;
  }

  if (error || !customer) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{error ?? "Customer not found."}</Text>
      </View>
    );
  }

  const address = formatAddress(customer);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.name}>{customer.name}</Text>

      {customer.phone ? (
        <TouchableOpacity onPress={() => Linking.openURL(`tel:${customer.phone}`)}>
          <Text style={styles.link}>{customer.phone}</Text>
        </TouchableOpacity>
      ) : null}

      {customer.email ? (
        <TouchableOpacity onPress={() => Linking.openURL(`mailto:${customer.email}`)}>
          <Text style={styles.link}>{customer.email}</Text>
        </TouchableOpacity>
      ) : null}

      {address ? <Text style={styles.field}>{address}</Text> : null}
      {customer.poolSize ? (
        <Text style={styles.field}>Pool size: {customer.poolSize}</Text>
      ) : null}
      {customer.notes ? <Text style={styles.field}>{customer.notes}</Text> : null}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("CustomerForm", { mode: "edit", customerId })}
        >
          <Text style={styles.buttonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.archiveButton]}
          onPress={handleArchive}
        >
          <Text style={styles.buttonText}>Archive</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Orders</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("OrderForm", { mode: "create", customerId })}
        >
          <Text style={styles.link}>+ New Order</Text>
        </TouchableOpacity>
      </View>

      {orders.length === 0 ? (
        <Text style={styles.field}>No orders yet.</Text>
      ) : (
        orders.map((order) => (
          <TouchableOpacity
            key={order.id}
            style={styles.orderRow}
            onPress={() => navigation.navigate("OrderDetail", { orderId: order.id })}
          >
            <Text style={styles.orderType}>
              {order.orderType === "opening" ? "Opening" : "Closing"} —{" "}
              {formatCurrency(order.price)}
            </Text>
            <Text style={styles.orderSecondary}>{formatDateTime(order.scheduledDate)}</Text>
            <Text style={[styles.orderStatus, styles[`status_${order.status}`]]}>
              {order.status}
            </Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 20,
  },
  loading: {
    marginTop: 32,
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
  },
  link: {
    fontSize: 16,
    color: "#0a7ea4",
    marginBottom: 8,
  },
  field: {
    fontSize: 16,
    color: "#333",
    marginBottom: 8,
  },
  error: {
    color: "#c0392b",
    padding: 20,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    backgroundColor: "#0a7ea4",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  archiveButton: {
    backgroundColor: "#c0392b",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 32,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  orderRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  orderType: {
    fontSize: 15,
    fontWeight: "600",
  },
  orderSecondary: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  orderStatus: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "capitalize",
    marginTop: 2,
  },
  status_scheduled: {
    color: "#0a7ea4",
  },
  status_completed: {
    color: "#2e7d32",
  },
  status_cancelled: {
    color: "#999",
  },
});
