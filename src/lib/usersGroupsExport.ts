import { api } from "../api/client";

export type UsersGroupsView = "groups" | "domain_users";

export async function downloadUsersGroupsExport(
  vaultId: string,
  view: UsersGroupsView,
  search?: string,
): Promise<void> {
  const blob = await api.usersGroupsExport(vaultId, view, { search });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${view}.csv`;
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
