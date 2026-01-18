import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// tiny in-memory cache (good enough for v0; later use KV/Edge cache)
const cache = new Map<string, { id: string; defaultLang: string; t: number }>();
const TTL_MS = 60_000;

export async function resolveTenantByHost(hostname: string) {
  const key = hostname.toLowerCase();
  const now = Date.now();

  const hit = cache.get(key);
  if (hit && now - hit.t < TTL_MS) return { id: hit.id, defaultLang: hit.defaultLang };

  // dev convenience: allow overriding
  const devTenant = process.env.NEXT_PUBLIC_DEV_TENANT_ID;
  if (hostname.includes("localhost") && devTenant) {
    const v = { id: devTenant, defaultLang: "es" };
    cache.set(key, { ...v, t: now });
    return v;
  }

  const { data, error } = await supabase
    .from("tenant_domains")
    .select("tenant_id, tenants(default_lang)")
    .eq("hostname", key)
    .maybeSingle();

  if (error || !data) return null;

  const v = {
    id: data.tenant_id as string,
    defaultLang: (data.tenants as any)?.default_lang ?? "es",
  };

  cache.set(key, { ...v, t: now });
  return v;
}
