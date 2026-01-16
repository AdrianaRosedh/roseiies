import { NextResponse, type NextRequest } from "next/server";
import { resolveTenantFromHost } from "@roseiies/core";

const ALWAYS_ALLOW_PREFIXES = ["/_next", "/images", "/icons", "/favicon.ico"];

function alwaysAllowed(pathname: string) {
  return ALWAYS_ALLOW_PREFIXES.some((p) => pathname.startsWith(p));
}

export function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") ?? "";
  const tenantId = resolveTenantFromHost(hostname);

  if (!tenantId) {
    url.pathname = "/_tenant/not-found";
    return NextResponse.rewrite(url);
  }

  // Make tenant id available to server components
  const headers = new Headers(req.headers);
  headers.set("x-tenant-id", tenantId);

  const pathname = url.pathname;

  if (alwaysAllowed(pathname)) {
    return NextResponse.next({ request: { headers } });
  }

  const isPublic = pathname === "/garden" || pathname.startsWith("/garden/");
  const isApp = pathname === "/app" || pathname.startsWith("/app/");

  if (isPublic) {
    return NextResponse.next({ request: { headers } });
  }

  if (isApp) {
    // TEMP auth: cookie exists = signed in (replace with Supabase later)
    const session = req.cookies.get("rs_session")?.value;
    if (!session) {
      url.pathname = "/signin";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request: { headers } });
  }

  url.pathname = "/garden";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api).*)"]
};