import { headers } from "next/headers";

export function getTenantContext() {
  const h = headers();
  const tenantId = h.get("x-tenant-id");
  const defaultLang = h.get("x-tenant-default-lang") ?? "es";

  if (!tenantId) {
    throw new Error("Tenant not resolved. Is middleware running and matcher correct?");
  }

  return { tenantId, defaultLang };
}
