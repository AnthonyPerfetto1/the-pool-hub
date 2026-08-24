import { relations } from "drizzle-orm";
import { index, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// profiles.id references auth.users(id), a table in Supabase's "auth" schema
// that Drizzle does not manage. No .references() is declared for it here.
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  companyName: text("company_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    street: text("street"),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    poolSize: text("pool_size"),
    notes: text("notes"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("customers_user_id_idx").on(table.userId),
    index("customers_name_idx").on(table.name),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    orderType: text("order_type").notNull().$type<"opening" | "closing">(),
    scheduledDate: timestamp("scheduled_date", { withTimezone: true }).notNull(),
    completedDate: timestamp("completed_date", { withTimezone: true }),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    status: text("status")
      .notNull()
      .default("scheduled")
      .$type<"scheduled" | "completed" | "cancelled">(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("orders_customer_id_idx").on(table.customerId),
    index("orders_scheduled_date_idx").on(table.scheduledDate),
    index("orders_status_idx").on(table.status),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull(),
    paymentMethod: text("payment_method")
      .notNull()
      .$type<"cash" | "check" | "card" | "other">(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("transactions_order_id_idx").on(table.orderId),
    index("transactions_transaction_date_idx").on(table.transactionDate),
  ],
);

export const profilesRelations = relations(profiles, ({ many }) => ({
  customers: many(customers),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [customers.userId],
    references: [profiles.id],
  }),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  order: one(orders, {
    fields: [transactions.orderId],
    references: [orders.id],
  }),
}));
