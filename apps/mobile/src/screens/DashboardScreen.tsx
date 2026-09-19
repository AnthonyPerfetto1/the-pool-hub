import { useFocusEffect } from "@react-navigation/native";
import type { Dashboard, Order } from "@the-pool-hub/types";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getDashboard } from "../api/dashboard";
import { getProfile } from "../api/profile";
import { useAuth } from "../auth/AuthContext";
import { TabHeader } from "../components/TabHeader";
import { ApiError } from "../lib/api-client";
import {
  formatAppointmentWhen,
  formatCurrency,
  formatOrderTypeLabel,
  isToday,
} from "../lib/format";
import type { TabScreenProps } from "../navigation/TabNavigator";

type Props = TabScreenProps<"Home">;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function PrimaryAppointmentCard({ order, onPress }: { order: Order; onPress: () => void }) {
  const amountRemaining = order.amountRemaining ?? null;
  return (
    <TouchableOpacity style={styles.primaryCard} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.eyebrow}>NEXT APPOINTMENT</Text>
      <Text style={styles.primaryWhen}>{formatAppointmentWhen(order.scheduledDate)}</Text>
      <Text style={styles.primaryCustomer}>{order.customer.name}</Text>
      <Text style={styles.primaryType}>{formatOrderTypeLabel(order.orderType)}</Text>
      <Text style={styles.primaryMoney}>
        {formatCurrency(order.price)}
        {amountRemaining === null
          ? ""
          : amountRemaining === "0.00"
            ? " · Paid in full"
            : ` · ${formatCurrency(amountRemaining)} remaining`}
      </Text>
      {order.customerAddress ? <Text style={styles.primaryAddress}>{order.customerAddress}</Text> : null}
    </TouchableOpacity>
  );
}

function UpcomingStack({
  upcoming,
  expanded,
  onToggle,
  onSelect,
}: {
  upcoming: Order[];
  expanded: boolean;
  onToggle: () => void;
  onSelect: (orderId: string) => void;
}) {
  if (upcoming.length === 0) {
    return null;
  }

  if (!expanded) {
    const peeks = upcoming.slice(0, 2);
    return (
      <TouchableOpacity style={styles.stackWrapper} onPress={onToggle} activeOpacity={0.8}>
        {peeks.map((order, index) => {
          const today = isToday(order.scheduledDate);
          return (
            <View
              key={order.id}
              style={[
                styles.peekCard,
                today && styles.peekCardToday,
                { marginHorizontal: (index + 1) * 12, marginTop: index === 0 ? -12 : -10 },
              ]}
            >
              <Text style={[styles.peekText, today && styles.peekTextToday]} numberOfLines={1}>
                {formatAppointmentWhen(order.scheduledDate)} · {order.customer.name}
              </Text>
            </View>
          );
        })}
        <Text style={styles.stackLabel}>
          {upcoming.length} more appointment{upcoming.length === 1 ? "" : "s"}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.expandedStack}>
      <Text style={styles.sectionTitle}>Upcoming</Text>
      {upcoming.map((order) => {
        const today = isToday(order.scheduledDate);
        return (
          <TouchableOpacity
            key={order.id}
            style={styles.upcomingRow}
            onPress={() => onSelect(order.id)}
          >
            <View style={styles.upcomingWhenRow}>
              <Text style={[styles.upcomingWhen, today && styles.upcomingWhenToday]}>
                {formatAppointmentWhen(order.scheduledDate)}
              </Text>
              {today ? <Text style={styles.todayBadge}>TODAY</Text> : null}
            </View>
            <Text style={styles.upcomingCustomer}>{order.customer.name}</Text>
            <Text style={styles.upcomingType}>{formatOrderTypeLabel(order.orderType)}</Text>
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity style={styles.collapseButton} onPress={onToggle}>
        <Text style={styles.collapseText}>Hide upcoming appointments</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyAppointmentsCard({ onScheduleJob }: { onScheduleJob: () => void }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.eyebrow}>NO UPCOMING APPOINTMENTS</Text>
      <Text style={styles.emptyText}>You&rsquo;re all caught up.</Text>
      <TouchableOpacity style={styles.scheduleButton} onPress={onScheduleJob}>
        <Text style={styles.scheduleButtonText}>Schedule a Job</Text>
      </TouchableOpacity>
    </View>
  );
}

function FinancialSnapshot({ dashboard }: { dashboard: Dashboard }) {
  return (
    <View style={styles.financialSection}>
      <Text style={styles.sectionTitle}>This Week</Text>
      <View style={styles.financialRow}>
        <Text style={styles.financialLabel}>Made</Text>
        <Text style={styles.financialValue}>{formatCurrency(dashboard.week.madeRevenue)}</Text>
      </View>
      <View style={styles.financialRow}>
        <Text style={styles.financialLabel}>Expected</Text>
        <Text style={styles.financialValue}>{formatCurrency(dashboard.week.expectedRevenue)}</Text>
      </View>

      <Text style={[styles.sectionTitle, styles.monthTitle]}>This Month</Text>
      <View style={styles.financialRow}>
        <Text style={styles.financialLabel}>Made</Text>
        <Text style={styles.financialValue}>{formatCurrency(dashboard.month.madeRevenue)}</Text>
      </View>
      <View style={styles.financialRow}>
        <Text style={styles.financialLabel}>Expected</Text>
        <Text style={styles.financialValue}>
          {formatCurrency(dashboard.month.expectedRevenue)}
        </Text>
      </View>
    </View>
  );
}

export function DashboardScreen({ navigation }: Props) {
  const { signOut } = useAuth();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [greetingName, setGreetingName] = useState<string | null>(null);
  const [isUpcomingExpanded, setIsUpcomingExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [dashboardResult, profileResult] = await Promise.allSettled([
        getDashboard(),
        getProfile(),
      ]);

      if (dashboardResult.status === "rejected") {
        throw dashboardResult.reason;
      }

      if (profileResult.status === "fulfilled") {
        setGreetingName(profileResult.value.profile.name || null);
      }

      setDashboard(dashboardResult.value.dashboard);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const header = (
    <TabHeader title="Dashboard">
      <TouchableOpacity onPress={() => signOut()}>
        <Text style={styles.headerButton}>Log Out</Text>
      </TouchableOpacity>
    </TabHeader>
  );

  if (isLoading && !dashboard) {
    return (
      <View style={styles.container}>
        {header}
        <ActivityIndicator style={styles.loading} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        {header}
        <Text style={styles.error}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={load}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!dashboard) {
    return null;
  }

  const { nextAppointment, upcomingAppointments } = dashboard;
  const greeting = getGreeting();

  return (
    <View style={styles.container}>
      {header}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} />}
      >
        <Text style={styles.greeting}>
          {greetingName ? `${greeting}, ${greetingName}` : greeting}
        </Text>

        {nextAppointment ? (
          <>
            <PrimaryAppointmentCard
              order={nextAppointment}
              onPress={() => navigation.navigate("OrderDetail", { orderId: nextAppointment.id })}
            />
            <UpcomingStack
              upcoming={upcomingAppointments}
              expanded={isUpcomingExpanded}
              onToggle={() => setIsUpcomingExpanded((prev) => !prev)}
              onSelect={(orderId) => navigation.navigate("OrderDetail", { orderId })}
            />
          </>
        ) : (
          <EmptyAppointmentsCard onScheduleJob={() => navigation.navigate("Customers")} />
        )}

        <FinancialSnapshot dashboard={dashboard} />
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
    padding: 20,
    paddingBottom: 40,
  },
  loading: {
    marginTop: 32,
  },
  error: {
    color: "#c0392b",
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#0a7ea4",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: "flex-start",
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
  greeting: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0a7ea4",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  primaryCard: {
    backgroundColor: "#f2f8fa",
    borderRadius: 14,
    padding: 20,
  },
  primaryWhen: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
    marginBottom: 8,
  },
  primaryCustomer: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111",
  },
  primaryType: {
    fontSize: 15,
    color: "#555",
    marginTop: 2,
  },
  primaryMoney: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
    marginTop: 12,
  },
  primaryAddress: {
    fontSize: 14,
    color: "#666",
    marginTop: 6,
  },
  stackWrapper: {
    marginBottom: 8,
  },
  peekCard: {
    backgroundColor: "#e4eef1",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  peekText: {
    fontSize: 13,
    color: "#444",
    fontWeight: "500",
  },
  peekCardToday: {
    backgroundColor: "#0a7ea4",
  },
  peekTextToday: {
    color: "#fff",
    fontWeight: "700",
  },
  stackLabel: {
    textAlign: "center",
    fontSize: 13,
    color: "#0a7ea4",
    fontWeight: "600",
    marginTop: 10,
  },
  expandedStack: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginTop: 20,
    marginBottom: 8,
  },
  monthTitle: {
    marginTop: 24,
  },
  upcomingRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  upcomingWhenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  upcomingWhen: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
  upcomingWhenToday: {
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
  upcomingCustomer: {
    fontSize: 14,
    color: "#333",
    marginTop: 2,
  },
  upcomingType: {
    fontSize: 13,
    color: "#666",
    marginTop: 1,
  },
  collapseButton: {
    marginTop: 10,
    alignSelf: "flex-start",
  },
  collapseText: {
    fontSize: 14,
    color: "#0a7ea4",
    fontWeight: "600",
  },
  emptyCard: {
    backgroundColor: "#f7f7f7",
    borderRadius: 14,
    padding: 24,
    alignItems: "flex-start",
  },
  emptyText: {
    fontSize: 16,
    color: "#555",
    marginBottom: 16,
  },
  scheduleButton: {
    backgroundColor: "#0a7ea4",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  scheduleButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  financialSection: {
    marginTop: 8,
  },
  financialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  financialLabel: {
    fontSize: 15,
    color: "#666",
  },
  financialValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
});
