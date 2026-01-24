// apps/studio/app/lib/server/tenant-auth.ts

import { createServerSupabase } from "@roseiies/supabase/server";

async function resolveTenantIdFromSlug(args: { supabase: any; slug: string }) {
  const { supabase, slug } = args;

  const candidates: Array<"id" | "primary_domain" | "name"> = ["id", "primary_domain", "name"];

  for (const col of candidates) {
    const { data, error } = await supabase
      .from("tenants")
      .select("id")
      .eq(col, slug)
      .limit(1)
      .maybeSingle();

    if (!error && data?.id) return data.id as string;
  }

  return null;
}

/**
 * Resolve tenant from:
 * 1) tenant_domains by Host (production)
 * 2) dev localhost fallback:
 *    - ROSEIIES_DEV_TENANT_ID (uuid) OR
 *    - NEXT_PUBLIC_DEV_TENANT_ID (slug, e.g. "olivea") -> resolves via tenants table
 * 3) optional dev escape hatch: ?tenantId= query param
 */
export async function resolveTenantFromReq(req: Request) {
  const url = new URL(req.url);

  const host = (
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    ""
  )
    .toLowerCase()
    .split(":")[0];

  // Optional dev escape hatch
  const qTenant = url.searchParams.get("tenantId");
  if (process.env.NODE_ENV === "development" && qTenant) {
    return { tenantId: qTenant, host, mode: "query" as const };
  }

  const isLocal =
   host === "localhost" ||
   host === "127.0.0.1" ||
   host.endsWith(".localhost") ||
   host.endsWith("-localhost") ||
   host.includes("localhost");

  if (process.env.NODE_ENV === "development" && isLocal) {
    // 1) UUID fallback (preferred)
    const devTenantUuid = process.env.ROSEIIES_DEV_TENANT_ID;
    if (devTenantUuid) {
      return { tenantId: devTenantUuid, host, mode: "dev_env_uuid" as const };
    }

    // 2) Slug fallback
    const devTenantSlug = process.env.NEXT_PUBLIC_DEV_TENANT_ID;
    if (devTenantSlug) {
      const supabase = createServerSupabase();
      const tenantId = await resolveTenantIdFromSlug({
        supabase,
        slug: devTenantSlug,
      });
      if (tenantId) {
        return { tenantId, host, mode: "dev_env_slug" as const };
      }
    }
  }

  // Production path: tenant_domains lookup
  if (!host) {
    return { tenantId: null as string | null, host, mode: "none" as const };
  }

  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from("tenant_domains")
    .select("tenant_id")
    .eq("hostname", host)
    .limit(1)
    .maybeSingle();

  if (error || !data?.tenant_id) {
    return { tenantId: null as string | null, host, mode: "domain" as const };
  }

  return { tenantId: data.tenant_id as string, host, mode: "domain" as const };
}

/**
 * Studio write gate:
 * - Prefer ROSEIIES_STUDIO_TOKEN (server-only)
 * - Allow NEXT_PUBLIC_ROSEIIES_STUDIO_TOKEN as dev fallback (since client sends it)
 */
export function requireStudioToken(req: Request) {
  const token = req.headers.get("x-roseiies-studio-token");

  const expected =
    process.env.ROSEIIES_STUDIO_TOKEN ??
    process.env.NEXT_PUBLIC_ROSEIIES_STUDIO_TOKEN;

  if (!expected || !token || token !== expected) {
    return { ok: false as const };
  }
  return { ok: true as const };
}
