import type { Dashboard } from "@the-pool-hub/types";
import { and, asc, eq, gte, lt, ne } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/client";
import { getTotalPaidForOrder } from "../db/order-totals";
import { customers, orders, transactions } from "../db/schema";
import { getAuthenticatedUserId, requireAuth } from "../middleware/auth";
import {
  buildShortAddress,
  countCompletedOrders,
  selectAppointments,
  sumExpectedRevenue,
  sumMadeRevenue,
} from "../utils/dashboard-calculations";
import { getMonthRange, getWeekRange, getYearRange } from "../utils/date-ranges";
import { computeAmountRemaining } from "../utils/money";
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
    const year = getYearRange(now);

    // A single window covering all three periods, so revenue data is
    // fetched in one query per table regardless of how they overlap (a week
    // can dip into the previous/next month or, at year boundaries, the
    // previous/next year).
    const windowStart = [week.start, month.start, year.start].reduce((a, b) => (a < b ? a : b));
    const windowEnd = [week.end, month.end, year.end].reduce((a, b) => (a > b ? a : b));

    const [scheduledOrderRows, revenueOrderRows, revenueTransactionRows, completedOrderRows] =
      await Promise.all([
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
        // Completed orders within the same window, by completedDate — a
        // separate axis from the scheduledDate-based query above, since a
        // job can be scheduled in one period and actually completed in
        // another.
        db
          .select({ order: orders })
          .from(orders)
          .innerJoin(customers, eq(orders.customerId, customers.id))
          .where(
            and(
              eq(customers.userId, userId),
              eq(orders.status, "completed"),
              gte(orders.completedDate, windowStart),
              lt(orders.completedDate, windowEnd),
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
    const completedOrders = completedOrderRows.map((row) => row.order);

    let nextAppointment: Dashboard["nextAppointment"] = null;
    if (next) {
      const totalPaid = await getTotalPaidForOrder(next.order.id);
      nextAppointment = {
        ...toOrderResponse(next.order, next.customer),
        amountRemaining: computeAmountRemaining(next.order.price, totalPaid),
        customerAddress: buildShortAddress(next.customer),
      };
    }

    const dashboard: Dashboard = {
      nextAppointment,
      upcomingAppointments: upcoming.map((row) => toOrderResponse(row.order, row.customer)),
      week: {
        madeRevenue: sumMadeRevenue(revenueTransactions, week),
        expectedRevenue: sumExpectedRevenue(revenueOrders, week),
      },
      month: {
        madeRevenue: sumMadeRevenue(revenueTransactions, month),
        expectedRevenue: sumExpectedRevenue(revenueOrders, month),
      },
      year: {
        madeRevenue: sumMadeRevenue(revenueTransactions, year),
        expectedRevenue: sumExpectedRevenue(revenueOrders, year),
      },
      completedOrders: {
        week: countCompletedOrders(completedOrders, week),
        month: countCompletedOrders(completedOrders, month),
        year: countCompletedOrders(completedOrders, year),
      },
    };

    res.json({ dashboard });
  } catch (error) {
    next(error);
  }
});
