import { headers } from "next/headers";
import { supabasePublic } from "@roseiies/supabase";

export type PortalContext = {
  tenantId: string;
  tenantName: string;
  userLabel: string;
  defaultLang: string;
};

function normalizeHost(hostHeader: string) {
  return (hostHeader ?? "").toLowerCase().split(":")[0];
}

function isLocalHost(host: string) {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".local") ||
    host.includes("localhost")
  );
}

export async function getPortalContext(): Promise<PortalContext> {
  const h = await headers();
  const host = normalizeHost(h.get("host") ?? "");

  const devTenantId = process.env.NEXT_PUBLIC_DEV_TENANT_ID ?? null;
  const devLang = process.env.NEXT_PUBLIC_DEV_TENANT_LANG ?? "es";

  const sb = supabasePublic();

  let tenantId: string | null = null;
  let tenantName: string | null = null;
  let defaultLang: string | null = null;

  if (isLocalHost(host) && devTenantId) {
    tenantId = devTenantId;
  } else {
    const { data } = await sb
      .from("tenant_domains")
      .select("tenant_id, tenants(name, default_lang)")
      .eq("hostname", host)
      .maybeSingle();

    if (data) {
      tenantId = data.tenant_id as string;
      tenantName = (data.tenants as any)?.name ?? null;
      defaultLang = (data.tenants as any)?.default_lang ?? null;
    }
  }

  if (!tenantId) {
    return {
      tenantId: "unknown",
      tenantName: "Unknown Tenant",
      userLabel: "Not signed in",
      defaultLang: devLang,
    };
  }

  if (!tenantName) {
    const { data: tenant } = await sb
      .from("tenants")
      .select("name, default_lang")
      .eq("id", tenantId)
      .limit(1)
      .maybeSingle();

    tenantName = tenant?.name ?? tenantId;
    defaultLang = tenant?.default_lang ?? defaultLang;
  }

  // v1 safe fallback until auth UI + cookie session are wired
  const userLabel = "Not signed in";

  return {
    tenantId,
    tenantName: tenantName ?? tenantId,
    userLabel,
    defaultLang: defaultLang ?? devLang,
  };
}
