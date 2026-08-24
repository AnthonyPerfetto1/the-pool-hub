type NodeEnv = "development" | "production" | "test";

function getNodeEnv(): NodeEnv {
  const value = process.env.NODE_ENV;
  if (value === "production" || value === "test") {
    return value;
  }
  return "development";
}

function getPort(): number {
  const value = process.env.PORT;
  const parsed = value ? Number(value) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 3000;
}

function getCorsOrigin(): string | string[] {
  const raw = process.env.CORS_ORIGIN;
  if (!raw) {
    return "http://localhost:5173";
  }
  const origins = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length > 1 ? origins : origins[0];
}

export const env = {
  nodeEnv: getNodeEnv(),
  port: getPort(),
  corsOrigin: getCorsOrigin(),
  databaseUrl: process.env.DATABASE_URL,
  // Not yet consumed by application code (Supabase Auth isn't wired up
  // this phase). Read here so config stays centralized as it's needed.
  supabaseUrl: process.env.SUPABASE_URL,
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
};

export const isProduction = env.nodeEnv === "production";
