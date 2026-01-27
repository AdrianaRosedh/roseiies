import { createClient } from "@supabase/supabase-js";

export function createBrowserSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: "roseiies" },
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    }
  );
}
