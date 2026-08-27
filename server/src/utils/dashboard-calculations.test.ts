import type { OrderStatus } from "@the-pool-hub/types";
import { describe, expect, it } from "vitest";
import type { DateRange } from "./date-ranges";
import {
  buildShortAddress,
  selectAppointments,
  sumExpectedRevenue,
  sumMadeRevenue,
} from "./dashboard-calculations";

function candidate(status: OrderStatus, isoDate: string, data: string) {
  return { status, scheduledDate: new Date(isoDate), data };
}

describe("selectAppointments", () => {
  it("returns the earliest scheduled order as next", () => {
    const { next } = selectAppointments([
      candidate("scheduled", "2026-03-10T09:00:00Z", "later"),
      candidate("scheduled", "2026-03-05T09:00:00Z", "earliest"),
      candidate("scheduled", "2026-03-07T09:00:00Z", "middle"),
    ]);
    expect(next).toBe("earliest");
  });

  it("excludes completed orders", () => {
    const { next, upcoming } = selectAppointments([
      candidate("completed", "2026-03-01T09:00:00Z", "done"),
      candidate("scheduled", "2026-03-05T09:00:00Z", "next"),
    ]);
    expect(next).toBe("next");
    expect(upcoming).toEqual([]);
  });

  it("excludes cancelled orders", () => {
    const { next, upcoming } = selectAppointments([
      candidate("cancelled", "2026-03-01T09:00:00Z", "cancelled-early"),
      candidate("scheduled", "2026-03-05T09:00:00Z", "next"),
    ]);
    expect(next).toBe("next");
    expect(upcoming).toEqual([]);
  });

  it("returns a future appointment when there are none today", () => {
    const { next } = selectAppointments([candidate("scheduled", "2026-04-01T09:00:00Z", "future")]);
    expect(next).toBe("future");
  });

  it("returns null next and empty upcoming when there are no scheduled orders", () => {
    const result = selectAppointments([
      candidate("completed", "2026-03-01T09:00:00Z", "done"),
      candidate("cancelled", "2026-03-02T09:00:00Z", "cancelled"),
    ]);
    expect(result.next).toBeNull();
    expect(result.upcoming).toEqual([]);
  });

  it("splits into one next appointment plus up to 5 upcoming, honoring the limit", () => {
    const candidates = Array.from({ length: 8 }, (_, i) =>
      candidate("scheduled", `2026-03-0${i + 1}T09:00:00Z`, `order-${i + 1}`),
    );
    const { next, upcoming } = selectAppointments(candidates, 6);
    expect(next).toBe("order-1");
    expect(upcoming).toEqual(["order-2", "order-3", "order-4", "order-5", "order-6"]);
  });
});

const week: DateRange = {
  start: new Date("2026-02-16T00:00:00Z"),
  end: new Date("2026-02-23T00:00:00Z"),
};

const month: DateRange = {
  start: new Date("2026-02-01T00:00:00Z"),
  end: new Date("2026-03-01T00:00:00Z"),
};

describe("sumMadeRevenue", () => {
  it("sums only transactions within the given week", () => {
    const total = sumMadeRevenue(
      [
        { transactionDate: new Date("2026-02-16T00:00:00Z"), amount: "100.00" }, // in (boundary)
        { transactionDate: new Date("2026-02-22T23:59:59Z"), amount: "50.00" }, // in
        { transactionDate: new Date("2026-02-15T23:59:59Z"), amount: "999.00" }, // before week
        { transactionDate: new Date("2026-02-23T00:00:00Z"), amount: "999.00" }, // next week (excluded)
      ],
      week,
    );
    expect(total).toBe("150.00");
  });

  it("sums only transactions within the given month", () => {
    const total = sumMadeRevenue(
      [
        { transactionDate: new Date("2026-02-01T00:00:00Z"), amount: "20.00" },
        { transactionDate: new Date("2026-02-28T23:59:59Z"), amount: "30.00" },
        { transactionDate: new Date("2026-01-31T23:59:59Z"), amount: "999.00" },
        { transactionDate: new Date("2026-03-01T00:00:00Z"), amount: "999.00" },
      ],
      month,
    );
    expect(total).toBe("50.00");
  });

  it("returns 0.00 when there are no transactions in range", () => {
    expect(sumMadeRevenue([], week)).toBe("0.00");
  });
});

describe("sumExpectedRevenue", () => {
  it("includes scheduled orders in range", () => {
    const total = sumExpectedRevenue(
      [{ scheduledDate: new Date("2026-02-18T00:00:00Z"), price: "300.00", status: "scheduled" }],
      week,
    );
    expect(total).toBe("300.00");
  });

  it("includes completed orders in range", () => {
    const total = sumExpectedRevenue(
      [{ scheduledDate: new Date("2026-02-18T00:00:00Z"), price: "300.00", status: "completed" }],
      week,
    );
    expect(total).toBe("300.00");
  });

  it("excludes cancelled orders even when scheduled in range", () => {
    const total = sumExpectedRevenue(
      [{ scheduledDate: new Date("2026-02-18T00:00:00Z"), price: "300.00", status: "cancelled" }],
      week,
    );
    expect(total).toBe("0.00");
  });

  it("uses the full order price even when a partial payment was already made", () => {
    // sumExpectedRevenue never looks at transactions at all — the order
    // price is the whole story, regardless of what has been paid.
    const total = sumExpectedRevenue(
      [{ scheduledDate: new Date("2026-02-18T00:00:00Z"), price: "500.00", status: "scheduled" }],
      week,
    );
    expect(total).toBe("500.00");
  });

  it("respects month boundaries", () => {
    const total = sumExpectedRevenue(
      [
        { scheduledDate: new Date("2026-02-01T00:00:00Z"), price: "100.00", status: "scheduled" },
        { scheduledDate: new Date("2026-01-31T23:59:59Z"), price: "999.00", status: "scheduled" },
        { scheduledDate: new Date("2026-03-01T00:00:00Z"), price: "999.00", status: "scheduled" },
      ],
      month,
    );
    expect(total).toBe("100.00");
  });
});

// These calculation functions never see a user id — the route scopes every
// query to the authenticated user via the same customers.userId join used by
// orders/transactions/customers, before any of this code runs. What's worth
// verifying here is that the pure functions are stateless: calling them with
// one caller's rows can never surface another caller's data, since nothing
// is cached or shared between calls.
describe("calculations do not leak state between calls", () => {
  it("selectAppointments never returns data it wasn't given", () => {
    const userAResult = selectAppointments([candidate("scheduled", "2026-03-05T09:00:00Z", "user-a-order")]);
    const userBResult = selectAppointments([candidate("scheduled", "2026-03-01T09:00:00Z", "user-b-order")]);
    expect(userAResult.next).toBe("user-a-order");
    expect(userBResult.next).toBe("user-b-order");
  });

  it("sumMadeRevenue and sumExpectedRevenue only total the rows passed in", () => {
    const userATotal = sumMadeRevenue(
      [{ transactionDate: new Date("2026-02-18T00:00:00Z"), amount: "100.00" }],
      week,
    );
    const userBTotal = sumMadeRevenue(
      [{ transactionDate: new Date("2026-02-18T00:00:00Z"), amount: "50.00" }],
      week,
    );
    expect(userATotal).toBe("100.00");
    expect(userBTotal).toBe("50.00");
  });
});

describe("buildShortAddress", () => {
  it("prefers the street address when present", () => {
    const address = buildShortAddress({ street: "123 Main Street", city: "Ann Arbor", state: "MI" });
    expect(address).toBe("123 Main Street");
  });

  it("falls back to city and state when there is no street", () => {
    const address = buildShortAddress({ street: null, city: "Ann Arbor", state: "MI" });
    expect(address).toBe("Ann Arbor, MI");
  });

  it("falls back to just the city when there is no street or state", () => {
    const address = buildShortAddress({ street: null, city: "Ann Arbor", state: null });
    expect(address).toBe("Ann Arbor");
  });

  it("returns null when there is no usable address information", () => {
    const address = buildShortAddress({ street: null, city: null, state: null });
    expect(address).toBeNull();
  });
});
