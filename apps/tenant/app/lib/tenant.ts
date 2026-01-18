export function resolveTenantId(hostname: string) {
  // v0: map; later: Supabase lookup by domain
  if (hostname.includes("olivea")) return "olivea";
  if (hostname.includes("roseiies")) return "roseiies";
  return "default";
}
