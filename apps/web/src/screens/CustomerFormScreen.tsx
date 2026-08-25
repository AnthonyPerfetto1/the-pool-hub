import { useEffect, useState, type FormEvent } from "react";
import { createCustomer, getCustomer, updateCustomer } from "../api/customers";
import { ApiError } from "../lib/api-client";

type Mode = { mode: "create" } | { mode: "edit"; customerId: string };

interface Props {
  target: Mode;
  onDone: () => void;
  onCancel: () => void;
}

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

export function CustomerFormScreen({ target, onDone, onCancel }: Props) {
  const isEdit = target.mode === "edit";
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (target.mode !== "edit") {
      return;
    }
    getCustomer(target.customerId)
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
  }, [target]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
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
      if (target.mode === "edit") {
        await updateCustomer(target.customerId, input);
      } else {
        await createCustomer(input);
      }
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save customer.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="page">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <button type="button" className="secondary" onClick={onCancel}>
          ← Cancel
        </button>
      </header>

      <form className="customer-form" onSubmit={handleSubmit}>
        <h1>{isEdit ? "Edit Customer" : "Add Customer"}</h1>

        <label htmlFor="name">Name</label>
        <input
          id="name"
          value={form.name}
          onChange={(event) => update("name", event.target.value)}
        />

        <label htmlFor="phone">Phone</label>
        <input
          id="phone"
          type="tel"
          value={form.phone}
          onChange={(event) => update("phone", event.target.value)}
        />

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={form.email}
          onChange={(event) => update("email", event.target.value)}
        />

        <label htmlFor="street">Street</label>
        <input
          id="street"
          value={form.street}
          onChange={(event) => update("street", event.target.value)}
        />

        <label htmlFor="city">City</label>
        <input
          id="city"
          value={form.city}
          onChange={(event) => update("city", event.target.value)}
        />

        <label htmlFor="state">State</label>
        <input
          id="state"
          value={form.state}
          onChange={(event) => update("state", event.target.value)}
        />

        <label htmlFor="zip">ZIP</label>
        <input id="zip" value={form.zip} onChange={(event) => update("zip", event.target.value)} />

        <label htmlFor="poolSize">Pool Size</label>
        <input
          id="poolSize"
          value={form.poolSize}
          onChange={(event) => update("poolSize", event.target.value)}
        />

        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          value={form.notes}
          onChange={(event) => update("notes", event.target.value)}
        />

        {error ? <p className="auth-error">{error}</p> : null}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
