import { Alert } from "antd";
import { useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useVaultId } from "../hooks/useVaultId";
import type { NavigationModel } from "../api/types";
import { useOptionalNavigationContext } from "../context/NavigationContext";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";
import { CRA_HOME_PAGE, CRAHomePage } from "./CRAHomePage";
import { STUDY_MGMT_HOME_PAGE, StudyManagementHomePage } from "./StudyManagementHomePage";
import { TMF_HOME_PAGE, TMFHomePage } from "./TMFHomePage";
import { TMF_VIEWER_PAGE, TMFViewerPage } from "./TMFViewerPage";
import {
  MILESTONE_WORKSPACE_PAGE,
  MilestoneWorkspacePage,
} from "./MilestoneWorkspacePage";

function findPageTab(nav: NavigationModel, pageApiName: string) {
  for (const collection of nav.collections) {
    for (const item of collection.items) {
      const tabs = item.tab ? [item.tab] : (item.menu_tabs ?? []);
      for (const tab of tabs) {
        if (tab.kind === "page" && tab.page_api_name === pageApiName) {
          return tab;
        }
      }
    }
  }
  return null;
}

export function PageTabPage() {
  const vaultId = useVaultId();
  const { pageApiName } = useParams();
  const { shell } = useUi();
  const navCtx = useOptionalNavigationContext();
  const nav = navCtx?.nav ?? null;
  const error = navCtx?.error ?? null;

  const label = useMemo(() => {
    if (!pageApiName) return "";
    if (!nav) return pageApiName;
    const tab = findPageTab(nav, pageApiName);
    return tab ? displayText(tab.label, tab.api_name) : pageApiName;
  }, [nav, pageApiName]);

  if (!vaultId || !pageApiName) {
    return null;
  }

  if (pageApiName === TMF_HOME_PAGE) {
    return <TMFHomePage />;
  }

  if (pageApiName === STUDY_MGMT_HOME_PAGE) {
    return <StudyManagementHomePage />;
  }

  if (pageApiName === CRA_HOME_PAGE) {
    return <CRAHomePage />;
  }

  if (pageApiName === TMF_VIEWER_PAGE) {
    return <TMFViewerPage />;
  }

  if (pageApiName === MILESTONE_WORKSPACE_PAGE) {
    return <MilestoneWorkspacePage />;
  }

  if (pageApiName === "home__v") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="page-header__breadcrumb">
            <Link to={`/`}>{displayText(shell.back)}</Link>
          </p>
          <h1>{label}</h1>
          <p className="page-header__meta mono">{pageApiName}</p>
        </div>
      </header>

      {error && <Alert type="error" title={error} showIcon role="alert" />}
      <Alert type="info" title={displayText(shell.page_tab_stub)} showIcon />
    </div>
  );
}
