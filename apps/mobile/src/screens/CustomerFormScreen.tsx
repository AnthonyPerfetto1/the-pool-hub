import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  TouchableOpacity,
} from "react-native";
import { createCustomer, getCustomer, updateCustomer } from "../api/customers";
import { ApiError } from "../lib/api-client";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "CustomerForm">;

interface FormState {
  name: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  poolSize: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  phone: "",
  email: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  poolSize: "",
  notes: "",
};

function Field({ label, ...inputProps }: TextInputProps & { label: string }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} {...inputProps} />
    </>
  );
}

export function CustomerFormScreen({ route, navigation }: Props) {
  const { params } = route;
  const isEdit = params.mode === "edit";
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.mode !== "edit") {
      return;
    }
    getCustomer(params.customerId)
      .then(({ customer }) => {
        setForm({
          name: customer.name,
          phone: customer.phone ?? "",
          email: customer.email ?? "",
          street: customer.street ?? "",
          city: customer.city ?? "",
          state: customer.state ?? "",
          zip: customer.zip ?? "",
          poolSize: customer.poolSize ?? "",
          notes: customer.notes ?? "",
        });
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Failed to load customer.");
      })
      .finally(() => setIsLoading(false));
  }, [params]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const input = {
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        street: form.street || null,
        city: form.city || null,
        state: form.state || null,
        zip: form.zip || null,
        poolSize: form.poolSize || null,
        notes: form.notes || null,
      };
      if (params.mode === "edit") {
        await updateCustomer(params.customerId, input);
      } else {
        await createCustomer(input);
      }
      navigation.goBack();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save customer.");
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
        <Field label="Name" value={form.name} onChangeText={(v) => update("name", v)} />
        <Field
          label="Phone"
          value={form.phone}
          onChangeText={(v) => update("phone", v)}
          keyboardType="phone-pad"
        />
        <Field
          label="Email"
          value={form.email}
          onChangeText={(v) => update("email", v)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field label="Street" value={form.street} onChangeText={(v) => update("street", v)} />
        <Field label="City" value={form.city} onChangeText={(v) => update("city", v)} />
        <Field
          label="State"
          value={form.state}
          onChangeText={(v) => update("state", v)}
          autoCapitalize="characters"
        />
        <Field
          label="ZIP"
          value={form.zip}
          onChangeText={(v) => update("zip", v)}
          keyboardType="number-pad"
        />
        <Field
          label="Pool Size"
          value={form.poolSize}
          onChangeText={(v) => update("poolSize", v)}
        />
        <Field
          label="Notes"
          value={form.notes}
          onChangeText={(v) => update("notes", v)}
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
