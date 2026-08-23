import { Button, Dropdown } from "antd";
import type { MenuProps } from "antd";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { useUi } from "../context/UiContext";
import { useVaultAI } from "../context/VaultAIContext";
import { useHeaderUserIdentity } from "../hooks/useHeaderUserIdentity";
import { shouldShowHeaderUserEmail } from "../lib/headerUserIdentity";
import { displayText } from "../lib/i18n";
import { NotificationBell } from "../components/NotificationBell";
import { UserAvatar } from "../components/UserAvatar";

type Props = {
  vaultLabel: string;
  vaultId: string | undefined;
  canViewUserProfile?: boolean;
};

function vaultMenuTitle(vault: { name?: string; domain_id: string; vault_id: string }) {
  return vault.name?.trim() || vault.domain_id || vault.vault_id;
}

function VaultAISparkleIcon() {
  return (
    <svg className="header-menus__ai-sparkle" viewBox="0 0 16 16" aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M8 0.6 9.35 6.05 14.9 7.4 9.35 8.75 8 14.3 6.65 8.75 1.1 7.4 6.65 6.05Z"
      />
    </svg>
  );
}

export function HeaderMenus({ vaultLabel, vaultId, canViewUserProfile = false }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, logout, selectVault, authChrome } = useAuth();
  const { shell } = useUi();
  const { open: vaultAIOpen, toggle: toggleVaultAI } = useVaultAI();
  const { displayName, email, avatarUrl, loading } = useHeaderUserIdentity(vaultId, session?.username);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const vaultAILabel = displayText(shell.vault_ai.title);

  useEffect(() => {
    setVaultOpen(false);
    setUserOpen(false);
  }, [location.pathname]);

  if (!session) {
    return null;
  }

  const userLabel = loading && !session.username?.trim()
    ? displayText(shell.loading)
    : displayName;
  const showEmail = shouldShowHeaderUserEmail(displayName, email);
  const truncatedVaultLabel =
    vaultLabel.length > 24 ? `${vaultLabel.slice(0, 24)}…` : vaultLabel;

  function handleSelectVault(targetVaultId: string) {
    if (targetVaultId === vaultId) return;
    selectVault(targetVaultId);
    setVaultOpen(false);
    navigate("/");
  }

  function handleVaultOpenChange(open: boolean) {
    setVaultOpen(open);
  }

  const vaultMenuItems: MenuProps["items"] =
    session.vaults.length === 0
      ? [{ key: "empty", label: displayText(authChrome.no_vaults), disabled: true }]
      : session.vaults.map((vault) => {
          const title = vaultMenuTitle(vault);
          const isCurrent = vault.vault_id === vaultId;
          return {
            key: vault.vault_id,
            className: isCurrent ? "dropdown__vault-menu-item--selected" : undefined,
            label: <span className="dropdown__vault-name">{title}</span>,
            onClick: () => handleSelectVault(vault.vault_id),
          };
        });

  const userMenuItems: MenuProps["items"] = [
    {
      key: "header",
      className: "dropdown__user-menu-item dropdown__user-menu-item--header",
      label: (
        <div className="dropdown__user-header">
          <strong>{userLabel}</strong>
          {showEmail ? <span>{email}</span> : null}
        </div>
      ),
      disabled: true,
    },
    ...(canViewUserProfile
      ? [
          {
            key: "profile",
            className: "dropdown__user-menu-item dropdown__user-menu-item--profile",
            label: displayText(shell.user_profile_menu),
            onClick: () => {
              setUserOpen(false);
              navigate("/user-profile");
            },
          } as const,
        ]
      : []),
    {
      key: "about",
      className: "dropdown__user-menu-item dropdown__user-menu-item--about",
      label: displayText(shell.about_this_vault),
      onClick: () => {
        setUserOpen(false);
        navigate("/admin/about/vault-information");
      },
    },
    {
      key: "help",
      className: "dropdown__user-menu-item dropdown__user-menu-item--help",
      label: displayText(shell.help_menu),
      onClick: () => {
        setUserOpen(false);
        window.open("https://vivarcus.com/help/zh/", "_blank", "noopener,noreferrer");
      },
    },
    {
      key: "shortcuts",
      className: "dropdown__user-menu-item dropdown__user-menu-item--shortcuts",
      label: displayText(shell.keyboard_shortcuts),
      onClick: () => setUserOpen(false),
    },
    {
      key: "logout",
      className: "dropdown__user-menu-item dropdown__user-menu-item--logout",
      label: displayText(shell.sign_out),
      onClick: () => logout(),
    },
  ];

  return (
    <div className="header-menus">
      {vaultId ? <NotificationBell vaultId={vaultId} /> : null}
      <Dropdown
        menu={{ items: vaultMenuItems }}
        trigger={["click"]}
        placement="bottomRight"
        autoAdjustOverflow={false}
        open={vaultOpen}
        onOpenChange={handleVaultOpenChange}
        popupRender={(menu) => (
          <div className="dropdown__panel dropdown__panel--vault">
            {session.vaults.length > 0 ? (
              <div className="dropdown__vault-heading">
                {displayText(shell.all_vaults_label)}
              </div>
            ) : null}
            {menu}
          </div>
        )}
      >
        <Button
          type="text"
          className={["header-menus__vault", vaultOpen ? "header-menus__vault--open" : ""]
            .filter(Boolean)
            .join(" ")}
          title={vaultLabel}
        >
          <span className="header-menus__vault-label">{truncatedVaultLabel}</span>
        </Button>
      </Dropdown>

      {vaultId ? (
        <Button
          type="text"
          className={[
            "header-menus__icon-btn",
            "header-menus__ai",
            vaultAIOpen ? "header-menus__ai--open" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          title={vaultAILabel}
          aria-label={vaultAILabel}
          aria-pressed={vaultAIOpen}
          onClick={toggleVaultAI}
        >
          <VaultAISparkleIcon />
        </Button>
      ) : null}

      <Dropdown
        menu={{ items: userMenuItems }}
        trigger={["click"]}
        placement="bottomRight"
        open={userOpen}
        onOpenChange={setUserOpen}
        popupRender={(menu) => (
          <div className="dropdown__panel dropdown__panel--user">{menu}</div>
        )}
      >
        <Button
          type="text"
          className="header-menus__user"
          title={userLabel}
          aria-label={userLabel}
        >
          <UserAvatar
            vaultId={vaultId}
            imageUrl={avatarUrl}
            alt={userLabel}
            className="header-menus__avatar"
          />
        </Button>
      </Dropdown>
    </div>
  );
}
