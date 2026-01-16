export type TenantId = "olivea" | string;

export type TenantTheme = {
  tenantId: TenantId;
  displayName: string;
  logoUrl?: string;
  colors: {
    background: string;
    foreground: string;
    accent: string;
  };
  poweredByRoseiies?: boolean;
};

/**
 * Phase 0: hardcoded mapping.
 * Later: fetch from DB keyed by hostname.
 */
const HOST_TO_TENANT: Record<string, TenantId> = {
  "olivea.ai": "olivea",
  "www.olivea.ai": "olivea",
  "olivea.roseiies.ai": "olivea",

  // Local dev convenience (optional):
  "localhost:3000": "olivea"
};

export function resolveTenantFromHost(hostname: string): TenantId | null {
  const host = hostname.toLowerCase();

  if (HOST_TO_TENANT[host]) return HOST_TO_TENANT[host];

  // Default pattern: {tenant}.roseiies.ai
  const parts = host.split(".");
  if (parts.length >= 3) {
    const [sub, domain, tld] = parts;
    if (domain === "roseiies" && tld === "ai") return sub;
  }

  return null;
}

export function getTenantTheme(tenantId: TenantId): TenantTheme {
  if (tenantId === "olivea") {
    return {
      tenantId,
      displayName: "Olivea",
      logoUrl: "/images/logos/olivea.svg",
      colors: {
        background: "#0b0f0c",
        foreground: "#f3f0e8",
        accent: "#5e7658"
      },
      poweredByRoseiies: true
    };
  }

  return {
    tenantId,
    displayName: tenantId,
    colors: {
      background: "#0b0b0c",
      foreground: "#f4f4f5",
      accent: "#7c3aed"
    },
    poweredByRoseiies: true
  };
}