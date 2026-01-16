import { headers } from "next/headers";
import { getTenantTheme } from "@roseiies/core";

export async function getRequestTenantId(): Promise<string> {
  const h = await headers();
  return h.get("x-tenant-id") ?? "unknown";
}

export async function getRequestTheme() {
  const tenantId = await getRequestTenantId();
  return getTenantTheme(tenantId);
}