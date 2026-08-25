import type { Order } from "@the-pool-hub/types";
import { useCallback, useEffect, useState } from "react";
import { cancelOrder, completeOrder, getOrder } from "../api/orders";
import { ApiError } from "../lib/api-client";
import { formatCurrency, formatDateTime } from "../lib/format";

interface Props {
  orderId: string;
  onBack: () => void;
  onEdit: (orderId: string) => void;
}

export function OrderDetailScreen({ orderId, onBack, onEdit }: Props) {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await getOrder(orderId);
      setOrder(result.order);
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
        </div>
      ) : null}
    </div>
  );
}
