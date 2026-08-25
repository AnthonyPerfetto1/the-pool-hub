import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Order, Transaction } from "@the-pool-hub/types";
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
import { listTransactions } from "../api/transactions";
import { ApiError } from "../lib/api-client";
import { addCurrencyStrings, formatCurrency, formatDate, formatDateTime } from "../lib/format";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "OrderDetail">;

export function OrderDetailScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<Order | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [orderResult, transactionsResult] = await Promise.all([
        getOrder(orderId),
        listTransactions(orderId),
      ]);
      setOrder(orderResult.order);
      setTransactions(transactionsResult.transactions);
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
  const amountRemaining = order.amountRemaining ?? order.price;
  const canAddPayment = Number(amountRemaining) > 0;

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

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Payment Summary</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Order Total</Text>
        <Text style={styles.summaryValue}>{formatCurrency(order.price)}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Paid</Text>
        <Text style={styles.summaryValue}>{formatCurrency(order.totalPaid ?? "0.00")}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Remaining</Text>
        <Text style={styles.summaryValue}>{formatCurrency(amountRemaining)}</Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Payments</Text>
        {canAddPayment ? (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("PaymentForm", {
                target: { mode: "create", orderId, amountRemaining },
              })
            }
          >
            <Text style={styles.link}>+ Add Payment</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {transactions.length === 0 ? (
        <Text style={styles.field}>No payments yet.</Text>
      ) : (
        transactions.map((transaction) => (
          <TouchableOpacity
            key={transaction.id}
            style={styles.paymentRow}
            onPress={() =>
              navigation.navigate("PaymentForm", {
                target: {
                  mode: "edit",
                  transactionId: transaction.id,
                  amountRemaining: addCurrencyStrings(amountRemaining, transaction.amount),
                },
              })
            }
          >
            <Text style={styles.paymentDate}>{formatDate(transaction.transactionDate)}</Text>
            <Text style={styles.paymentAmount}>{formatCurrency(transaction.amount)}</Text>
            <Text style={styles.paymentMethod}>{transaction.paymentMethod}</Text>
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
  link: {
    fontSize: 16,
    color: "#0a7ea4",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 15,
    color: "#666",
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  paymentDate: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  paymentMethod: {
    fontSize: 13,
    color: "#666",
    textTransform: "capitalize",
    flex: 1,
    textAlign: "right",
  },
});
