import { useFocusEffect } from "@react-navigation/native";
import type { Dashboard, DashboardRevenue } from "@the-pool-hub/types";
import { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getDashboard } from "../api/dashboard";
import { TabHeader } from "../components/TabHeader";
import { ApiError } from "../lib/api-client";
import { formatCurrency } from "../lib/format";
import type { TabScreenProps } from "../navigation/TabNavigator";

type Props = TabScreenProps<"Financial">;

function PeriodCard({
  title,
  revenue,
  completedCount,
}: {
  title: string;
  revenue: DashboardRevenue;
  completedCount: number;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Made</Text>
        <Text style={styles.value}>{formatCurrency(revenue.madeRevenue)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Expected</Text>
        <Text style={styles.value}>{formatCurrency(revenue.expectedRevenue)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Orders Completed</Text>
        <Text style={styles.value}>{completedCount}</Text>
      </View>
    </View>
  );
}

export function FinancialScreen(_props: Props) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await getDashboard();
      setDashboard(result.dashboard);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load financial data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const header = <TabHeader title="Financial" />;

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

  return (
    <View style={styles.container}>
      {header}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} />}
      >
        <PeriodCard
          title="THIS WEEK"
          revenue={dashboard.week}
          completedCount={dashboard.completedOrders.week}
        />
        <PeriodCard
          title="THIS MONTH"
          revenue={dashboard.month}
          completedCount={dashboard.completedOrders.month}
        />
        <PeriodCard
          title="THIS YEAR"
          revenue={dashboard.year}
          completedCount={dashboard.completedOrders.year}
        />
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
  card: {
    backgroundColor: "#f2f8fa",
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0a7ea4",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  label: {
    fontSize: 15,
    color: "#666",
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111",
  },
});
