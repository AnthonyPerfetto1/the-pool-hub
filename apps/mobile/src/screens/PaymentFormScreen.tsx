import DateTimePicker from "@react-native-community/datetimepicker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { PaymentMethod } from "@the-pool-hub/types";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { createTransaction, getTransaction, updateTransaction } from "../api/transactions";
import { ApiError } from "../lib/api-client";
import { formatCurrency, formatDateTime } from "../lib/format";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "PaymentForm">;

const PAYMENT_METHODS: PaymentMethod[] = ["cash", "check", "card", "other"];

export function PaymentFormScreen({ route, navigation }: Props) {
  const { target } = route.params;
  const isEdit = target.mode === "edit";
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (target.mode !== "edit") {
      return;
    }
    getTransaction(target.transactionId)
      .then(({ transaction }) => {
        setAmount(transaction.amount);
        setPaymentMethod(transaction.paymentMethod);
        setTransactionDate(new Date(transaction.transactionDate));
        setNotes(transaction.notes ?? "");
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Failed to load payment.");
      })
      .finally(() => setIsLoading(false));
  }, [target]);

  async function handleSubmit() {
    const trimmed = amount.trim();
    if (!trimmed || Number.isNaN(Number(trimmed)) || Number(trimmed) <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }
    if (Number(trimmed) > Number(target.amountRemaining)) {
      setError(
        `Amount cannot exceed the remaining balance of ${formatCurrency(target.amountRemaining)}.`,
      );
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      if (target.mode === "edit") {
        await updateTransaction(target.transactionId, {
          amount: trimmed,
          transactionDate: transactionDate.toISOString(),
          paymentMethod,
          notes: notes || null,
        });
      } else {
        await createTransaction({
          orderId: target.orderId,
          amount: trimmed,
          transactionDate: transactionDate.toISOString(),
          paymentMethod,
          notes: notes || null,
        });
      }
      navigation.goBack();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save payment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <ActivityIndicator style={styles.loading} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.form}>
      <Text style={styles.remaining}>
        Remaining balance: {formatCurrency(target.amountRemaining)}
      </Text>

      <Text style={styles.label}>Amount</Text>
      <TextInput
        style={styles.input}
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
      />

      <Text style={styles.label}>Payment Method</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.methodRow}>
        {PAYMENT_METHODS.map((method) => (
          <TouchableOpacity
            key={method}
            style={[styles.methodChip, paymentMethod === method && styles.methodChipActive]}
            onPress={() => setPaymentMethod(method)}
          >
            <Text
              style={[
                styles.methodChipText,
                paymentMethod === method && styles.methodChipTextActive,
              ]}
            >
              {method}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Transaction Date</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)}>
        <Text>{formatDateTime(transactionDate.toISOString())}</Text>
      </TouchableOpacity>
      {showPicker ? (
        <DateTimePicker
          value={transactionDate}
          mode="datetime"
          onChange={(_event, selectedDate) => {
            setShowPicker(Platform.OS === "ios");
            if (selectedDate) {
              setTransactionDate(selectedDate);
            }
          }}
        />
      ) : null}

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.notesInput]}
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={isSubmitting}>
        <Text style={styles.buttonText}>{isSubmitting ? "Saving…" : "Save Payment"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: {
    marginTop: 32,
  },
  form: {
    padding: 20,
  },
  remaining: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
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
  methodRow: {
    flexDirection: "row",
  },
  methodChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#eee",
    marginRight: 8,
  },
  methodChipActive: {
    backgroundColor: "#0a7ea4",
  },
  methodChipText: {
    fontSize: 14,
    color: "#333",
    textTransform: "capitalize",
  },
  methodChipTextActive: {
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
