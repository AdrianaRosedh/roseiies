import { NextResponse, type NextRequest } from "next/server";
import { resolveTenantByHost } from "./app/lib/tenant/resolveTenantByHost";

export async function proxy(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const resolved = await resolveTenantByHost(host);

  const headers = new Headers(req.headers);

  if (resolved) {
    headers.set("x-tenant-id", resolved.tenantId);
    headers.set("x-tenant-default-lang", resolved.defaultLang);
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/|api/|favicon.ico).*)"],
};
