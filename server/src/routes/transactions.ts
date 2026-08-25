import type { PaymentMethod, Transaction as TransactionContract } from "@the-pool-hub/types";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import type { Request } from "express";
import { Router } from "express";
import { db } from "../db/client";
import { getTotalPaidForOrder } from "../db/order-totals";
import { customers, orders, transactions } from "../db/schema";
import { getAuthenticatedUserId, requireAuth } from "../middleware/auth";
import { HttpError } from "../middleware/error-handler";
import { centsToDecimalString, parseMonetaryValue, toCents } from "../utils/money";
import { isUuid, parseOptionalString } from "../utils/validation";

export const transactionsRouter = Router();

type Transaction = typeof transactions.$inferSelect;

const PAYMENT_METHODS = ["cash", "check", "card", "other"] as const;

function toTransactionResponse(transaction: Transaction): TransactionContract {
  return {
    id: transaction.id,
    orderId: transaction.orderId,
    amount: transaction.amount,
    transactionDate: transaction.transactionDate.toISOString(),
    paymentMethod: transaction.paymentMethod,
    notes: transaction.notes,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
  };
}

function parsePaymentMethod(value: unknown): PaymentMethod {
  if (typeof value !== "string" || !PAYMENT_METHODS.includes(value as PaymentMethod)) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      `paymentMethod must be one of: ${PAYMENT_METHODS.join(", ")}.`,
    );
  }
  return value as PaymentMethod;
}

function parseTransactionDate(value: unknown): Date {
  if (typeof value !== "string") {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "transactionDate must be an ISO 8601 date-time string.",
    );
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, "VALIDATION_ERROR", "transactionDate must be a valid date-time.");
  }
  return date;
}

interface CreateTransactionData {
  orderId: string;
  amount: string;
  transactionDate: Date;
  paymentMethod: PaymentMethod;
  notes: string | null;
}

function parseCreateTransactionInput(body: unknown): CreateTransactionData {
  if (typeof body !== "object" || body === null) {
    throw new HttpError(400, "VALIDATION_ERROR", "Request body must be an object.");
  }
  const raw = body as Record<string, unknown>;

  if (typeof raw.orderId !== "string" || !isUuid(raw.orderId)) {
    throw new HttpError(400, "VALIDATION_ERROR", "orderId must be a valid order id.");
  }

  return {
    orderId: raw.orderId,
    amount: parseMonetaryValue(raw.amount, "amount", { allowZero: false }),
    transactionDate: parseTransactionDate(raw.transactionDate),
    paymentMethod: parsePaymentMethod(raw.paymentMethod),
    notes: raw.notes !== undefined ? parseOptionalString(raw.notes, "notes") : null,
  };
}

interface UpdateTransactionData {
  amount?: string;
  transactionDate?: Date;
  paymentMethod?: PaymentMethod;
  notes?: string | null;
}

// orderId is intentionally never read here: a transaction must remain
// attached to the same order, so the field simply isn't part of the update
// vocabulary (client-supplied orderId/id/ownership values are ignored, not
// rejected, matching the pattern already used by customers/orders PATCH).
function parseUpdateTransactionInput(body: unknown): UpdateTransactionData {
  if (typeof body !== "object" || body === null) {
    throw new HttpError(400, "VALIDATION_ERROR", "Request body must be an object.");
  }
  const raw = body as Record<string, unknown>;
  const updates: UpdateTransactionData = {};

  if (raw.amount !== undefined) {
    updates.amount = parseMonetaryValue(raw.amount, "amount", { allowZero: false });
  }
  if (raw.transactionDate !== undefined) {
    updates.transactionDate = parseTransactionDate(raw.transactionDate);
  }
  if (raw.paymentMethod !== undefined) {
    updates.paymentMethod = parsePaymentMethod(raw.paymentMethod);
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

interface ListQuery {
  orderId?: string;
  customerId?: string;
  transactionDateFrom?: Date;
  transactionDateTo?: Date;
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
  const orderId =
    typeof query.orderId === "string" && isUuid(query.orderId) ? query.orderId : undefined;
  const customerId =
    typeof query.customerId === "string" && isUuid(query.customerId)
      ? query.customerId
      : undefined;

  return {
    orderId,
    customerId,
    transactionDateFrom: parseDateFilter(query.transactionDateFrom),
    transactionDateTo: parseDateFilter(query.transactionDateTo),
    page: parsePositiveInt(query.page, 1),
    limit: Math.min(parsePositiveInt(query.limit, DEFAULT_LIMIT), MAX_LIMIT),
  };
}

// GET /transactions?orderId=&customerId=&transactionDateFrom=&transactionDateTo=&page=&limit=
// Ownership is enforced via a join through orders -> customers, since neither
// transactions nor orders carry a user_id column of their own.
transactionsRouter.get("/transactions", requireAuth, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { orderId, customerId, transactionDateFrom, transactionDateTo, page, limit } =
      parseListQuery(req.query);

    const conditions = [eq(customers.userId, userId)];
    if (orderId) conditions.push(eq(transactions.orderId, orderId));
    if (customerId) conditions.push(eq(orders.customerId, customerId));
    if (transactionDateFrom) conditions.push(gte(transactions.transactionDate, transactionDateFrom));
    if (transactionDateTo) conditions.push(lte(transactions.transactionDate, transactionDateTo));

    const rows = await db
      .select({ transaction: transactions })
      .from(transactions)
      .innerJoin(orders, eq(transactions.orderId, orders.id))
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(and(...conditions))
      .orderBy(desc(transactions.transactionDate))
      .limit(limit)
      .offset((page - 1) * limit);

    res.json({
      transactions: rows.map((row) => toTransactionResponse(row.transaction)),
      page,
      limit,
    });
  } catch (error) {
    next(error);
  }
});

transactionsRouter.post("/transactions", requireAuth, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const input = parseCreateTransactionInput(req.body);

    const [row] = await db
      .select({ order: orders, customer: customers })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(and(eq(orders.id, input.orderId), eq(customers.userId, userId)))
      .limit(1);

    if (!row || row.customer.archivedAt) {
      next(
        new HttpError(
          400,
          "VALIDATION_ERROR",
          "orderId must reference an order belonging to an active customer of your account.",
        ),
      );
      return;
    }

    const totalPaid = await getTotalPaidForOrder(input.orderId);
    const remainingCents = Math.max(toCents(row.order.price) - toCents(totalPaid), 0);
    const amountCents = toCents(input.amount);

    if (amountCents > remainingCents) {
      next(
        new HttpError(
          400,
          "VALIDATION_ERROR",
          `amount exceeds the remaining balance of ${centsToDecimalString(remainingCents)}.`,
        ),
      );
      return;
    }

    const [created] = await db
      .insert(transactions)
      .values({
        orderId: input.orderId,
        amount: input.amount,
        transactionDate: input.transactionDate,
        paymentMethod: input.paymentMethod,
        notes: input.notes,
      })
      .returning();

    res.status(201).json({ transaction: toTransactionResponse(created) });
  } catch (error) {
    next(error);
  }
});

transactionsRouter.get<{ id: string }>(
  "/transactions/:id",
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = getAuthenticatedUserId(req);
      const { id } = req.params;

      if (!isUuid(id)) {
        next(new HttpError(404, "TRANSACTION_NOT_FOUND", "Transaction not found."));
        return;
      }

      const [row] = await db
        .select({ transaction: transactions })
        .from(transactions)
        .innerJoin(orders, eq(transactions.orderId, orders.id))
        .innerJoin(customers, eq(orders.customerId, customers.id))
        .where(and(eq(transactions.id, id), eq(customers.userId, userId)))
        .limit(1);

      if (!row) {
        next(new HttpError(404, "TRANSACTION_NOT_FOUND", "Transaction not found."));
        return;
      }

      res.json({ transaction: toTransactionResponse(row.transaction) });
    } catch (error) {
      next(error);
    }
  },
);

// Archived-customer orders are intentionally NOT blocked here: that rule
// only prevents *new* work (POST) against an archived customer. Editing an
// already-existing transaction is analogous to editing an already-existing
// order, which Phase 4 deliberately allows regardless of customer archive
// status (only order.status === "cancelled" blocks order edits).
transactionsRouter.patch<{ id: string }>(
  "/transactions/:id",
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = getAuthenticatedUserId(req);
      const { id } = req.params;

      if (!isUuid(id)) {
        next(new HttpError(404, "TRANSACTION_NOT_FOUND", "Transaction not found."));
        return;
      }

      const updates = parseUpdateTransactionInput(req.body);

      const [existing] = await db
        .select({ transaction: transactions, order: orders })
        .from(transactions)
        .innerJoin(orders, eq(transactions.orderId, orders.id))
        .innerJoin(customers, eq(orders.customerId, customers.id))
        .where(and(eq(transactions.id, id), eq(customers.userId, userId)))
        .limit(1);

      if (!existing) {
        next(new HttpError(404, "TRANSACTION_NOT_FOUND", "Transaction not found."));
        return;
      }

      if (updates.amount !== undefined) {
        // Remaining balance recalculated with this transaction's *current*
        // amount excluded, since we're about to replace it.
        const totalPaidCents = toCents(await getTotalPaidForOrder(existing.order.id));
        const totalPaidExcludingThis = totalPaidCents - toCents(existing.transaction.amount);
        const remainingExcludingThis = Math.max(
          toCents(existing.order.price) - totalPaidExcludingThis,
          0,
        );
        const newAmountCents = toCents(updates.amount);

        if (newAmountCents > remainingExcludingThis) {
          next(
            new HttpError(
              400,
              "VALIDATION_ERROR",
              `amount exceeds the remaining balance of ${centsToDecimalString(remainingExcludingThis)}.`,
            ),
          );
          return;
        }
      }

      const [updated] = await db
        .update(transactions)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(transactions.id, id))
        .returning();

      res.json({ transaction: toTransactionResponse(updated) });
    } catch (error) {
      next(error);
    }
  },
);
