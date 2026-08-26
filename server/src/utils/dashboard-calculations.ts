import type { OrderStatus } from "@the-pool-hub/types";
import type { DateRange } from "./date-ranges";
import { centsToDecimalString, toCents } from "./money";

interface AppointmentCandidate<T> {
  status: OrderStatus;
  scheduledDate: Date;
  data: T;
}

// Filters to scheduled-only orders (completed/cancelled are never
// appointments), sorts soonest first, and splits the result into a single
// primary "next" appointment plus the remaining upcoming ones. `limit`
// bounds the total scheduled orders considered (default 6: 1 next + 5
// upcoming), matching the dashboard's "next several appointments" contract.
export function selectAppointments<T>(
  candidates: AppointmentCandidate<T>[],
  limit = 6,
): { next: T | null; upcoming: T[] } {
  const scheduled = candidates
    .filter((candidate) => candidate.status === "scheduled")
    .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime())
    .slice(0, limit)
    .map((candidate) => candidate.data);

  const [next = null, ...upcoming] = scheduled;
  return { next, upcoming };
}

interface ExpectedRevenueOrder {
  scheduledDate: Date;
  price: string;
  status: OrderStatus;
}

// "Expected" revenue is the full value of qualifying work — scheduled or
// completed orders whose scheduled date falls in range — never reduced by
// payments already received. Cancelled orders never contribute.
export function sumExpectedRevenue(orders: ExpectedRevenueOrder[], range: DateRange): string {
  let cents = 0;
  for (const order of orders) {
    if (order.status === "cancelled") continue;
    if (order.scheduledDate < range.start || order.scheduledDate >= range.end) continue;
    cents += toCents(order.price);
  }
  return centsToDecimalString(cents);
}

interface MadeRevenueTransaction {
  transactionDate: Date;
  amount: string;
}

// "Made" revenue is the sum of transactions actually recorded in range,
// regardless of the status of the order they belong to.
export function sumMadeRevenue(transactions: MadeRevenueTransaction[], range: DateRange): string {
  let cents = 0;
  for (const transaction of transactions) {
    if (transaction.transactionDate < range.start || transaction.transactionDate >= range.end) {
      continue;
    }
    cents += toCents(transaction.amount);
  }
  return centsToDecimalString(cents);
}
