import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import type { Customer } from "@the-pool-hub/types";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { listCustomers } from "../api/customers";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../lib/api-client";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "CustomerList">;

function formatSecondaryLine(customer: Customer): string {
  const address = [customer.city, customer.state].filter(Boolean).join(", ");
  return [customer.phone, address].filter(Boolean).join(" · ") || "No contact info";
}

export function CustomerListScreen({ navigation }: Props) {
  const { signOut } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const searchRef = useRef(search);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  const load = useCallback(async (searchTerm: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listCustomers(searchTerm || undefined);
      setCustomers(result.customers);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load customers.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(searchRef.current);
    }, [load]),
  );

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => signOut()}>
          <Text style={styles.headerButton}>Log Out</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => navigation.navigate("OrderList", undefined)}>
            <Text style={styles.headerButton}>Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate("CustomerForm", { mode: "create" })}
          >
            <Text style={styles.headerButton}>+ Add</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, signOut]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search customers"
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={() => load(search)}
        returnKeyType="search"
        autoCapitalize="none"
        clearButtonMode="while-editing"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {isLoading && customers.length === 0 ? (
        <ActivityIndicator style={styles.loading} />
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={() => load(search)} />
          }
          ListEmptyComponent={<Text style={styles.empty}>No customers yet.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate("CustomerDetail", { customerId: item.id })}
            >
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.secondary}>{formatSecondaryLine(item)}</Text>
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
  search: {
    margin: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    fontSize: 16,
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
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  name: {
    fontSize: 17,
    fontWeight: "600",
  },
  secondary: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
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
    marginBottom: 8,
  },
});
