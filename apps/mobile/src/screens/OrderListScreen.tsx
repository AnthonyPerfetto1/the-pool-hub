import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Order, OrderStatus, OrderType } from "@the-pool-hub/types";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { listOrders } from "../api/orders";
import { ApiError } from "../lib/api-client";
import { formatCurrency, formatDateTime } from "../lib/format";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "OrderList">;

const STATUS_FILTERS: { label: string; value: OrderStatus | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Scheduled", value: "scheduled" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const TYPE_FILTERS: { label: string; value: OrderType | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Opening", value: "opening" },
  { label: "Closing", value: "closing" },
];

export function OrderListScreen({ route, navigation }: Props) {
  const customerId = route.params?.customerId;
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<OrderStatus | undefined>(undefined);
  const [orderType, setOrderType] = useState<OrderType | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filtersRef = useRef({ status, orderType });
  useEffect(() => {
    filtersRef.current = { status, orderType };
  }, [status, orderType]);

  const load = useCallback(async () => {
    try {
      const result = await listOrders({ customerId, ...filtersRef.current });
      setOrders(result.orders);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load orders.");
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    // Standard fetch-on-filter-change; a full data-fetching library is out of scope for this MVP.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    load();
  }, [load, status, orderType]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.label}
            style={[styles.chip, status === filter.value && styles.chipActive]}
            onPress={() => setStatus(filter.value)}
          >
            <Text style={[styles.chipText, status === filter.value && styles.chipTextActive]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.filterRow}>
        {TYPE_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter.label}
            style={[styles.chip, orderType === filter.value && styles.chipActive]}
            onPress={() => setOrderType(filter.value)}
          >
            <Text style={[styles.chipText, orderType === filter.value && styles.chipTextActive]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {isLoading && orders.length === 0 ? (
        <ActivityIndicator style={styles.loading} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} />}
          ListEmptyComponent={<Text style={styles.empty}>No orders found.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate("OrderDetail", { orderId: item.id })}
            >
              <Text style={styles.customerName}>{item.customer.name}</Text>
              <Text style={styles.secondary}>
                {item.orderType === "opening" ? "Opening" : "Closing"} ·{" "}
                {formatDateTime(item.scheduledDate)}
              </Text>
              <View style={styles.rowFooter}>
                <Text style={styles.price}>{formatCurrency(item.price)}</Text>
                <Text style={[styles.status, styles[`status_${item.status}`]]}>
                  {item.status}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#eee",
  },
  chipActive: {
    backgroundColor: "#0a7ea4",
  },
  chipText: {
    fontSize: 13,
    color: "#333",
  },
  chipTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  customerName: {
    fontSize: 17,
    fontWeight: "600",
  },
  secondary: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  rowFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  price: {
    fontSize: 15,
    fontWeight: "600",
  },
  status: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "capitalize",
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
  loading: {
    marginTop: 32,
  },
  empty: {
    textAlign: "center",
    marginTop: 32,
    color: "#666",
  },
  error: {
    color: "#c0392b",
    marginHorizontal: 12,
    marginTop: 8,
  },
});
