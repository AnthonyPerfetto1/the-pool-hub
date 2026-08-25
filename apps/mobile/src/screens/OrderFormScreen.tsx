import DateTimePicker from "@react-native-community/datetimepicker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { OrderType } from "@the-pool-hub/types";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { createOrder, getOrder, updateOrder } from "../api/orders";
import { ApiError } from "../lib/api-client";
import { formatDateTime } from "../lib/format";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "OrderForm">;

export function OrderFormScreen({ route, navigation }: Props) {
  const { params } = route;
  const isEdit = params.mode === "edit";
  const [orderType, setOrderType] = useState<OrderType>("opening");
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.mode !== "edit") {
      return;
    }
    getOrder(params.orderId)
      .then(({ order }) => {
        setOrderType(order.orderType);
        setScheduledDate(new Date(order.scheduledDate));
        setPrice(order.price);
        setNotes(order.notes ?? "");
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Failed to load order.");
      })
      .finally(() => setIsLoading(false));
  }, [params]);

  async function handleSubmit() {
    if (!price.trim()) {
      setError("Price is required.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      if (params.mode === "edit") {
        await updateOrder(params.orderId, {
          orderType,
          scheduledDate: scheduledDate.toISOString(),
          price: price.trim(),
          notes: notes || null,
        });
      } else {
        await createOrder({
          customerId: params.customerId,
          orderType,
          scheduledDate: scheduledDate.toISOString(),
          price: price.trim(),
          notes: notes || null,
        });
      }
      navigation.goBack();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save order.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <ActivityIndicator style={styles.loading} />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.label}>Order Type</Text>
        <TouchableOpacity
          style={styles.segmentRow}
          onPress={() => setOrderType(orderType === "opening" ? "closing" : "opening")}
        >
          <Text style={[styles.segment, orderType === "opening" && styles.segmentActive]}>
            Opening
          </Text>
          <Text style={[styles.segment, orderType === "closing" && styles.segmentActive]}>
            Closing
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>Scheduled Date</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)}>
          <Text>{formatDateTime(scheduledDate.toISOString())}</Text>
        </TouchableOpacity>
        {showPicker ? (
          <DateTimePicker
            value={scheduledDate}
            mode="datetime"
            onChange={(_event, selectedDate) => {
              setShowPicker(Platform.OS === "ios");
              if (selectedDate) {
                setScheduledDate(selectedDate);
              }
            }}
          />
        ) : null}

        <Text style={styles.label}>Price</Text>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={isSubmitting}>
          <Text style={styles.buttonText}>{isSubmitting ? "Saving…" : "Save"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loading: {
    marginTop: 32,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 13,
    color: "#666",
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    justifyContent: "center",
    minHeight: 44,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  segmentRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    overflow: "hidden",
  },
  segment: {
    flex: 1,
    textAlign: "center",
    paddingVertical: 10,
    fontSize: 15,
    color: "#333",
  },
  segmentActive: {
    backgroundColor: "#0a7ea4",
    color: "#fff",
    fontWeight: "600",
  },
  error: {
    color: "#c0392b",
    marginTop: 12,
  },
  button: {
    backgroundColor: "#0a7ea4",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
