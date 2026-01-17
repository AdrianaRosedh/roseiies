import { NextResponse, type NextRequest } from "next/server";
import { resolveTenantFromHost } from "@roseiies/core";

export function proxy(req: NextRequest) {
  const hostname = req.headers.get("host") ?? "";
  const tenantId = resolveTenantFromHost(hostname);

  // If no tenant found, do NOT rewrite/redirect in dev — just continue.
  // (We can add a branded 404 later.)
  const headers = new Headers(req.headers);
  if (tenantId) headers.set("x-tenant-id", tenantId);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/|api/|favicon.ico).*)"]
};