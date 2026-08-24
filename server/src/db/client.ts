import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../config/env";
import * as schema from "./schema";

if (!env.databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Copy server/.env.example to server/.env and provide your Supabase database connection string.",
  );
}

// prepare: false is required for Supabase's transaction pooler (pgbouncer) and
// is also safe against a direct/session connection, so it is used unconditionally.
export const queryClient = postgres(env.databaseUrl, { prepare: false });

export const db = drizzle(queryClient, { schema });
