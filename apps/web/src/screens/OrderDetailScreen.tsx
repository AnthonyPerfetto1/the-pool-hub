import type { Order, Transaction } from "@the-pool-hub/types";
import { useCallback, useEffect, useState } from "react";
import { cancelOrder, completeOrder, getOrder } from "../api/orders";
import { listTransactions } from "../api/transactions";
import { ApiError } from "../lib/api-client";
import { addCurrencyStrings, formatCurrency, formatDate, formatDateTime } from "../lib/format";

interface Props {
  orderId: string;
  onBack: () => void;
  onEdit: (orderId: string) => void;
  onAddPayment: (orderId: string, amountRemaining: string) => void;
  onEditPayment: (transactionId: string, amountRemaining: string) => void;
}

export function OrderDetailScreen({
  orderId,
  onBack,
  onEdit,
  onAddPayment,
  onEditPayment,
}: Props) {
  const [order, setOrder] = useState<Order | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [orderResult, transactionsResult] = await Promise.all([
        getOrder(orderId),
        listTransactions(orderId),
      ]);
      setOrder(orderResult.order);
      setTransactions(transactionsResult.transactions);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load order.");
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    // Standard fetch-on-mount; a full data-fetching library is out of scope for this MVP.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleComplete() {
    try {
      await completeOrder(orderId);
      load();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : "Failed to complete order.");
    }
  }

  async function handleCancel() {
    if (!window.confirm("Cancel this order? It will be marked cancelled.")) {
      return;
    }
    try {
      await cancelOrder(orderId);
      load();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : "Failed to cancel order.");
    }
  }

  const canEdit = order ? order.status !== "cancelled" : false;
  const canComplete = order ? order.status === "scheduled" : false;
  const canCancel = order ? order.status === "scheduled" : false;
  const amountRemaining = order ? order.amountRemaining ?? order.price : "0.00";
  const canAddPayment = Number(amountRemaining) > 0;

  return (
    <div className="page">
      <header className="page-header">
        <button type="button" className="secondary" onClick={onBack}>
          ← Back
        </button>
      </header>

      {isLoading ? <p>Loading…</p> : null}
      {error ? <p className="auth-error">{error}</p> : null}

      {order ? (
        <div className="customer-detail">
          <h1>{order.customer.name}</h1>
          <p className={`order-status status-${order.status}`}>{order.status}</p>
          <p>
            {order.orderType === "opening" ? "Opening" : "Closing"} — {formatCurrency(order.price)}
          </p>
          <p>Scheduled: {formatDateTime(order.scheduledDate)}</p>
          {order.completedDate ? <p>Completed: {formatDateTime(order.completedDate)}</p> : null}
          {order.notes ? <p>{order.notes}</p> : null}

          <div className="page-header-actions">
            {canEdit ? (
              <button type="button" onClick={() => onEdit(orderId)}>
                Edit
              </button>
            ) : null}
            {canComplete ? (
              <button type="button" className="success" onClick={handleComplete}>
                Mark Completed
              </button>
            ) : null}
            {canCancel ? (
              <button type="button" className="danger" onClick={handleCancel}>
                Cancel Order
              </button>
            ) : null}
          </div>

          <div className="page-header" style={{ marginTop: 32 }}>
            <h2>Payment Summary</h2>
          </div>
          <table className="summary-table">
            <tbody>
              <tr>
                <td>Order Total</td>
                <td>{formatCurrency(order.price)}</td>
              </tr>
              <tr>
                <td>Paid</td>
                <td>{formatCurrency(order.totalPaid ?? "0.00")}</td>
              </tr>
              <tr>
                <td>Remaining</td>
                <td>{formatCurrency(amountRemaining)}</td>
              </tr>
            </tbody>
          </table>

          <div className="page-header" style={{ marginTop: 32 }}>
            <h2>Payments</h2>
            {canAddPayment ? (
              <button
                type="button"
                className="secondary"
                onClick={() => onAddPayment(orderId, amountRemaining)}
              >
                + Add Payment
              </button>
            ) : null}
          </div>

          {transactions.length === 0 ? (
            <p>No payments yet.</p>
          ) : (
            <table className="payment-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Notes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{formatDate(transaction.transactionDate)}</td>
                    <td>{formatCurrency(transaction.amount)}</td>
                    <td className="capitalize">{transaction.paymentMethod}</td>
                    <td>{transaction.notes ?? ""}</td>
                    <td>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() =>
                          onEditPayment(
                            transaction.id,
                            addCurrencyStrings(amountRemaining, transaction.amount),
                          )
                        }
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </div>
  );
}
