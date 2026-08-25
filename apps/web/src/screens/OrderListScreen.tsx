import type { OrderStatus, OrderType } from "@the-pool-hub/types";
import { useCallback, useEffect, useState } from "react";
import { listOrders, type OrderListFilters } from "../api/orders";
import { ApiError } from "../lib/api-client";
import { formatCurrency, formatDateTime } from "../lib/format";
import type { Order } from "@the-pool-hub/types";

interface Props {
  onSelectOrder: (orderId: string) => void;
  onBack: () => void;
}

const STATUS_OPTIONS: { label: string; value: OrderStatus | "" }[] = [
  { label: "All statuses", value: "" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const TYPE_OPTIONS: { label: string; value: OrderType | "" }[] = [
  { label: "All types", value: "" },
  { label: "Opening", value: "opening" },
  { label: "Closing", value: "closing" },
];

export function OrderListScreen({ onSelectOrder, onBack }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [orderType, setOrderType] = useState<OrderType | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (filters: OrderListFilters) => {
    try {
      const result = await listOrders(filters);
      setOrders(result.orders);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load orders.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Standard fetch-on-filter-change; a full data-fetching library is out of scope for this MVP.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    load({
      status: status || undefined,
      orderType: orderType || undefined,
    });
  }, [load, status, orderType]);

  return (
    <div className="page">
      <header className="page-header">
        <button type="button" className="secondary" onClick={onBack}>
          ← Back
        </button>
        <h1>Orders</h1>
      </header>

      <div className="filter-row">
        <select value={status} onChange={(event) => setStatus(event.target.value as OrderStatus | "")}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={orderType}
          onChange={(event) => setOrderType(event.target.value as OrderType | "")}
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="auth-error">{error}</p> : null}

      {isLoading ? (
        <p>Loading…</p>
      ) : orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <ul className="customer-list">
          {orders.map((order) => (
            <li key={order.id}>
              <button type="button" className="customer-row" onClick={() => onSelectOrder(order.id)}>
                <span className="customer-name">{order.customer.name}</span>
                <span className="customer-secondary">
                  {order.orderType === "opening" ? "Opening" : "Closing"} ·{" "}
                  {formatDateTime(order.scheduledDate)} · {formatCurrency(order.price)} ·{" "}
                  {order.status}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
