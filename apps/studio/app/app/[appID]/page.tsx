import StudioApp from "../../studio/StudioApp";
import { getPortalContext } from "../../lib/portal/getPortalContext";

export default async function StudioAppPage({
  params,
}: {
  params: Promise<{ appID: string }>;
}) {
  const portal = await getPortalContext();
  const { appID } = await params;

  // No “allowed list” here. StudioApp + registry decide what’s live.
  return <StudioApp portal={portal} initialAppId={appID} />;
}
