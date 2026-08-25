import type { Customer, Order } from "@the-pool-hub/types";
import { useCallback, useEffect, useState } from "react";
import { archiveCustomer, getCustomer } from "../api/customers";
import { listOrders } from "../api/orders";
import { ApiError } from "../lib/api-client";
import { formatCurrency, formatDateTime } from "../lib/format";

interface Props {
  customerId: string;
  onBack: () => void;
  onEdit: (customerId: string) => void;
  onSelectOrder: (orderId: string) => void;
  onNewOrder: (customerId: string) => void;
}

function formatAddress(customer: Customer): string | null {
  const cityState = [customer.city, customer.state].filter(Boolean).join(", ");
  const lines = [customer.street, [cityState, customer.zip].filter(Boolean).join(" ")].filter(
    Boolean,
  );
  return lines.length > 0 ? lines.join(", ") : null;
}

export function CustomerDetailScreen({
  customerId,
  onBack,
  onEdit,
  onSelectOrder,
  onNewOrder,
}: Props) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [customerResult, ordersResult] = await Promise.all([
        getCustomer(customerId),
        listOrders({ customerId }),
      ]);
      setCustomer(customerResult.customer);
      setOrders(ordersResult.orders);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load customer.");
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    // Standard fetch-on-mount; a full data-fetching library is out of scope for this MVP.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleArchive() {
    if (!window.confirm("Archive this customer? This will remove them from your active list.")) {
      return;
    }
    try {
      await archiveCustomer(customerId);
      onBack();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : "Failed to archive customer.");
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <button type="button" className="secondary" onClick={onBack}>
          ← Back
        </button>
      </header>

      {isLoading ? <p>Loading…</p> : null}
      {error ? <p className="auth-error">{error}</p> : null}

      {customer ? (
        <div className="customer-detail">
          <h1>{customer.name}</h1>

          {customer.phone ? (
            <p>
              <a href={`tel:${customer.phone}`}>{customer.phone}</a>
            </p>
          ) : null}
          {customer.email ? (
            <p>
              <a href={`mailto:${customer.email}`}>{customer.email}</a>
            </p>
          ) : null}
          {formatAddress(customer) ? <p>{formatAddress(customer)}</p> : null}
          {customer.poolSize ? <p>Pool size: {customer.poolSize}</p> : null}
          {customer.notes ? <p>{customer.notes}</p> : null}

          <div className="page-header-actions">
            <button type="button" onClick={() => onEdit(customerId)}>
              Edit
            </button>
            <button type="button" className="danger" onClick={handleArchive}>
              Archive
            </button>
          </div>

          <div className="page-header" style={{ marginTop: 32 }}>
            <h2>Orders</h2>
            <button type="button" className="secondary" onClick={() => onNewOrder(customerId)}>
              + New Order
            </button>
          </div>

          {orders.length === 0 ? (
            <p>No orders yet.</p>
          ) : (
            <ul className="customer-list">
              {orders.map((order) => (
                <li key={order.id}>
                  <button
                    type="button"
                    className="customer-row"
                    onClick={() => onSelectOrder(order.id)}
                  >
                    <span className="customer-name">
                      {order.orderType === "opening" ? "Opening" : "Closing"} —{" "}
                      {formatCurrency(order.price)}
                    </span>
                    <span className="customer-secondary">
                      {formatDateTime(order.scheduledDate)} ·{" "}
                      <span className={`order-status status-${order.status}`}>
                        {order.status}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
