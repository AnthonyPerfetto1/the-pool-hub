import { eq, sql } from "drizzle-orm";
import { db } from "./client";
import { transactions } from "./schema";

// Postgres performs the SUM using its exact numeric type; the result is
// returned as a decimal string, never a JS float.
export async function getTotalPaidForOrder(orderId: string): Promise<string> {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
    .from(transactions)
    .where(eq(transactions.orderId, orderId));
  return row?.total ?? "0";
}
