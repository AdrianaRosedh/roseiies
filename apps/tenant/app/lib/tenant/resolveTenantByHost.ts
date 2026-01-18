import { supabasePublic } from "@roseiies/supabase";

export type ResolvedTenant = {
  tenantId: string;
  defaultLang: string;
};

const CACHE = new Map<string, { v: ResolvedTenant; t: number }>();
const TTL_MS = 60_000;

export async function resolveTenantByHost(hostHeader: string): Promise<ResolvedTenant | null> {
  const hostname = (hostHeader ?? "").toLowerCase().split(":")[0];
  const now = Date.now();

  // ✅ Treat any local dev host as "dev"
  const isDevHost =
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname.includes("localhost"); // allows olivea-localhost

  if (isDevHost && process.env.NEXT_PUBLIC_DEV_TENANT_ID) {
    return {
      tenantId: process.env.NEXT_PUBLIC_DEV_TENANT_ID,
      defaultLang: process.env.NEXT_PUBLIC_DEV_TENANT_LANG ?? "es",
    };
  }

  const hit = CACHE.get(hostname);
  if (hit && now - hit.t < TTL_MS) return hit.v;

  const supabase = supabasePublic();

  const { data, error } = await supabase
    .from("tenant_domains")
    .select("tenant_id, tenants(default_lang)")
    .eq("hostname", hostname)
    .maybeSingle();

  if (error || !data) return null;

  const resolved: ResolvedTenant = {
    tenantId: data.tenant_id as string,
    defaultLang: (data.tenants as any)?.default_lang ?? "es",
  };

  CACHE.set(hostname, { v: resolved, t: now });
  return resolved;
}
