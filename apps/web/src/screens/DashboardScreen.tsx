import type { Dashboard, Order } from "@the-pool-hub/types";
import { useCallback, useEffect, useState } from "react";
import { getDashboard } from "../api/dashboard";
import { getProfile } from "../api/profile";
import { AppHeader } from "../components/AppHeader";
import { ApiError } from "../lib/api-client";
import { formatCurrency, formatDateTime, formatOrderTypeLabel } from "../lib/format";

interface Props {
  onViewDashboard: () => void;
  onViewSchedule: () => void;
  onViewCustomers: () => void;
  onViewOrders: () => void;
  onSelectOrder: (orderId: string) => void;
  onScheduleJob: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function NextAppointmentCard({
  appointment,
  onSelectOrder,
  onScheduleJob,
}: {
  appointment: Order | null;
  onSelectOrder: (orderId: string) => void;
  onScheduleJob: () => void;
}) {
  if (!appointment) {
    return (
      <div className="empty-state">
        <p>No upcoming appointments.</p>
        <button type="button" onClick={onScheduleJob}>
          Schedule a Job
        </button>
      </div>
    );
  }

  const amountRemaining = appointment.amountRemaining ?? null;

  return (
    <button
      type="button"
      className="appointment-card-button"
      onClick={() => onSelectOrder(appointment.id)}
    >
      <span className="appointment-customer">{appointment.customer.name}</span>
      <span className="appointment-detail">{formatDateTime(appointment.scheduledDate)}</span>
      <span className="appointment-detail">{formatOrderTypeLabel(appointment.orderType)}</span>
      {appointment.customerAddress ? (
        <span className="appointment-detail">{appointment.customerAddress}</span>
      ) : null}
      <span className="appointment-detail appointment-money">
        {formatCurrency(appointment.price)}
        {amountRemaining === null
          ? ""
          : amountRemaining === "0.00"
            ? " · Paid in full"
            : ` · ${formatCurrency(amountRemaining)} remaining`}
      </span>
    </button>
  );
}

function UpcomingList({
  appointments,
  onSelectOrder,
}: {
  appointments: Order[];
  onSelectOrder: (orderId: string) => void;
}) {
  if (appointments.length === 0) {
    return <p className="empty-state-text">No other upcoming jobs.</p>;
  }

  return (
    <ul className="upcoming-list">
      {appointments.map((order) => (
        <li key={order.id}>
          <button type="button" className="upcoming-row" onClick={() => onSelectOrder(order.id)}>
            <span className="upcoming-customer">{order.customer.name}</span>
            <span className="upcoming-when">{formatDateTime(order.scheduledDate)}</span>
            <span className="upcoming-type">{formatOrderTypeLabel(order.orderType)}</span>
            <span className="upcoming-price">{formatCurrency(order.price)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function RevenueCard({ title, made, expected }: { title: string; made: string; expected: string }) {
  return (
    <div className="info-card">
      <h2 className="card-eyebrow">{title}</h2>
      <div className="revenue-row">
        <div>
          <span className="revenue-label">Made</span>
          <span className="revenue-value">{formatCurrency(made)}</span>
        </div>
        <div>
          <span className="revenue-label">Expected</span>
          <span className="revenue-value">{formatCurrency(expected)}</span>
        </div>
      </div>
    </div>
  );
}

function DashboardContent({
  dashboard,
  onSelectOrder,
  onScheduleJob,
}: {
  dashboard: Dashboard;
  onSelectOrder: (orderId: string) => void;
  onScheduleJob: () => void;
}) {
  return (
    <>
      <div className="card-grid">
        <RevenueCard
          title="THIS WEEK"
          made={dashboard.week.madeRevenue}
          expected={dashboard.week.expectedRevenue}
        />
        <RevenueCard
          title="THIS MONTH"
          made={dashboard.month.madeRevenue}
          expected={dashboard.month.expectedRevenue}
        />
      </div>

      <div className="card-grid">
        <div className="info-card">
          <h2 className="card-eyebrow">NEXT APPOINTMENT</h2>
          <NextAppointmentCard
            appointment={dashboard.nextAppointment}
            onSelectOrder={onSelectOrder}
            onScheduleJob={onScheduleJob}
          />
        </div>
        <div className="info-card">
          <h2 className="card-eyebrow">UPCOMING</h2>
          <UpcomingList appointments={dashboard.upcomingAppointments} onSelectOrder={onSelectOrder} />
        </div>
      </div>
    </>
  );
}

export function DashboardScreen({
  onViewDashboard,
  onViewSchedule,
  onViewCustomers,
  onViewOrders,
  onSelectOrder,
  onScheduleJob,
}: Props) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [greetingName, setGreetingName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [dashboardResult, profileResult] = await Promise.allSettled([
        getDashboard(),
        getProfile(),
      ]);

      if (dashboardResult.status === "rejected") {
        throw dashboardResult.reason;
      }

      if (profileResult.status === "fulfilled") {
        setGreetingName(profileResult.value.profile.name || null);
      }

      setDashboard(dashboardResult.value.dashboard);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Standard fetch-on-mount; a full data-fetching library is out of scope for this MVP.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const greeting = getGreeting();

  return (
    <>
      <AppHeader
        active="dashboard"
        onViewDashboard={onViewDashboard}
        onViewSchedule={onViewSchedule}
        onViewCustomers={onViewCustomers}
        onViewOrders={onViewOrders}
      />
      <div className="page dashboard-page">
        <div className="dashboard-intro">
          <div>
            <h1>{greetingName ? `${greeting}, ${greetingName}` : greeting}</h1>
            <p className="dashboard-subtitle">Business overview</p>
          </div>
          <button type="button" onClick={onScheduleJob}>
            + Schedule Job
          </button>
        </div>

        {error ? (
          <div className="dashboard-error">
            <p className="auth-error">{error}</p>
            <button type="button" onClick={load}>
              Retry
            </button>
          </div>
        ) : isLoading && !dashboard ? (
          <p>Loading…</p>
        ) : dashboard ? (
          <DashboardContent
            dashboard={dashboard}
            onSelectOrder={onSelectOrder}
            onScheduleJob={onScheduleJob}
          />
        ) : null}
      </div>
    </>
  );
}
