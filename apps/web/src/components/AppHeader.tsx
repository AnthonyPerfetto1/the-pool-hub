import { useAuth } from "../auth/useAuth";

interface Props {
  active: "dashboard" | "schedule";
  onViewDashboard: () => void;
  onViewSchedule: () => void;
  onViewCustomers: () => void;
  onViewOrders: () => void;
}

// Shared top nav for the two business-overview screens (Dashboard, Schedule)
// introduced in Phase 6D. The existing Customers/Orders/etc. screens keep
// their own per-screen headers (established in earlier phases) — this isn't
// a app-wide navigation rewrite, just a control-panel-style header for the
// two new "hub" screens.
export function AppHeader({ active, onViewDashboard, onViewSchedule, onViewCustomers, onViewOrders }: Props) {
  const { signOut } = useAuth();

  return (
    <header className="app-header">
      <span className="app-header-brand">The Pool Hub</span>
      <nav className="app-header-nav">
        <button
          type="button"
          className={active === "dashboard" ? "app-header-link active" : "app-header-link"}
          onClick={onViewDashboard}
        >
          Dashboard
        </button>
        <button
          type="button"
          className={active === "schedule" ? "app-header-link active" : "app-header-link"}
          onClick={onViewSchedule}
        >
          Schedule
        </button>
        <button type="button" className="app-header-link" onClick={onViewCustomers}>
          Customers
        </button>
        <button type="button" className="app-header-link" onClick={onViewOrders}>
          Orders
        </button>
        <button type="button" className="app-header-link" onClick={() => signOut()}>
          Log Out
        </button>
      </nav>
    </header>
  );
}
