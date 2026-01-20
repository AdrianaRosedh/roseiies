// apps/studio/app/page.tsx
import StudioApp from "./studio/StudioApp";
import { getPortalContext } from "./lib/portal/getPortalContext";

export default async function Page() {
  const portal = await getPortalContext();
  return <StudioApp portal={portal} />;
}
