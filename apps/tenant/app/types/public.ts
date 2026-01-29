// apps/tenant/app/types/public.ts
export type PublicResourceType = "area_view" | "layout_view" | "external";

export type PublicResolveResult = {
  enabled: boolean;
  type: PublicResourceType | string;
  layoutId: string | null;
  url: string | null;
};
