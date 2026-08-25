import type { OrderType } from "@the-pool-hub/types";
import { useEffect, useState, type FormEvent } from "react";
import { createOrder, getOrder, updateOrder } from "../api/orders";
import { ApiError } from "../lib/api-client";
import { toDateTimeLocalValue } from "../lib/format";

export type OrderFormTarget = { mode: "create"; customerId: string } | { mode: "edit"; orderId: string };

interface Props {
  target: OrderFormTarget;
  onDone: () => void;
  onCancel: () => void;
}

export function OrderFormScreen({ target, onDone, onCancel }: Props) {
  const isEdit = target.mode === "edit";
  const [orderType, setOrderType] = useState<OrderType>("opening");
  const [scheduledDate, setScheduledDate] = useState(toDateTimeLocalValue(new Date().toISOString()));
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (target.mode !== "edit") {
      return;
    }
    getOrder(target.orderId)
      .then(({ order }) => {
        setOrderType(order.orderType);
        setScheduledDate(toDateTimeLocalValue(order.scheduledDate));
        setPrice(order.price);
        setNotes(order.notes ?? "");
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Failed to load order.");
      })
      .finally(() => setIsLoading(false));
  }, [target]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!price.trim()) {
      setError("Price is required.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      // datetime-local has no timezone; new Date(...) interprets it in the
      // browser's local timezone, and toISOString() converts to a proper
      // UTC instant for the API — this preserves the wall-clock time chosen.
      const isoScheduledDate = new Date(scheduledDate).toISOString();
      if (target.mode === "edit") {
        await updateOrder(target.orderId, {
          orderType,
          scheduledDate: isoScheduledDate,
          price: price.trim(),
          notes: notes || null,
        });
      } else {
        await createOrder({
          customerId: target.customerId,
          orderType,
          scheduledDate: isoScheduledDate,
          price: price.trim(),
          notes: notes || null,
        });
      }
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save order.");
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
        <h1>{isEdit ? "Edit Order" : "New Order"}</h1>

        <label htmlFor="orderType">Order Type</label>
        <select
          id="orderType"
          value={orderType}
          onChange={(event) => setOrderType(event.target.value as OrderType)}
        >
          <option value="opening">Opening</option>
          <option value="closing">Closing</option>
        </select>

        <label htmlFor="scheduledDate">Scheduled Date</label>
        <input
          id="scheduledDate"
          type="datetime-local"
          value={scheduledDate}
          onChange={(event) => setScheduledDate(event.target.value)}
        />

        <label htmlFor="price">Price</label>
        <input
          id="price"
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />

        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />

        {error ? <p className="auth-error">{error}</p> : null}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
