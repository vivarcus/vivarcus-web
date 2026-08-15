const STORAGE_PREFIX = "vivarcus.sidebar_hidden_views";

function storageKey(vaultId: string, tabApiName: string, navigationContext: string): string {
  return `${STORAGE_PREFIX}:${vaultId}:${tabApiName}:${navigationContext}`;
}

function readSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeSet(key: string, values: Set<string>) {
  localStorage.setItem(key, JSON.stringify([...values]));
}

export function getHiddenSidebarViewIds(
  vaultId: string,
  tabApiName: string,
  navigationContext: string,
): Set<string> {
  return readSet(storageKey(vaultId, tabApiName, navigationContext));
}

export function hideSidebarView(
  vaultId: string,
  tabApiName: string,
  navigationContext: string,
  viewId: string,
) {
  const key = storageKey(vaultId, tabApiName, navigationContext);
  const hidden = readSet(key);
  hidden.add(viewId);
  writeSet(key, hidden);
}

export function showSidebarView(
  vaultId: string,
  tabApiName: string,
  navigationContext: string,
  viewId: string,
) {
  const key = storageKey(vaultId, tabApiName, navigationContext);
  const hidden = readSet(key);
  hidden.delete(viewId);
  writeSet(key, hidden);
}
