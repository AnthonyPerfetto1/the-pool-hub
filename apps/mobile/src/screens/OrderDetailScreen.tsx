import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Order } from "@the-pool-hub/types";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { cancelOrder, completeOrder, getOrder } from "../api/orders";
import { ApiError } from "../lib/api-client";
import { formatCurrency, formatDateTime } from "../lib/format";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "OrderDetail">;

export function OrderDetailScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await getOrder(orderId);
      setOrder(result.order);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load order.");
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleComplete() {
    try {
      await completeOrder(orderId);
      load();
    } catch (err) {
      Alert.alert("Error", err instanceof ApiError ? err.message : "Failed to complete order.");
    }
  }

  function handleCancel() {
    Alert.alert("Cancel order?", "This order will be marked cancelled.", [
      { text: "No", style: "cancel" },
      {
        text: "Cancel Order",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelOrder(orderId);
            load();
          } catch (err) {
            Alert.alert(
              "Error",
              err instanceof ApiError ? err.message : "Failed to cancel order.",
            );
          }
        },
      },
    ]);
  }

  if (isLoading && !order) {
    return <ActivityIndicator style={styles.loading} />;
  }

  if (error || !order) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{error ?? "Order not found."}</Text>
      </View>
    );
  }

  const canEdit = order.status !== "cancelled";
  const canComplete = order.status === "scheduled";
  const canCancel = order.status === "scheduled";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.customerName}>{order.customer.name}</Text>
      <Text style={[styles.status, styles[`status_${order.status}`]]}>{order.status}</Text>

      <Text style={styles.field}>
        {order.orderType === "opening" ? "Opening" : "Closing"} — {formatCurrency(order.price)}
      </Text>
      <Text style={styles.field}>Scheduled: {formatDateTime(order.scheduledDate)}</Text>
      {order.completedDate ? (
        <Text style={styles.field}>Completed: {formatDateTime(order.completedDate)}</Text>
      ) : null}
      {order.notes ? <Text style={styles.field}>{order.notes}</Text> : null}

      <View style={styles.actions}>
        {canEdit ? (
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate("OrderForm", { mode: "edit", orderId })}
          >
            <Text style={styles.buttonText}>Edit</Text>
          </TouchableOpacity>
        ) : null}
        {canComplete ? (
          <TouchableOpacity
            style={[styles.button, styles.completeButton]}
            onPress={handleComplete}
          >
            <Text style={styles.buttonText}>Mark Completed</Text>
          </TouchableOpacity>
        ) : null}
        {canCancel ? (
          <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
            <Text style={styles.buttonText}>Cancel Order</Text>
          </TouchableOpacity>
        ) : null}
      </View>
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
  customerName: {
    fontSize: 22,
    fontWeight: "700",
  },
  status: {
    fontSize: 15,
    fontWeight: "600",
    textTransform: "capitalize",
    marginTop: 4,
    marginBottom: 16,
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
    marginTop: 24,
    gap: 12,
  },
  button: {
    backgroundColor: "#0a7ea4",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  completeButton: {
    backgroundColor: "#2e7d32",
  },
  cancelButton: {
    backgroundColor: "#c0392b",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
