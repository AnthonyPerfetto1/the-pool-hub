import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { Order } from "@the-pool-hub/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { listOrders } from "../api/orders";
import { ApiError } from "../lib/api-client";
import {
  formatMonthDay,
  formatWeekdayLong,
  getBusinessCalendarDateString,
  getBusinessDayBoundaries,
  getBusinessWeekRange,
} from "../lib/business-week";
import { formatCurrency, formatOrderTypeLabel, formatTimeOnly } from "../lib/format";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "Schedule">;

function DaySection({
  dayStart,
  isToday,
  jobs,
  onSelectOrder,
}: {
  dayStart: Date;
  isToday: boolean;
  jobs: Order[];
  onSelectOrder: (orderId: string) => void;
}) {
  return (
    <View style={styles.daySection}>
      <View style={styles.dayHeader}>
        <Text style={[styles.dayName, isToday && styles.dayNameToday]}>
          {formatWeekdayLong(dayStart)} · {formatMonthDay(dayStart)}
        </Text>
        {isToday ? <Text style={styles.todayBadge}>TODAY</Text> : null}
      </View>

      {jobs.length === 0 ? (
        <Text style={styles.noJobs}>No jobs scheduled</Text>
      ) : (
        <>
          <Text style={styles.jobCount}>
            {jobs.length} job{jobs.length === 1 ? "" : "s"}
          </Text>
          {jobs.map((order) => (
            <TouchableOpacity
              key={order.id}
              style={[styles.jobRow, order.status === "cancelled" && styles.jobRowCancelled]}
              onPress={() => onSelectOrder(order.id)}
            >
              <Text style={styles.jobTime}>{formatTimeOnly(order.scheduledDate)}</Text>
              <View style={styles.jobDetails}>
                <Text style={styles.jobCustomer}>{order.customer.name}</Text>
                <Text style={styles.jobType}>{formatOrderTypeLabel(order.orderType)}</Text>
              </View>
              <View style={styles.jobRight}>
                <Text style={styles.jobPrice}>{formatCurrency(order.price)}</Text>
                {order.status === "completed" ? (
                  <Text style={styles.statusCompleted}>Completed</Text>
                ) : null}
                {order.status === "cancelled" ? (
                  <Text style={styles.statusCancelled}>Cancelled</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}
    </View>
  );
}

export function ScheduleScreen({ navigation }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async (offset: number) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const range = getBusinessWeekRange(new Date(), offset);
      const result = await listOrders({
        scheduledFrom: range.start.toISOString(),
        scheduledTo: new Date(range.end.getTime() - 1).toISOString(),
        limit: 100,
      });
      if (requestIdRef.current !== requestId) return;
      setOrders(result.orders);
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setError(err instanceof ApiError ? err.message : "Failed to load schedule.");
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(weekOffset);
    }, [load, weekOffset]),
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate("OrderList", undefined)}>
            <Text style={styles.headerButton}>Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("CustomerList")}>
            <Text style={styles.headerButton}>+ New Job</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation]);

  const weekRange = useMemo(() => getBusinessWeekRange(new Date(), weekOffset), [weekOffset]);
  const dayBoundaries = useMemo(() => getBusinessDayBoundaries(weekRange.start), [weekRange]);
  const todayKey = getBusinessCalendarDateString(new Date());

  const ordersByDay = useMemo(() => {
    const buckets: Order[][] = Array.from({ length: 7 }, () => []);
    for (const order of orders) {
      const scheduled = new Date(order.scheduledDate);
      for (let i = 0; i < 7; i++) {
        if (scheduled >= dayBoundaries[i] && scheduled < dayBoundaries[i + 1]) {
          buckets[i].push(order);
          break;
        }
      }
    }
    return buckets;
  }, [orders, dayBoundaries]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => load(weekOffset)}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading && orders.length === 0) {
    return <ActivityIndicator style={styles.loading} />;
  }

  const totalJobs = orders.length;

  return (
    <View style={styles.container}>
      <View style={styles.weekHeader}>
        <TouchableOpacity
          style={styles.weekNavButton}
          onPress={() => setWeekOffset((current) => current - 1)}
        >
          <Text style={styles.weekNavText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.weekTitleContainer}>
          <Text style={styles.weekTitle}>
            {formatMonthDay(dayBoundaries[0])} – {formatMonthDay(dayBoundaries[6])}
          </Text>
          {weekOffset !== 0 ? (
            <TouchableOpacity onPress={() => setWeekOffset(0)}>
              <Text style={styles.todayLink}>Today</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.weekNavButton}
          onPress={() => setWeekOffset((current) => current + 1)}
        >
          <Text style={styles.weekNavText}>›</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? <ActivityIndicator style={styles.inlineLoading} size="small" /> : null}

      <ScrollView contentContainerStyle={styles.content}>
        {totalJobs === 0 ? (
          <View style={styles.emptyWeek}>
            <Text style={styles.emptyWeekText}>No jobs scheduled this week</Text>
          </View>
        ) : (
          Array.from({ length: 7 }, (_, index) => (
            <DaySection
              key={index}
              dayStart={dayBoundaries[index]}
              isToday={getBusinessCalendarDateString(dayBoundaries[index]) === todayKey}
              jobs={ordersByDay[index]}
              onSelectOrder={(orderId) => navigation.navigate("OrderDetail", { orderId })}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loading: {
    marginTop: 32,
  },
  inlineLoading: {
    marginTop: 4,
  },
  error: {
    color: "#c0392b",
    fontSize: 16,
    margin: 20,
  },
  retryButton: {
    backgroundColor: "#0a7ea4",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: "flex-start",
    marginHorizontal: 20,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  headerActions: {
    flexDirection: "row",
    gap: 16,
  },
  headerButton: {
    color: "#0a7ea4",
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: 4,
  },
  weekHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
  },
  weekNavButton: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  weekNavText: {
    fontSize: 24,
    color: "#0a7ea4",
    fontWeight: "600",
  },
  weekTitleContainer: {
    alignItems: "center",
  },
  weekTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111",
  },
  todayLink: {
    fontSize: 13,
    color: "#0a7ea4",
    fontWeight: "600",
    marginTop: 2,
  },
  daySection: {
    marginBottom: 24,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 6,
    marginBottom: 6,
  },
  dayName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    letterSpacing: 0.3,
  },
  dayNameToday: {
    color: "#0a7ea4",
  },
  todayBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    backgroundColor: "#0a7ea4",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: "hidden",
  },
  jobCount: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  noJobs: {
    fontSize: 14,
    color: "#999",
    paddingVertical: 4,
  },
  jobRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  jobRowCancelled: {
    opacity: 0.5,
  },
  jobTime: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
    width: 76,
  },
  jobDetails: {
    flex: 1,
  },
  jobCustomer: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
  jobType: {
    fontSize: 13,
    color: "#666",
    marginTop: 1,
  },
  jobRight: {
    alignItems: "flex-end",
  },
  jobPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },
  statusCompleted: {
    fontSize: 12,
    color: "#2e7d32",
    fontWeight: "600",
    marginTop: 2,
  },
  statusCancelled: {
    fontSize: 12,
    color: "#c0392b",
    fontWeight: "600",
    marginTop: 2,
  },
  emptyWeek: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyWeekText: {
    fontSize: 15,
    color: "#666",
  },
});
