import type { Dashboard } from "@the-pool-hub/types";
import { and, asc, eq, gte, lt, ne } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/client";
import { customers, orders, transactions } from "../db/schema";
import { getAuthenticatedUserId, requireAuth } from "../middleware/auth";
import { getMonthRange, getWeekRange } from "../utils/date-ranges";
import { selectAppointments, sumExpectedRevenue, sumMadeRevenue } from "../utils/dashboard-calculations";
import { toOrderResponse } from "./orders";

export const dashboardRouter = Router();

// 1 primary next appointment + up to 5 additional upcoming ones, so the
// client can render the stacked upcoming-appointments UI without a second
// request.
const APPOINTMENT_LIMIT = 6;

dashboardRouter.get("/dashboard", requireAuth, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const now = new Date();
    const week = getWeekRange(now);
    const month = getMonthRange(now);

    // A single window covering both periods, so revenue data is fetched in
    // one query per table regardless of how the week and month overlap.
    const windowStart = week.start < month.start ? week.start : month.start;
    const windowEnd = week.end > month.end ? week.end : month.end;

    const [scheduledOrderRows, revenueOrderRows, revenueTransactionRows] = await Promise.all([
      db
        .select({ order: orders, customer: customers })
        .from(orders)
        .innerJoin(customers, eq(orders.customerId, customers.id))
        .where(and(eq(customers.userId, userId), eq(orders.status, "scheduled")))
        .orderBy(asc(orders.scheduledDate))
        .limit(APPOINTMENT_LIMIT),
      db
        .select({ order: orders })
        .from(orders)
        .innerJoin(customers, eq(orders.customerId, customers.id))
        .where(
          and(
            eq(customers.userId, userId),
            ne(orders.status, "cancelled"),
            gte(orders.scheduledDate, windowStart),
            lt(orders.scheduledDate, windowEnd),
          ),
        ),
      db
        .select({ transaction: transactions })
        .from(transactions)
        .innerJoin(orders, eq(transactions.orderId, orders.id))
        .innerJoin(customers, eq(orders.customerId, customers.id))
        .where(
          and(
            eq(customers.userId, userId),
            gte(transactions.transactionDate, windowStart),
            lt(transactions.transactionDate, windowEnd),
          ),
        ),
    ]);

    const { next, upcoming } = selectAppointments(
      scheduledOrderRows.map((row) => ({
        status: row.order.status,
        scheduledDate: row.order.scheduledDate,
        data: row,
      })),
      APPOINTMENT_LIMIT,
    );

    const revenueOrders = revenueOrderRows.map((row) => row.order);
    const revenueTransactions = revenueTransactionRows.map((row) => row.transaction);

    const dashboard: Dashboard = {
      nextAppointment: next ? toOrderResponse(next.order, next.customer) : null,
      upcomingAppointments: upcoming.map((row) => toOrderResponse(row.order, row.customer)),
      week: {
        madeRevenue: sumMadeRevenue(revenueTransactions, week),
        expectedRevenue: sumExpectedRevenue(revenueOrders, week),
      },
      month: {
        madeRevenue: sumMadeRevenue(revenueTransactions, month),
        expectedRevenue: sumExpectedRevenue(revenueOrders, month),
      },
    };

    res.json({ dashboard });
  } catch (error) {
    next(error);
  }
});
