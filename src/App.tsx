import { createBrowserRouter, Navigate, RouterProvider, useSearchParams } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { AdminCollectionRedirect, AdminTabRedirect } from "./components/AdminDefaultRedirect";
import { RouteChunkLoadRecovery } from "./components/RouteChunkLoadRecovery";
import { AppShell } from "./layout/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { ObjectListPage } from "./pages/ObjectListPage";
import { RecordDetailPage } from "./pages/RecordDetailPage";
import { VaultHomePage } from "./pages/VaultHomePage";

function ForgotPasswordRedirect() {
  const [params] = useSearchParams();
  const prefill = params.get("prefill")?.trim() || params.get("username")?.trim() || "";
  const next = prefill
    ? `/login?forgot=1&username=${encodeURIComponent(prefill)}`
    : "/login?forgot=1";
  return <Navigate to={next} replace />;
}

const router = createBrowserRouter([
  {
    errorElement: <RouteChunkLoadRecovery />,
    children: [
  { path: "/login", element: <LoginPage /> },
  {
    path: "/invite",
    lazy: async () => {
      const { InvitePage } = await import("./pages/InvitePage");
      return { Component: InvitePage };
    },
  },
  {
    path: "/changepassword",
    lazy: async () => {
      const { InvitePage } = await import("./pages/InvitePage");
      return { Component: InvitePage };
    },
  },
  {
    path: "/forgotpassword",
    element: <ForgotPasswordRedirect />,
  },
  {
    path: "/login/oauth",
    lazy: async () => {
      const { OAuthCompletePage } = await import("./pages/OAuthCompletePage");
      return { Component: OAuthCompletePage };
    },
  },
  { path: "/vaults", element: <Navigate to="/" replace /> },
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <VaultHomePage /> },
      {
        path: "notifications",
        lazy: async () => {
          const { NotificationsPage } = await import("./pages/NotificationsPage");
          return { Component: NotificationsPage };
        },
      },
      {
        path: "vault-ai",
        lazy: async () => {
          const { VaultAITabPage } = await import("./pages/VaultAITabPage");
          return { Component: VaultAITabPage };
        },
      },
      { path: "tabs/:tabApiName", element: <ObjectListPage /> },
      {
        path: "pages/:pageApiName",
        lazy: async () => {
          const { PageTabPage } = await import("./pages/PageTabPage");
          return { Component: PageTabPage };
        },
      },
      {
        path: "objects/:objectName/records/:recordId",
        element: <RecordDetailPage />,
      },
      {
        path: "objects/:objectName/records/:recordId/edit",
        element: <RecordDetailPage />,
      },
      {
        path: "objects/:objectName",
        lazy: async () => {
          const { ObjectListDeepLinkPage } = await import("./pages/ObjectListDeepLinkPage");
          return { Component: ObjectListDeepLinkPage };
        },
      },
      {
        path: "objects/:objectName/create",
        lazy: async () => {
          const { RecordFormPage } = await import("./pages/RecordFormPage");
          return { Component: RecordFormPage };
        },
      },
      {
        path: "objects/:objectName/records/:recordId/audit",
        lazy: async () => {
          const { RecordAuditPage } = await import("./pages/RecordAuditPage");
          return { Component: RecordAuditPage };
        },
      },
      {
        path: "admin",
        lazy: async () => {
          const { AdminConsoleLayout } = await import("./layout/AdminConsoleLayout");
          return { Component: AdminConsoleLayout };
        },
        children: [
          { index: true, element: <AdminCollectionRedirect /> },
          {
            path: "audit-logs",
            children: [
              {
                index: true,
                element: (
                  <AdminTabRedirect parentRoute="/admin/audit-logs" fallback="system" />
                ),
              },
              {
                path: "agent_traces",
                children: [
                  {
                    index: true,
                    lazy: async () => {
                      const { AdminAgentTracesListPage } = await import("./pages/AdminAgentTracesListPage");
                      return { Component: AdminAgentTracesListPage };
                    },
                  },
                  {
                    path: "new",
                    lazy: async () => {
                      const { AdminAgentTraceCreatePage } = await import("./pages/AdminAgentTraceCreatePage");
                      return { Component: AdminAgentTraceCreatePage };
                    },
                  },
                  {
                    path: ":id",
                    lazy: async () => {
                      const { AdminAgentTraceDetailPage } = await import("./pages/AdminAgentTraceDetailPage");
                      return { Component: AdminAgentTraceDetailPage };
                    },
                  },
                ],
              },
              {
                path: ":panel",
                lazy: async () => {
                  const { AdminLogsPage } = await import("./pages/AdminLogsPage");
                  return { Component: AdminLogsPage };
                },
              },
            ],
          },
          {
            path: "users-groups",
            children: [
              {
                index: true,
                element: (
                  <AdminTabRedirect parentRoute="/admin/users-groups" fallback="vault_users" />
                ),
              },
              {
                path: "vault_users",
                lazy: async () => {
                  const { AdminVaultUsersListPage } = await import("./pages/AdminVaultUsersListPage");
                  return { Component: AdminVaultUsersListPage };
                },
              },
              {
                path: "groups",
                lazy: async () => {
                  const { AdminGroupsListPage } = await import("./pages/AdminGroupsListPage");
                  return { Component: AdminGroupsListPage };
                },
              },
              {
                path: "application_roles",
                lazy: async () => {
                  const { AdminApplicationRolesListPage } = await import(
                    "./pages/AdminApplicationRolesListPage"
                  );
                  return { Component: AdminApplicationRolesListPage };
                },
              },
              {
                path: "permission_sets",
                lazy: async () => {
                  const { AdminMetadataPermissionSetsPage } = await import("./pages/AdminMetadataPermissionSetsPage");
                  return { Component: AdminMetadataPermissionSetsPage };
                },
              },
              {
                path: "permission_sets/:permissionSetName",
                lazy: async () => {
                  const { AdminMetadataPermissionSetDetailPage } = await import("./pages/AdminMetadataPermissionSetDetailPage");
                  return { Component: AdminMetadataPermissionSetDetailPage };
                },
              },
              {
                path: "permission_sets/:permissionSetName/objects/:objectName",
                lazy: async () => {
                  const { AdminMetadataPermissionSetObjectDetailPage } = await import("./pages/AdminMetadataPermissionSetObjectDetailPage");
                  return { Component: AdminMetadataPermissionSetObjectDetailPage };
                },
              },
              {
                path: "security_profiles",
                lazy: async () => {
                  const { AdminMetadataSecurityProfilesPage } = await import("./pages/AdminMetadataSecurityProfilesPage");
                  return { Component: AdminMetadataSecurityProfilesPage };
                },
              },
              {
                path: "security_profiles/:securityProfileName",
                lazy: async () => {
                  const { AdminMetadataSecurityProfileDetailPage } = await import("./pages/AdminMetadataSecurityProfileDetailPage");
                  return { Component: AdminMetadataSecurityProfileDetailPage };
                },
              },
              {
                path: "domain_users/:userId",
                lazy: async () => {
                  const { AdminDomainUserDetailPage } = await import("./pages/AdminDomainUserDetailPage");
                  return { Component: AdminDomainUserDetailPage };
                },
              },
              {
                path: ":view",
                lazy: async () => {
                  const { AdminUsersGroupsPage } = await import("./pages/AdminUsersGroupsPage");
                  return { Component: AdminUsersGroupsPage };
                },
              },
            ],
          },
          {
            path: "operations",
            children: [
              {
                index: true,
                element: (
                  <AdminTabRedirect parentRoute="/admin/operations" fallback="job_definitions" />
                ),
              },
              {
                path: "job_definitions",
                lazy: async () => {
                  const { AdminJobDefinitionsPage } = await import("./pages/AdminJobDefinitionsPage");
                  return { Component: AdminJobDefinitionsPage };
                },
              },
              {
                path: "job_definitions/:apiName",
                lazy: async () => {
                  const { AdminJobDefinitionDetailPage } = await import(
                    "./pages/AdminJobDefinitionsPage"
                  );
                  return { Component: AdminJobDefinitionDetailPage };
                },
              },
              {
                path: "job_status",
                lazy: async () => {
                  const { AdminJobStatusPage } = await import("./pages/AdminJobStatusPage");
                  return { Component: AdminJobStatusPage };
                },
              },
              {
                path: "job_queue",
                lazy: async () => {
                  const { AdminJobQueuesPage } = await import("./pages/AdminJobQueuesPage");
                  return { Component: AdminJobQueuesPage };
                },
              },
              {
                path: "job_queue/:apiName",
                lazy: async () => {
                  const { AdminJobQueueDetailPage } = await import("./pages/AdminJobQueuesPage");
                  return { Component: AdminJobQueueDetailPage };
                },
              },
              {
                path: "sdk_job_metadata",
                lazy: async () => {
                  const { AdminJobMetadataPage } = await import("./pages/AdminJobMetadataPage");
                  return { Component: AdminJobMetadataPage };
                },
              },
              {
                path: "sdk_job_metadata/:apiName",
                lazy: async () => {
                  const { AdminJobMetadataDetailPage } = await import("./pages/AdminJobMetadataPage");
                  return { Component: AdminJobMetadataDetailPage };
                },
              },
              {
                path: "email_notification_status",
                lazy: async () => {
                  const { AdminEmailNotificationStatusPage } = await import(
                    "./pages/AdminEmailNotificationStatusPage"
                  );
                  return { Component: AdminEmailNotificationStatusPage };
                },
              },
              {
                path: "email_suppression_list",
                lazy: async () => {
                  const { AdminEmailSuppressionListPage } = await import(
                    "./pages/AdminEmailSuppressionListPage"
                  );
                  return { Component: AdminEmailSuppressionListPage };
                },
              },
            ],
          },
          {
            path: "deployment",
            children: [
              {
                index: true,
                element: (
                  <AdminTabRedirect parentRoute="/admin/deployment" fallback="sandbox_vaults" />
                ),
              },
              {
                path: "sandbox_vaults",
                lazy: async () => {
                  const { AdminSandboxVaultsPage } = await import(
                    "./pages/AdminSandboxVaultsPage"
                  );
                  return { Component: AdminSandboxVaultsPage };
                },
              },
              {
                path: "sandbox_vaults/new",
                lazy: async () => {
                  const { AdminSandboxVaultCreatePage } = await import(
                    "./pages/AdminSandboxVaultCreatePage"
                  );
                  return { Component: AdminSandboxVaultCreatePage };
                },
              },
              {
                path: "sandbox_snapshots",
                lazy: async () => {
                  const { AdminSandboxSnapshotsPage } = await import(
                    "./pages/AdminSandboxSnapshotsPage"
                  );
                  return { Component: AdminSandboxSnapshotsPage };
                },
              },
              {
                path: "sandbox_snapshots/new",
                lazy: async () => {
                  const { AdminSandboxSnapshotCreatePage } = await import(
                    "./pages/AdminSandboxSnapshotCreatePage"
                  );
                  return { Component: AdminSandboxSnapshotCreatePage };
                },
              },
              {
                path: "outbound_packages",
                lazy: async () => {
                  const { AdminOutboundPackagesPage } = await import(
                    "./pages/AdminOutboundPackagesPage"
                  );
                  return { Component: AdminOutboundPackagesPage };
                },
              },
              {
                path: "inbound_packages",
                lazy: async () => {
                  const { AdminInboundPackagesPage } = await import(
                    "./pages/AdminInboundPackagesPage"
                  );
                  return { Component: AdminInboundPackagesPage };
                },
              },
              {
                path: "review_deploy/:recordId",
                lazy: async () => {
                  const { AdminReviewDeployPage } = await import("./pages/AdminReviewDeployPage");
                  return { Component: AdminReviewDeployPage };
                },
              },
            ],
          },
          {
            path: "configuration",
            children: [
              {
                index: true,
                lazy: async () => {
                  const { AdminConfigurationHubPage } = await import("./pages/AdminConfigurationHubPage");
                  return { Component: AdminConfigurationHubPage };
                },
              },
              {
                path: "config-diagnostics",
                lazy: async () => {
                  const { ConfigDiagnosticsPage } = await import("./pages/ConfigDiagnosticsPage");
                  return { Component: ConfigDiagnosticsPage };
                },
              },
              {
                path: "objects",
                lazy: async () => {
                  const { AdminMetadataObjectsPage } = await import("./pages/AdminMetadataObjectsPage");
                  return { Component: AdminMetadataObjectsPage };
                },
              },
              {
                path: "objects/:objectName",
                lazy: async () => {
                  const { AdminMetadataObjectDetailPage } = await import("./pages/AdminMetadataObjectDetailPage");
                  return { Component: AdminMetadataObjectDetailPage };
                },
              },
              {
                path: "objects/:objectName/fields/:fieldName",
                lazy: async () => {
                  const { AdminMetadataFieldDetailPage } = await import("./pages/AdminMetadataFieldDetailPage");
                  return { Component: AdminMetadataFieldDetailPage };
                },
              },
              {
                path: "object-lifecycles",
                lazy: async () => {
                  const { AdminMetadataLifecyclesPage } = await import("./pages/AdminMetadataLifecyclesPage");
                  return { Component: AdminMetadataLifecyclesPage };
                },
              },
              {
                path: "object-lifecycles/:lifecycleName",
                lazy: async () => {
                  const { AdminMetadataLifecycleDetailPage } = await import(
                    "./pages/AdminMetadataLifecycleDetailPage"
                  );
                  return { Component: AdminMetadataLifecycleDetailPage };
                },
              },
              {
                path: "workflows",
                lazy: async () => {
                  const { AdminMetadataWorkflowsPage } = await import("./pages/AdminMetadataWorkflowsPage");
                  return { Component: AdminMetadataWorkflowsPage };
                },
              },
              {
                path: "workflows/:workflowName",
                lazy: async () => {
                  const { AdminMetadataWorkflowDetailPage } = await import(
                    "./pages/AdminMetadataWorkflowDetailPage"
                  );
                  return { Component: AdminMetadataWorkflowDetailPage };
                },
              },
              {
                path: "workflows/:workflowName/versions",
                lazy: async () => {
                  const { AdminMetadataWorkflowVersionsPage } = await import(
                    "./pages/AdminMetadataWorkflowVersionsPage"
                  );
                  return { Component: AdminMetadataWorkflowVersionsPage };
                },
              },
              {
                path: "workflows/:workflowName/versions/:version",
                lazy: async () => {
                  const { AdminMetadataWorkflowDetailPage } = await import(
                    "./pages/AdminMetadataWorkflowDetailPage"
                  );
                  return { Component: AdminMetadataWorkflowDetailPage };
                },
              },
              {
                path: "workflows/:workflowName/versions/:version/steps/:stepName",
                lazy: async () => {
                  const { AdminMetadataWorkflowStepPage } = await import(
                    "./pages/AdminMetadataWorkflowStepPage"
                  );
                  return { Component: AdminMetadataWorkflowStepPage };
                },
              },
              {
                path: "workflows/:workflowName/steps/:stepName",
                lazy: async () => {
                  const { AdminMetadataWorkflowStepPage } = await import(
                    "./pages/AdminMetadataWorkflowStepPage"
                  );
                  return { Component: AdminMetadataWorkflowStepPage };
                },
              },
              {
                path: "picklists",
                lazy: async () => {
                  const { AdminMetadataPicklistsPage } = await import("./pages/AdminMetadataPicklistsPage");
                  return { Component: AdminMetadataPicklistsPage };
                },
              },
              {
                path: "picklists/:picklistName",
                lazy: async () => {
                  const { AdminMetadataPicklistDetailPage } = await import(
                    "./pages/AdminMetadataPicklistDetailPage"
                  );
                  return { Component: AdminMetadataPicklistDetailPage };
                },
              },
              {
                path: "layouts",
                lazy: async () => {
                  const { AdminMetadataLayoutsPage } = await import("./pages/AdminMetadataLayoutsPage");
                  return { Component: AdminMetadataLayoutsPage };
                },
              },
              {
                path: "layouts/:layoutName",
                lazy: async () => {
                  const { AdminMetadataLayoutDetailPage } = await import("./pages/AdminMetadataLayoutDetailPage");
                  return { Component: AdminMetadataLayoutDetailPage };
                },
              },
              {
                path: "metadata/*",
                lazy: async () => {
                  const { LegacyMetadataRedirect } = await import("./components/admin/LegacyMetadataRedirect");
                  return { Component: LegacyMetadataRedirect };
                },
              },
            ],
          },
          {
            // Legacy redirect: /admin/config-diagnostics → /admin/configuration/config-diagnostics
            path: "config-diagnostics",
            element: <Navigate to="/admin/configuration/config-diagnostics" replace />,
          },
          {
            path: "layout-profiles",
            lazy: async () => {
              const { LayoutProfilePage } = await import("./pages/LayoutProfilePage");
              return { Component: LayoutProfilePage };
            },
          },
          {
            path: "layout-preview",
            lazy: async () => {
              const { LayoutPreviewPage } = await import("./pages/LayoutPreviewPage");
              return { Component: LayoutPreviewPage };
            },
          },
          {
            path: "settings",
            children: [
              { index: true, element: <Navigate to="language-region" replace /> },
              {
                path: "language-region",
                lazy: async () => {
                  const { LanguageRegionSettingsPage } = await import(
                    "./pages/LanguageRegionSettingsPage"
                  );
                  return { Component: LanguageRegionSettingsPage };
                },
              },
              {
                path: "security",
                lazy: async () => {
                  const { SecuritySettingsPage } = await import(
                    "./pages/SecuritySettingsPage"
                  );
                  return { Component: SecuritySettingsPage };
                },
              },
              {
                path: "search",
                lazy: async () => {
                  const { SearchSettingsPage } = await import("./pages/SearchSettingsPage");
                  return { Component: SearchSettingsPage };
                },
              },
              {
                path: "application",
                lazy: async () => {
                  const { ApplicationSettingsPage } = await import(
                    "./pages/ApplicationSettingsPage"
                  );
                  return { Component: ApplicationSettingsPage };
                },
              },
              {
                path: "vault-ai",
                lazy: async () => {
                  const { VaultAISettingsPage } = await import(
                    "./pages/VaultAISettingsPage"
                  );
                  return { Component: VaultAISettingsPage };
                },
              },
              {
                path: "branding",
                lazy: async () => {
                  const { BrandingSettingsPage } = await import(
                    "./pages/BrandingSettingsPage"
                  );
                  return { Component: BrandingSettingsPage };
                },
              },
              {
                path: "domain",
                lazy: async () => {
                  const { DomainSettingsPage } = await import(
                    "./pages/DomainSettingsPage"
                  );
                  return { Component: DomainSettingsPage };
                },
              },
            ],
          },
          {
            path: "about",
            children: [
              { index: true, element: <Navigate to="vault-information" replace /> },
              {
                path: "vault-information",
                lazy: async () => {
                  const { VaultInformationPage } = await import(
                    "./pages/VaultInformationPage"
                  );
                  return { Component: VaultInformationPage };
                },
              },
              {
                path: "domain-information",
                lazy: async () => {
                  const { DomainInformationPage } = await import(
                    "./pages/DomainInformationPage"
                  );
                  return { Component: DomainInformationPage };
                },
              },
            ],
          },
        ],
      },
      {
        path: "user-profile",
        lazy: async () => {
          const { UserProfilePage } = await import("./pages/UserProfilePage");
          return { Component: UserProfilePage };
        },
      },
      {
        path: "business-admin",
        lazy: async () => {
          const { AdminConsoleLayout } = await import("./layout/AdminConsoleLayout");
          return { Component: AdminConsoleLayout };
        },
        children: [
          { index: true, element: <Navigate to="objects" replace /> },
          {
            path: "objects",
            lazy: async () => {
              const { BusinessAdminObjectsPage } = await import("./pages/BusinessAdminObjectsPage");
              return { Component: BusinessAdminObjectsPage };
            },
          },
          {
            path: "objects/:objectName",
            lazy: async () => {
              const { BusinessAdminObjectListPage } = await import("./pages/BusinessAdminObjectListPage");
              return { Component: BusinessAdminObjectListPage };
            },
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/login" replace /> },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
