import { api } from "../api/client";
import { triggerBrowserDownload } from "./documentActions";

/** Matches TargetURL produced by outbound export success notifications. */
const DOWNLOAD_VPK_QUERY = "download_vpk";

export function parseOutboundVpkDownloadTarget(
  targetURL: string | undefined | null,
): { path: string; artifactId: string } | null {
  const raw = targetURL?.trim() ?? "";
  if (!raw) return null;
  try {
    const url = new URL(raw, "http://local.invalid");
    const artifactId = url.searchParams.get(DOWNLOAD_VPK_QUERY)?.trim() ?? "";
    if (!artifactId) return null;
    if (!url.pathname.includes("/objects/outbound_package__v/records/")) {
      return null;
    }
    return { path: `${url.pathname}${url.search}`, artifactId };
  } catch {
    return null;
  }
}

export async function downloadOutboundVpkArtifact(
  vaultId: string,
  artifactId: string,
  fileName = "package.vpk",
): Promise<void> {
  const blob = await api.downloadOutboundPackageArtifact(vaultId, artifactId);
  triggerBrowserDownload(blob, fileName);
}
