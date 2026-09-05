import type { Order } from "@the-pool-hub/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listOrders } from "../api/orders";
import { AppHeader } from "../components/AppHeader";
import { ApiError } from "../lib/api-client";
import {
  formatMonthDay,
  formatMonthDayLong,
  formatWeekdayShort,
  formatYear,
  getBusinessCalendarDateString,
  getBusinessDayBoundaries,
  getBusinessWeekRange,
} from "../lib/business-week";
import { formatCurrency, formatOrderTypeLabel, formatTimeOnly } from "../lib/format";

interface Props {
  onViewDashboard: () => void;
  onViewSchedule: () => void;
  onViewCustomers: () => void;
  onViewOrders: () => void;
  onSelectOrder: (orderId: string) => void;
  onScheduleJob: () => void;
}

function DayColumn({
  dayStart,
  isToday,
  jobs,
  onSelectOrder,
}: {
  dayStart: Date;
  isToday: boolean;
  jobs: Order[];
  onSelectOrder: (orderId: string) => void;
}) {
  return (
    <div className={isToday ? "schedule-day-column today" : "schedule-day-column"}>
      <div className="schedule-day-header">
        <span className="schedule-day-name">{formatWeekdayShort(dayStart)}</span>
        <span className="schedule-day-date">{formatMonthDay(dayStart)}</span>
        {isToday ? <span className="today-badge">TODAY</span> : null}
      </div>

      {jobs.length === 0 ? (
        <p className="schedule-empty-day">No jobs</p>
      ) : (
        jobs.map((order) => (
          <button
            key={order.id}
            type="button"
            className={order.status === "cancelled" ? "schedule-job-card cancelled" : "schedule-job-card"}
            onClick={() => onSelectOrder(order.id)}
          >
            <span className="schedule-job-time">{formatTimeOnly(order.scheduledDate)}</span>
            <span className="schedule-job-customer">{order.customer.name}</span>
            <span className="schedule-job-type">{formatOrderTypeLabel(order.orderType)}</span>
            <span className="schedule-job-price">{formatCurrency(order.price)}</span>
            {order.status === "completed" ? (
              <span className="status-badge status-completed-badge">Completed</span>
            ) : null}
            {order.status === "cancelled" ? (
              <span className="status-badge status-cancelled-badge">Cancelled</span>
            ) : null}
          </button>
        ))
      )}
    </div>
  );
}

export function ScheduleScreen({
  onViewDashboard,
  onViewSchedule,
  onViewCustomers,
  onViewOrders,
  onSelectOrder,
  onScheduleJob,
}: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async (offset: number) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const range = getBusinessWeekRange(new Date(), offset);
      const result = await listOrders({
        scheduledFrom: range.start.toISOString(),
        scheduledTo: new Date(range.end.getTime() - 1).toISOString(),
        limit: 100,
      });
      if (requestIdRef.current !== requestId) return;
      setOrders(result.orders);
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setError(err instanceof ApiError ? err.message : "Failed to load schedule.");
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // Standard fetch-on-mount/week-change; a full data-fetching library is out of scope for this MVP.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(weekOffset);
  }, [load, weekOffset]);

  const weekRange = useMemo(() => getBusinessWeekRange(new Date(), weekOffset), [weekOffset]);
  const dayBoundaries = useMemo(() => getBusinessDayBoundaries(weekRange.start), [weekRange]);
  const todayKey = getBusinessCalendarDateString(new Date());

  const ordersByDay = useMemo(() => {
    const buckets: Order[][] = Array.from({ length: 7 }, () => []);
    for (const order of orders) {
      const scheduled = new Date(order.scheduledDate);
      for (let i = 0; i < 7; i++) {
        if (scheduled >= dayBoundaries[i] && scheduled < dayBoundaries[i + 1]) {
          buckets[i].push(order);
          break;
        }
      }
    }
    return buckets;
  }, [orders, dayBoundaries]);

  return (
    <>
      <AppHeader
        active="schedule"
        onViewDashboard={onViewDashboard}
        onViewSchedule={onViewSchedule}
        onViewCustomers={onViewCustomers}
        onViewOrders={onViewOrders}
      />
      <div className="page dashboard-page">
        <div className="dashboard-intro">
          <div>
            <h1>Weekly Schedule</h1>
            <p className="dashboard-subtitle">
              {formatMonthDayLong(dayBoundaries[0])} – {formatMonthDayLong(dayBoundaries[6])},{" "}
              {formatYear(dayBoundaries[6])}
            </p>
          </div>
          <button type="button" onClick={onScheduleJob}>
            + Schedule Job
          </button>
        </div>

        <div className="week-nav">
          <button type="button" className="secondary" onClick={() => setWeekOffset((current) => current - 1)}>
            ‹ Previous
          </button>
          {weekOffset !== 0 ? (
            <button type="button" className="secondary" onClick={() => setWeekOffset(0)}>
              Today
            </button>
          ) : (
            <span className="week-nav-current">Current week</span>
          )}
          <button type="button" className="secondary" onClick={() => setWeekOffset((current) => current + 1)}>
            Next ›
          </button>
        </div>

        {error ? (
          <div className="dashboard-error">
            <p className="auth-error">{error}</p>
            <button type="button" onClick={() => load(weekOffset)}>
              Retry
            </button>
          </div>
        ) : isLoading && orders.length === 0 ? (
          <p>Loading…</p>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <p>No jobs scheduled this week.</p>
            <button type="button" onClick={onScheduleJob}>
              Schedule a Job
            </button>
          </div>
        ) : (
          <div className="schedule-grid-wrapper">
            <div className="schedule-grid">
              {Array.from({ length: 7 }, (_, index) => {
                const dayStart = dayBoundaries[index];
                return (
                  <DayColumn
                    key={index}
                    dayStart={dayStart}
                    isToday={getBusinessCalendarDateString(dayStart) === todayKey}
                    jobs={ordersByDay[index]}
                    onSelectOrder={onSelectOrder}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
