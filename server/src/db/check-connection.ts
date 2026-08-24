import { db, queryClient } from "./client";
import { customers, orders, profiles, transactions } from "./schema";

// Development/verification script only. Not a public API endpoint.
// Confirms both raw connectivity and that each expected table is reachable
// through the Drizzle schema. Read-only; checks each table independently so
// one mismatched table doesn't hide the result for the others.
const tables = { profiles, customers, orders, transactions };

async function checkConnection(): Promise<void> {
  let hasFailure = false;

  for (const [name, table] of Object.entries(tables)) {
    try {
      await db.select().from(table).limit(1);
      console.log(`OK    ${name}`);
    } catch (error) {
      hasFailure = true;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`FAIL  ${name}: ${message}`);
    }
  }

  if (hasFailure) {
    console.error("\nDatabase connection check completed with failures.");
    process.exitCode = 1;
  } else {
    console.log("\nDatabase connection succeeded. All expected tables are reachable.");
  }

  await queryClient.end();
}

void checkConnection();
