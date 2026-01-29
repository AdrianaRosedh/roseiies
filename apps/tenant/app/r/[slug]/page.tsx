import { notFound, redirect } from "next/navigation";
import { resolvePublicSlug } from "@/lib/public/resolve-public-slug";

export default async function PublicResourcePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = String(slug ?? "").trim();
  if (!s) return notFound();

  const res = await resolvePublicSlug({ slug: s });
  if (!res || !res.enabled) return notFound();

  if (res.type === "external" && res.url) redirect(res.url);
  if (res.layoutId) redirect(`/view/${res.layoutId}`);

  return notFound();
}
