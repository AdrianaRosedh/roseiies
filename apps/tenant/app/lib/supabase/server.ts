// apps/tenant/app/lib/supabase/server.ts
import { createServerSupabase as createRoseiiesServerSupabase } from "@roseiies/supabase/server";

/**
 * Tenant-side server Supabase client.
 * Uses the shared Roseiies helper so env + cookies behavior stays consistent.
 */
export function createServerSupabase() {
  return createRoseiiesServerSupabase();
}
