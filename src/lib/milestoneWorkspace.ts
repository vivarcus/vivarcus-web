import { withNavTrail } from "./navTrail";

/** Detect View Expected Documents lifecycle user action. */
export function isViewExpectedDocumentsAction(actionName: string | undefined): boolean {
  const name = (actionName ?? "").trim();
  return name.startsWith("view_expected_documents_useraction__");
}

/** SPA route for Milestone Workspace Expected Documents page. */
export function buildMilestoneWorkspaceHref(
  milestoneRecordId: string,
  opts?: { navTrail?: string },
): string {
  const params = new URLSearchParams();
  params.set("milestone", milestoneRecordId);
  return withNavTrail(`/pages/milestone_workspace__v?${params}`, opts?.navTrail ?? "");
}
