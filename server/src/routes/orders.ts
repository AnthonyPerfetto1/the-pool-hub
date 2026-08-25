import type { Order as OrderContract, OrderStatus, OrderType } from "@the-pool-hub/types";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import type { Request } from "express";
import { Router } from "express";
import { db } from "../db/client";
import { getTotalPaidForOrder } from "../db/order-totals";
import { customers, orders } from "../db/schema";
import { getAuthenticatedUserId, requireAuth } from "../middleware/auth";
import { HttpError } from "../middleware/error-handler";
import { centsToDecimalString, parseMonetaryValue, toCents } from "../utils/money";
import { isUuid, parseOptionalString } from "../utils/validation";

export const ordersRouter = Router();

type Order = typeof orders.$inferSelect;
type Customer = typeof customers.$inferSelect;

const ORDER_TYPES = ["opening", "closing"] as const;

function toOrderResponse(order: Order, customer: Customer): OrderContract {
  return {
    id: order.id,
    customerId: order.customerId,
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
    },
    orderType: order.orderType,
    scheduledDate: order.scheduledDate.toISOString(),
    completedDate: order.completedDate ? order.completedDate.toISOString() : null,
    price: order.price,
    status: order.status,
    notes: order.notes,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

function parseOrderType(value: unknown): OrderType {
  if (typeof value !== "string" || !ORDER_TYPES.includes(value as OrderType)) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      `orderType must be one of: ${ORDER_TYPES.join(", ")}.`,
    );
  }
  return value as OrderType;
}

function parseScheduledDate(value: unknown): Date {
  if (typeof value !== "string") {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "scheduledDate must be an ISO 8601 date-time string.",
    );
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, "VALIDATION_ERROR", "scheduledDate must be a valid date-time.");
  }
  return date;
}

interface CreateOrderData {
  customerId: string;
  orderType: OrderType;
  scheduledDate: Date;
  price: string;
  notes: string | null;
}

function parseCreateOrderInput(body: unknown): CreateOrderData {
  if (typeof body !== "object" || body === null) {
    throw new HttpError(400, "VALIDATION_ERROR", "Request body must be an object.");
  }
  const raw = body as Record<string, unknown>;

  if (typeof raw.customerId !== "string" || !isUuid(raw.customerId)) {
    throw new HttpError(400, "VALIDATION_ERROR", "customerId must be a valid customer id.");
  }

  return {
    customerId: raw.customerId,
    orderType: parseOrderType(raw.orderType),
    scheduledDate: parseScheduledDate(raw.scheduledDate),
    price: parseMonetaryValue(raw.price, "price", { allowZero: true }),
    notes: raw.notes !== undefined ? parseOptionalString(raw.notes, "notes") : null,
  };
}

interface UpdateOrderData {
  orderType?: OrderType;
  scheduledDate?: Date;
  price?: string;
  notes?: string | null;
}

function parseUpdateOrderInput(body: unknown): UpdateOrderData {
  if (typeof body !== "object" || body === null) {
    throw new HttpError(400, "VALIDATION_ERROR", "Request body must be an object.");
  }
  const raw = body as Record<string, unknown>;
  const updates: UpdateOrderData = {};

  if (raw.orderType !== undefined) {
    updates.orderType = parseOrderType(raw.orderType);
  }
  if (raw.scheduledDate !== undefined) {
    updates.scheduledDate = parseScheduledDate(raw.scheduledDate);
  }
  if (raw.price !== undefined) {
    updates.price = parseMonetaryValue(raw.price, "price", { allowZero: true });
  }
  if (raw.notes !== undefined) {
    updates.notes = parseOptionalString(raw.notes, "notes");
  }

  if (Object.keys(updates).length === 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "At least one field must be provided.");
  }

  return updates;
}

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const ORDER_STATUSES = ["scheduled", "completed", "cancelled"] as const;

interface ListQuery {
  status?: OrderStatus;
  orderType?: OrderType;
  customerId?: string;
  scheduledFrom?: Date;
  scheduledTo?: Date;
  page: number;
  limit: number;
}

function parsePositiveInt(value: unknown, fallback: number): number {
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = Number(value);
    if (parsed > 0) {
      return parsed;
    }
  }
  return fallback;
}

function parseDateFilter(value: unknown): Date | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseListQuery(query: Request["query"]): ListQuery {
  const status =
    typeof query.status === "string" && ORDER_STATUSES.includes(query.status as OrderStatus)
      ? (query.status as OrderStatus)
      : undefined;

  const orderType =
    typeof query.orderType === "string" && ORDER_TYPES.includes(query.orderType as OrderType)
      ? (query.orderType as OrderType)
      : undefined;

  const customerId =
    typeof query.customerId === "string" && isUuid(query.customerId)
      ? query.customerId
      : undefined;

  return {
    status,
    orderType,
    customerId,
    scheduledFrom: parseDateFilter(query.scheduledFrom),
    scheduledTo: parseDateFilter(query.scheduledTo),
    page: parsePositiveInt(query.page, 1),
    limit: Math.min(parsePositiveInt(query.limit, DEFAULT_LIMIT), MAX_LIMIT),
  };
}

// GET /orders?status=&orderType=&customerId=&scheduledFrom=&scheduledTo=&page=&limit=
// Ownership is enforced via the customers join since orders has no user_id
// column of its own — ownership flows through the customer relationship.
// Sorted by scheduledDate ascending (soonest job first), which is more useful
// for a job-scheduling list than insertion order.
ordersRouter.get("/orders", requireAuth, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { status, orderType, customerId, scheduledFrom, scheduledTo, page, limit } =
      parseListQuery(req.query);

    const conditions = [eq(customers.userId, userId)];
    if (status) conditions.push(eq(orders.status, status));
    if (orderType) conditions.push(eq(orders.orderType, orderType));
    if (customerId) conditions.push(eq(orders.customerId, customerId));
    if (scheduledFrom) conditions.push(gte(orders.scheduledDate, scheduledFrom));
    if (scheduledTo) conditions.push(lte(orders.scheduledDate, scheduledTo));

    const rows = await db
      .select({ order: orders, customer: customers })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(and(...conditions))
      .orderBy(asc(orders.scheduledDate))
      .limit(limit)
      .offset((page - 1) * limit);

    res.json({
      orders: rows.map((row) => toOrderResponse(row.order, row.customer)),
      page,
      limit,
    });
  } catch (error) {
    next(error);
  }
});

ordersRouter.post("/orders", requireAuth, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const input = parseCreateOrderInput(req.body);

    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, input.customerId), eq(customers.userId, userId)))
      .limit(1);

    if (!customer || customer.archivedAt) {
      next(
        new HttpError(
          400,
          "VALIDATION_ERROR",
          "customerId must reference an active customer belonging to your account.",
        ),
      );
      return;
    }

    const [created] = await db
      .insert(orders)
      .values({
        customerId: input.customerId,
        orderType: input.orderType,
        scheduledDate: input.scheduledDate,
        price: input.price,
        notes: input.notes,
      })
      .returning();

    res.status(201).json({ order: toOrderResponse(created, customer) });
  } catch (error) {
    next(error);
  }
});

ordersRouter.get<{ id: string }>("/orders/:id", requireAuth, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { id } = req.params;

    if (!isUuid(id)) {
      next(new HttpError(404, "ORDER_NOT_FOUND", "Order not found."));
      return;
    }

    const [row] = await db
      .select({ order: orders, customer: customers })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(and(eq(orders.id, id), eq(customers.userId, userId)))
      .limit(1);

    if (!row) {
      next(new HttpError(404, "ORDER_NOT_FOUND", "Order not found."));
      return;
    }

    const totalPaidCents = toCents(await getTotalPaidForOrder(row.order.id));
    const totalPaid = centsToDecimalString(totalPaidCents);
    const amountRemaining = centsToDecimalString(
      Math.max(toCents(row.order.price) - totalPaidCents, 0),
    );

    res.json({
      order: { ...toOrderResponse(row.order, row.customer), totalPaid, amountRemaining },
    });
  } catch (error) {
    next(error);
  }
});

ordersRouter.patch<{ id: string }>("/orders/:id", requireAuth, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { id } = req.params;

    if (!isUuid(id)) {
      next(new HttpError(404, "ORDER_NOT_FOUND", "Order not found."));
      return;
    }

    const updates = parseUpdateOrderInput(req.body);

    const [existing] = await db
      .select({ order: orders, customer: customers })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(and(eq(orders.id, id), eq(customers.userId, userId)))
      .limit(1);

    if (!existing) {
      next(new HttpError(404, "ORDER_NOT_FOUND", "Order not found."));
      return;
    }

    if (existing.order.status === "cancelled") {
      next(new HttpError(400, "VALIDATION_ERROR", "Cancelled orders cannot be edited."));
      return;
    }

    const [updated] = await db
      .update(orders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();

    res.json({ order: toOrderResponse(updated, existing.customer) });
  } catch (error) {
    next(error);
  }
});

ordersRouter.patch<{ id: string }>(
  "/orders/:id/complete",
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = getAuthenticatedUserId(req);
      const { id } = req.params;

      if (!isUuid(id)) {
        next(new HttpError(404, "ORDER_NOT_FOUND", "Order not found."));
        return;
      }

      const [existing] = await db
        .select({ order: orders, customer: customers })
        .from(orders)
        .innerJoin(customers, eq(orders.customerId, customers.id))
        .where(and(eq(orders.id, id), eq(customers.userId, userId)))
        .limit(1);

      if (!existing) {
        next(new HttpError(404, "ORDER_NOT_FOUND", "Order not found."));
        return;
      }

      if (existing.order.status === "cancelled") {
        next(new HttpError(400, "VALIDATION_ERROR", "Cancelled orders cannot be completed."));
        return;
      }

      if (existing.order.status === "completed") {
        res.json({ order: toOrderResponse(existing.order, existing.customer) });
        return;
      }

      const [completed] = await db
        .update(orders)
        .set({ status: "completed", completedDate: new Date(), updatedAt: new Date() })
        .where(eq(orders.id, id))
        .returning();

      res.json({ order: toOrderResponse(completed, existing.customer) });
    } catch (error) {
      next(error);
    }
  },
);

ordersRouter.patch<{ id: string }>("/orders/:id/cancel", requireAuth, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { id } = req.params;

    if (!isUuid(id)) {
      next(new HttpError(404, "ORDER_NOT_FOUND", "Order not found."));
      return;
    }

    const [existing] = await db
      .select({ order: orders, customer: customers })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(and(eq(orders.id, id), eq(customers.userId, userId)))
      .limit(1);

    if (!existing) {
      next(new HttpError(404, "ORDER_NOT_FOUND", "Order not found."));
      return;
    }

    if (existing.order.status === "completed") {
      next(new HttpError(400, "VALIDATION_ERROR", "Completed orders cannot be cancelled."));
      return;
    }

    if (existing.order.status === "cancelled") {
      res.json({ order: toOrderResponse(existing.order, existing.customer) });
      return;
    }

    const [cancelled] = await db
      .update(orders)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();

    res.json({ order: toOrderResponse(cancelled, existing.customer) });
  } catch (error) {
    next(error);
  }
});
