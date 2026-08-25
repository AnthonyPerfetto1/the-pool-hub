import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set. Copy apps/web/.env.example to apps/web/.env.",
  );
}

// The browser client persists sessions to localStorage and auto-refreshes
// tokens by default — no custom storage adapter needed on web.
export const supabase = createClient(supabaseUrl, supabasePublishableKey);
