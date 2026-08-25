import type { PaymentMethod } from "@the-pool-hub/types";
import { useEffect, useState, type FormEvent } from "react";
import { createTransaction, getTransaction, updateTransaction } from "../api/transactions";
import { ApiError } from "../lib/api-client";
import { formatCurrency, toDateTimeLocalValue } from "../lib/format";

export type PaymentFormTarget =
  | { mode: "create"; orderId: string; amountRemaining: string }
  | { mode: "edit"; transactionId: string; amountRemaining: string };

interface Props {
  target: PaymentFormTarget;
  onDone: () => void;
  onCancel: () => void;
}

const PAYMENT_METHODS: PaymentMethod[] = ["cash", "check", "card", "other"];

export function PaymentFormScreen({ target, onDone, onCancel }: Props) {
  const isEdit = target.mode === "edit";
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [transactionDate, setTransactionDate] = useState(
    toDateTimeLocalValue(new Date().toISOString()),
  );
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
        setTransactionDate(toDateTimeLocalValue(transaction.transactionDate));
        setNotes(transaction.notes ?? "");
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Failed to load payment.");
      })
      .finally(() => setIsLoading(false));
  }, [target]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
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
      const isoTransactionDate = new Date(transactionDate).toISOString();
      if (target.mode === "edit") {
        await updateTransaction(target.transactionId, {
          amount: trimmed,
          transactionDate: isoTransactionDate,
          paymentMethod,
          notes: notes || null,
        });
      } else {
        await createTransaction({
          orderId: target.orderId,
          amount: trimmed,
          transactionDate: isoTransactionDate,
          paymentMethod,
          notes: notes || null,
        });
      }
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save payment.");
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
        <h1>{isEdit ? "Edit Payment" : "Add Payment"}</h1>
        <p>Remaining balance: {formatCurrency(target.amountRemaining)}</p>

        <label htmlFor="amount">Amount</label>
        <input
          id="amount"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />

        <label htmlFor="paymentMethod">Payment Method</label>
        <select
          id="paymentMethod"
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
        >
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>

        <label htmlFor="transactionDate">Transaction Date</label>
        <input
          id="transactionDate"
          type="datetime-local"
          value={transactionDate}
          onChange={(event) => setTransactionDate(event.target.value)}
        />

        <label htmlFor="notes">Notes</label>
        <textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} />

        {error ? <p className="auth-error">{error}</p> : null}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save Payment"}
        </button>
      </form>
    </div>
  );
}
