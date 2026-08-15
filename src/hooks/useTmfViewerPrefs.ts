export type TmfViewerPrefs = {
  studyId?: string;
  studyCountryId?: string;
  siteId?: string;
  viewModelId?: string;
  artifactId?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

function storageKey(vaultId: string) {
  return `vivarcus.tmf_viewer.${vaultId}`;
}

export function loadTmfViewerPrefs(vaultId: string): TmfViewerPrefs {
  if (!vaultId) return {};
  try {
    const raw = sessionStorage.getItem(storageKey(vaultId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as TmfViewerPrefs;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveTmfViewerPrefs(vaultId: string, prefs: TmfViewerPrefs) {
  if (!vaultId) return;
  try {
    sessionStorage.setItem(storageKey(vaultId), JSON.stringify(prefs));
  } catch {
    // ignore quota / private mode
  }
}

export function ancestorArtifactIds(
  nodes: { id: string; parent_id?: string }[],
  artifactId: string | undefined,
): string[] {
  if (!artifactId) return [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const ancestors: string[] = [];
  let current = byId.get(artifactId);
  while (current?.parent_id) {
    ancestors.push(current.parent_id);
    current = byId.get(current.parent_id);
  }
  return ancestors;
}
