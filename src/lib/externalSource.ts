import type { DocumentExternalSource } from "../api/types";

const PROVIDER_LABELS: Record<string, string> = {
  feishu: "Feishu",
};

function providerLabel(provider: string): string {
  const key = provider.trim().toLowerCase();
  if (!key) {
    return "External source";
  }
  return PROVIDER_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

function formatProviderLabel(template: string | undefined, provider: string, fallbackPrefix: string): string {
  const name = providerLabel(provider);
  if (template?.includes("{provider}")) {
    return template.replaceAll("{provider}", name);
  }
  if (template?.trim()) {
    return template;
  }
  return `${fallbackPrefix} ${name}`;
}

function isOpenableUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export type ExternalSourceEditAction = {
  url: string;
  label: string;
};

export type ExternalSourceResyncRequest = {
  profile_id?: string;
  file_token: string;
  file_type: string;
  title?: string;
  url?: string;
  label: string;
};

export type ExternalSourceLabelOptions = {
  editInProvider?: string;
  syncFromProvider?: string;
};

/** Returns toolbar action when the current source has an openable external URL. */
export function externalSourceEditAction(
  externalSource?: DocumentExternalSource | null,
  labels?: ExternalSourceLabelOptions,
): ExternalSourceEditAction | null {
  if (!externalSource) {
    return null;
  }
  const url = externalSource.url?.trim() ?? "";
  if (!isOpenableUrl(url)) {
    return null;
  }
  const provider = externalSource.provider?.trim() ?? "";
  return {
    url,
    label: formatProviderLabel(labels?.editInProvider, provider, "Edit in"),
  };
}

/** Returns import payload to re-sync the current version from a stored external file reference. */
export function externalSourceResyncRequest(
  externalSource?: DocumentExternalSource | null,
  labels?: ExternalSourceLabelOptions,
): ExternalSourceResyncRequest | null {
  if (!externalSource) {
    return null;
  }
  const provider = externalSource.provider?.trim().toLowerCase() ?? "";
  if (provider !== "feishu") {
    return null;
  }
  const fileToken = externalSource.file_token?.trim() ?? "";
  const fileType = externalSource.file_type?.trim() ?? "";
  if (!fileToken || !fileType) {
    return null;
  }
  const title = externalSource.title?.trim() ?? "";
  const url = externalSource.url?.trim() ?? "";
  return {
    profile_id: externalSource.profile_id?.trim() || undefined,
    file_token: fileToken,
    file_type: fileType,
    title: title || undefined,
    url: url || undefined,
    label: formatProviderLabel(labels?.syncFromProvider, provider, "Sync from"),
  };
}
