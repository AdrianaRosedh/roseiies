import { getTenantContext } from "./getTenantContext";
import { getTenantTheme } from "@roseiies/core";

export async function getRequestTheme() {
  const { tenantId } = await getTenantContext();
  return getTenantTheme(tenantId);
}
