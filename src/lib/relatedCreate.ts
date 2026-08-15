import type { ObjectTypeOption, RelatedSectionModel } from "../api/types";
import { withNavTrail } from "./navTrail";

const pendingSnapshots = new Map<string, RelatedSectionModel>();

type SectionContextPayload = {
  vault_id?: string;
};

function decodeBase64Url(raw: string): string {
  const padded = raw + "=".repeat((4 - (raw.length % 4)) % 4);
  return atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
}

/** Reads vault_id from a signed related-section context token (payload only; signature verified server-side). */
export function parseSectionContextVaultId(sectionContextToken: string): string | null {
  const token = sectionContextToken.trim();
  const dot = token.indexOf(".");
  if (dot <= 0) {
    return null;
  }
  try {
    const payload = JSON.parse(decodeBase64Url(token.slice(0, dot))) as SectionContextPayload;
    const vaultId = payload.vault_id?.trim();
    return vaultId || null;
  } catch {
    return null;
  }
}

/** Prefer the vault embedded in a related-section token so routing survives stale session vault selection. */
export function resolveRelatedSectionVaultId(
  sectionContextToken: string,
  fallbackVaultId: string,
): string {
  return parseSectionContextVaultId(sectionContextToken) ?? fallbackVaultId;
}

export function stashRelatedSectionSnapshot(
  sectionContextToken: string,
  section: RelatedSectionModel,
): void {
  pendingSnapshots.set(sectionContextToken, section);
}

export function takeRelatedSectionSnapshot(sectionContextToken: string): RelatedSectionModel | null {
  return pendingSnapshots.get(sectionContextToken) ?? null;
}

export function clearRelatedSectionSnapshot(sectionContextToken: string): void {
  pendingSnapshots.delete(sectionContextToken);
}

export function buildRelatedCreateHref(
  targetObjectApiName: string,
  sectionContextToken: string,
  opts?: {
    objectType?: string;
    navTrail?: string;
    tab?: string;
  },
) {
  const params = new URLSearchParams();
  params.set("related_section_token", sectionContextToken);
  if (opts?.objectType) params.set("object_type", opts.objectType);
  if (opts?.tab) params.set("tab", opts.tab);
  const href = `/objects/${encodeURIComponent(targetObjectApiName)}/create?${params}`;
  return withNavTrail(href, opts?.navTrail ?? "");
}

export function resolveRelatedCreateObjectType(
  objectType: string | undefined,
  action: {
    requires_type_selection?: boolean;
    object_types?: ObjectTypeOption[];
    default_object_type?: string;
  },
): string | undefined {
  const explicit = objectType?.trim();
  if (explicit) return explicit;
  const types = action.object_types ?? [];
  if (types.length === 1) return types[0]?.api_name;
  if (!action.requires_type_selection && action.default_object_type) {
    return action.default_object_type;
  }
  return undefined;
}
