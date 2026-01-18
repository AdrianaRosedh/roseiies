import { headers } from "next/headers";

export type TenantContext = { tenantId: string; defaultLang: string };

export async function getTenantContext(): Promise<TenantContext> {
  const h = await headers();
  const tenantId = h.get("x-tenant-id");
  const defaultLang = h.get("x-tenant-default-lang") ?? "es";

  if (!tenantId) {
    // Helpful error for dev + onboarding
    throw new Error(
      [
        "Missing x-tenant-id.",
        "Fix: ensure proxy.ts sets it OR set NEXT_PUBLIC_DEV_TENANT_ID in apps/tenant/.env.local.",
        "If using DB resolution: add hostname row in tenant_domains.",
      ].join(" ")
    );
  }

  return { tenantId, defaultLang };
}
