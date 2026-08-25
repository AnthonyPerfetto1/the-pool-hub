import type { Customer as CustomerContract } from "@the-pool-hub/types";
import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";
import type { Request } from "express";
import { Router } from "express";
import { db } from "../db/client";
import { customers } from "../db/schema";
import { getAuthenticatedUserId, requireAuth } from "../middleware/auth";
import { HttpError } from "../middleware/error-handler";

export const customersRouter = Router();

type Customer = typeof customers.$inferSelect;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

function toCustomerResponse(customer: Customer): CustomerContract {
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    street: customer.street,
    city: customer.city,
    state: customer.state,
    zip: customer.zip,
    poolSize: customer.poolSize,
    notes: customer.notes,
    archivedAt: customer.archivedAt ? customer.archivedAt.toISOString() : null,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}

const OPTIONAL_STRING_FIELDS = [
  "phone",
  "email",
  "street",
  "city",
  "state",
  "zip",
  "poolSize",
  "notes",
] as const;

type OptionalStringField = (typeof OPTIONAL_STRING_FIELDS)[number];

function parseName(value: unknown): string {
  if (typeof value !== "string") {
    throw new HttpError(400, "VALIDATION_ERROR", "name must be a string.");
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "name is required.");
  }
  return trimmed;
}

function parseOptionalString(value: unknown, field: OptionalStringField): string | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} must be a string.`);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

interface CreateCustomerData {
  name: string;
  phone: string | null;
  email: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  poolSize: string | null;
  notes: string | null;
}

function parseCreateCustomerInput(body: unknown): CreateCustomerData {
  if (typeof body !== "object" || body === null) {
    throw new HttpError(400, "VALIDATION_ERROR", "Request body must be an object.");
  }
  const raw = body as Record<string, unknown>;

  const data: CreateCustomerData = {
    name: parseName(raw.name),
    phone: null,
    email: null,
    street: null,
    city: null,
    state: null,
    zip: null,
    poolSize: null,
    notes: null,
  };

  for (const field of OPTIONAL_STRING_FIELDS) {
    if (raw[field] !== undefined) {
      data[field] = parseOptionalString(raw[field], field);
    }
  }

  return data;
}

type UpdateCustomerData = Partial<CreateCustomerData>;

function parseUpdateCustomerInput(body: unknown): UpdateCustomerData {
  if (typeof body !== "object" || body === null) {
    throw new HttpError(400, "VALIDATION_ERROR", "Request body must be an object.");
  }
  const raw = body as Record<string, unknown>;
  const updates: UpdateCustomerData = {};

  if (raw.name !== undefined) {
    updates.name = parseName(raw.name);
  }

  for (const field of OPTIONAL_STRING_FIELDS) {
    if (raw[field] !== undefined) {
      updates[field] = parseOptionalString(raw[field], field);
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "At least one field must be provided.");
  }

  return updates;
}

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

interface ListQuery {
  search?: string;
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

function parseListQuery(query: Request["query"]): ListQuery {
  const searchRaw = query.search;
  const search =
    typeof searchRaw === "string" && searchRaw.trim().length > 0 ? searchRaw.trim() : undefined;

  const page = parsePositiveInt(query.page, 1);
  const limit = Math.min(parsePositiveInt(query.limit, DEFAULT_LIMIT), MAX_LIMIT);

  return { search, page, limit };
}

// GET /customers?search=&page=&limit= — active customers only, newest first.
// Pagination uses simple page/limit query params (documented in API.md as
// "potential" params) rather than a cursor-based scheme: the customer list
// for a single-business MVP is not expected to reach a size where offset
// pagination becomes a real performance problem.
customersRouter.get("/customers", requireAuth, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { search, page, limit } = parseListQuery(req.query);

    const conditions = [eq(customers.userId, userId), isNull(customers.archivedAt)];

    if (search) {
      const pattern = `%${search}%`;
      const searchCondition = or(
        ilike(customers.name, pattern),
        ilike(customers.email, pattern),
        ilike(customers.phone, pattern),
        ilike(customers.street, pattern),
        ilike(customers.city, pattern),
        ilike(customers.state, pattern),
        ilike(customers.zip, pattern),
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const rows = await db
      .select()
      .from(customers)
      .where(and(...conditions))
      .orderBy(desc(customers.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    res.json({
      customers: rows.map(toCustomerResponse),
      page,
      limit,
    });
  } catch (error) {
    next(error);
  }
});

customersRouter.post("/customers", requireAuth, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const input = parseCreateCustomerInput(req.body);

    const [created] = await db
      .insert(customers)
      .values({ ...input, userId })
      .returning();

    res.status(201).json({ customer: toCustomerResponse(created) });
  } catch (error) {
    next(error);
  }
});

customersRouter.get<{ id: string }>("/customers/:id", requireAuth, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { id } = req.params;

    if (!isUuid(id)) {
      next(new HttpError(404, "CUSTOMER_NOT_FOUND", "Customer not found."));
      return;
    }

    const [customer] = await db
      .select()
      .from(customers)
      .where(
        and(eq(customers.id, id), eq(customers.userId, userId), isNull(customers.archivedAt)),
      )
      .limit(1);

    if (!customer) {
      next(new HttpError(404, "CUSTOMER_NOT_FOUND", "Customer not found."));
      return;
    }

    res.json({ customer: toCustomerResponse(customer) });
  } catch (error) {
    next(error);
  }
});

customersRouter.patch<{ id: string }>("/customers/:id", requireAuth, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { id } = req.params;

    if (!isUuid(id)) {
      next(new HttpError(404, "CUSTOMER_NOT_FOUND", "Customer not found."));
      return;
    }

    const updates = parseUpdateCustomerInput(req.body);

    const [updated] = await db
      .update(customers)
      .set({ ...updates, updatedAt: new Date() })
      .where(
        and(eq(customers.id, id), eq(customers.userId, userId), isNull(customers.archivedAt)),
      )
      .returning();

    if (!updated) {
      next(new HttpError(404, "CUSTOMER_NOT_FOUND", "Customer not found."));
      return;
    }

    res.json({ customer: toCustomerResponse(updated) });
  } catch (error) {
    next(error);
  }
});

// Archiving is idempotent: re-archiving an already-archived customer returns
// its current state with 200 rather than erroring or bumping archivedAt again.
customersRouter.patch<{ id: string }>("/customers/:id/archive", requireAuth, async (req, res, next) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const { id } = req.params;

    if (!isUuid(id)) {
      next(new HttpError(404, "CUSTOMER_NOT_FOUND", "Customer not found."));
      return;
    }

    const [archived] = await db
      .update(customers)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(
        and(eq(customers.id, id), eq(customers.userId, userId), isNull(customers.archivedAt)),
      )
      .returning();

    if (archived) {
      res.json({ customer: toCustomerResponse(archived) });
      return;
    }

    const [existing] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.userId, userId)))
      .limit(1);

    if (existing?.archivedAt) {
      res.json({ customer: toCustomerResponse(existing) });
      return;
    }

    next(new HttpError(404, "CUSTOMER_NOT_FOUND", "Customer not found."));
  } catch (error) {
    next(error);
  }
});
