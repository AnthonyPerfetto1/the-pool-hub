import type { Customer } from "@the-pool-hub/types";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { listCustomers } from "../api/customers";
import { useAuth } from "../auth/useAuth";
import { ApiError } from "../lib/api-client";

interface Props {
  onSelectCustomer: (customerId: string) => void;
  onAddCustomer: () => void;
}

function formatSecondaryLine(customer: Customer): string {
  const address = [customer.city, customer.state].filter(Boolean).join(", ");
  return [customer.phone, address].filter(Boolean).join(" · ") || "No contact info";
}

export function CustomerListScreen({ onSelectCustomer, onAddCustomer }: Props) {
  const { signOut } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (search: string) => {
    try {
      const result = await listCustomers(search || undefined);
      setCustomers(result.customers);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load customers.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Standard fetch-on-mount; a full data-fetching library is out of scope for this MVP.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load("");
  }, [load]);

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    load(searchInput);
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Customers</h1>
        <div className="page-header-actions">
          <button type="button" onClick={onAddCustomer}>
            + Add
          </button>
          <button type="button" className="secondary" onClick={() => signOut()}>
            Log Out
          </button>
        </div>
      </header>

      <form onSubmit={handleSearchSubmit} className="search-form">
        <input
          type="search"
          placeholder="Search customers"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
        <button type="submit">Search</button>
      </form>

      {error ? <p className="auth-error">{error}</p> : null}

      {isLoading ? (
        <p>Loading…</p>
      ) : customers.length === 0 ? (
        <p>No customers yet.</p>
      ) : (
        <ul className="customer-list">
          {customers.map((customer) => (
            <li key={customer.id}>
              <button
                type="button"
                className="customer-row"
                onClick={() => onSelectCustomer(customer.id)}
              >
                <span className="customer-name">{customer.name}</span>
                <span className="customer-secondary">{formatSecondaryLine(customer)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
