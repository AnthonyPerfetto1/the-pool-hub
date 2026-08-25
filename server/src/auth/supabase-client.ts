import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env";

let client: SupabaseClient | null = null;

// Lazily constructed: this is imported by the auth middleware, which is
// wired into the app unconditionally, so throwing at import time would
// prevent the whole server (including /api/v1/health) from starting when
// Supabase env vars aren't configured. The error surfaces only when a
// request actually needs authentication.
export function getSupabaseClient(): SupabaseClient {
  if (client) {
    return client;
  }

  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set to verify authentication. Copy server/.env.example to server/.env and provide your Supabase project values.",
    );
  }

  client = createClient(env.supabaseUrl, env.supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return client;
}
