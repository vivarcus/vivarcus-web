import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/AuthProvider";
import {
  clearRememberedUser,
  loadRememberedUser,
  saveLoginLang,
  saveRememberedUser,
} from "../auth/rememberedUser";
import { clearSession } from "../auth/session";
import { AppShell } from "../layout/AppShell";
import { defaultAuthChrome } from "../lib/i18n";
import { displayText } from "../lib/i18n/displayText";
import { AntdProvider } from "../theme/antdProvider";
import { LoginPage } from "./LoginPage";

/** Login page defaults to Chinese; tests that assert English chrome force "en". */
const ZH = {
  username: "用户名",
  password: "密码",
  continue: "继续",
  login: "登录",
  logInTitle: "登录",
  switchUser: "切换用户",
} as const;

function mockFetchResponse(init: {
  ok: boolean;
  status?: number;
  statusText?: string;
  json?: unknown;
}): Response {
  const text = init.json === undefined ? "" : JSON.stringify(init.json);
  return {
    ok: init.ok,
    status: init.status ?? (init.ok ? 200 : 401),
    statusText: init.statusText ?? (init.ok ? "OK" : "Unauthorized"),
    text: async () => text,
    headers: new Headers(),
  } as Response;
}

function renderLoginRoutes() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <AntdProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<AppShell />}>
              <Route index element={<div>Home</div>} />
            </Route>
            <Route path="/vault-ai" element={<div>Vault AI Landing</div>} />
          </Routes>
        </AuthProvider>
      </AntdProvider>
    </MemoryRouter>,
  );
}

function mockFetchRouter(handlers: Record<string, unknown>) {
  const all = {
    "/ui/auth/public-config": { vault_dns_base: "" },
    ...handlers,
  };
  return vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    const path = url.replace(/^https?:\/\/[^/]+/, "");
    const payload = all[url] ?? all[path];
    if (payload === undefined) {
      return Promise.resolve(
        mockFetchResponse({ ok: false, status: 404, json: { error: "not found" } }),
      );
    }
    return Promise.resolve(mockFetchResponse({ ok: true, json: payload }));
  });
}

const passwordResolve = { auth_mode: "password" as const, providers: [] };

async function continueThenLogin(
  user: ReturnType<typeof userEvent.setup>,
  username: string,
  password: string,
) {
  // Ant Design inserts spaces between CJK chars in Button children ("继 续").
  await user.type(screen.getByLabelText(ZH.username), username);
  await user.click(screen.getByRole("button", { name: /继\s*续/ }));
  await screen.findByLabelText(ZH.password);
  await user.type(screen.getByLabelText(ZH.password), password);
  await user.click(screen.getByRole("button", { name: /^\s*登\s*录\s*$/ }));
}

describe("LoginPage", () => {
  beforeEach(() => {
    localStorage.removeItem("vivarcus.selectedLang");
    saveLoginLang("zh");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    clearSession();
    clearRememberedUser();
    localStorage.removeItem("vivarcus.selectedLang");
  });

  it("defaults the language switcher to Chinese", () => {
    renderLoginRoutes();
    expect(screen.getByRole("button", { name: /中\s*文/ })).toBeInTheDocument();
  });

  it("writes session and enters default vault on successful login", async () => {
    const vaults = [
      {
        vault_id: "00000000-0000-4000-8000-000000000001",
        domain_id: "domain.test",
        name: "Vault One",
        state: "Active",
      },
      {
        vault_id: "00000000-0000-4000-8000-000000000002",
        domain_id: "domain.test",
        name: "Vault Two",
        state: "Active",
      },
    ];
    vi.stubGlobal(
      "fetch",
      mockFetchRouter({
        "/ui/auth/resolve": passwordResolve,
        "/ui/auth/login": {
          session_token: "test-session-token",
          user_id: "user-1",
          home_domain_id: "domain.test",
          vaults,
          default_vault_id: vaults[0].vault_id,
        },
        "/ui/me/vaults": {
          user_id: "user-1",
          home_domain_id: "domain.test",
          vaults,
          default_vault_id: vaults[0].vault_id,
        },
        "/ui/me/selected-vault": {
          vault_id: vaults[0].vault_id,
          default_vault_id: vaults[0].vault_id,
        },
      }),
    );

    const user = userEvent.setup();
    renderLoginRoutes();

    await continueThenLogin(user, "navuser@domain.test", "Phase3-Nav-Password!");

    await waitFor(() => {
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Vault One" })).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith(
      "/ui/auth/resolve",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ username: "navuser@domain.test" }),
      }),
    );
    expect(fetch).toHaveBeenCalledWith(
      "/ui/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          username: "navuser@domain.test",
          password: "Phase3-Nav-Password!",
        }),
      }),
    );
    expect(localStorage.getItem("vivarcus.session_token")).toBe("test-session-token");
    expect(localStorage.getItem("vivarcus.selected_vault_id")).toBe(vaults[0].vault_id);
    expect(loadRememberedUser()?.userName).toBe("navuser@domain.test");
  });

  it("lands on Vault AI without flashing Tasks home while navigation resolves", async () => {
    const vaults = [
      {
        vault_id: "00000000-0000-4000-8000-000000000001",
        domain_id: "domain.test",
        name: "Vault One",
        state: "Active",
      },
    ];
    let resolveNavigation!: (value: unknown) => void;
    const navigationGate = new Promise<unknown>((resolve) => {
      resolveNavigation = resolve;
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url === "/ui/auth/resolve") {
          return Promise.resolve(mockFetchResponse({ ok: true, json: passwordResolve }));
        }
        if (url === "/ui/auth/login") {
          return Promise.resolve(
            mockFetchResponse({
              ok: true,
              json: {
                session_token: "test-session-token",
                user_id: "user-1",
                home_domain_id: "domain.test",
                vaults,
                default_vault_id: vaults[0].vault_id,
              },
            }),
          );
        }
        if (url === "/ui/me/vaults") {
          return Promise.resolve(
            mockFetchResponse({
              ok: true,
              json: {
                user_id: "user-1",
                home_domain_id: "domain.test",
                vaults,
                default_vault_id: vaults[0].vault_id,
              },
            }),
          );
        }
        if (url === "/ui/me/selected-vault") {
          return Promise.resolve(
            mockFetchResponse({
              ok: true,
              json: {
                vault_id: vaults[0].vault_id,
                default_vault_id: vaults[0].vault_id,
              },
            }),
          );
        }
        if (url === "/ui/navigation") {
          return navigationGate.then((json) =>
            mockFetchResponse({ ok: true, json }),
          );
        }
        return Promise.resolve(
          mockFetchResponse({ ok: false, status: 404, json: { error: "not found" } }),
        );
      }),
    );

    const user = userEvent.setup();
    renderLoginRoutes();

    await continueThenLogin(user, "aiuser@domain.test", "Phase3-Nav-Password!");

    // Session is set, but landing route is still resolving — must not paint Tasks home.
    await waitFor(() => {
      expect(localStorage.getItem("vivarcus.session_token")).toBe("test-session-token");
    });
    expect(screen.queryByText("Home")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Vivarcus" })).toBeInTheDocument();

    resolveNavigation({ default_landing_route: "/vault-ai" });

    await waitFor(() => {
      expect(screen.getByText("Vault AI Landing")).toBeInTheDocument();
    });
    expect(screen.queryByText("Home")).not.toBeInTheDocument();
  });

  it("opens password step for remembered user and supports switch user", async () => {
    saveRememberedUser("remembered@domain.test");
    vi.stubGlobal(
      "fetch",
      mockFetchRouter({
        "/ui/auth/resolve": passwordResolve,
      }),
    );

    const user = userEvent.setup();
    renderLoginRoutes();

    expect(
      await screen.findByText("remembered@domain.test", {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^\s*登\s*录\s*$/ }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole("link", { name: /切\s*换\s*用\s*户/ }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("link", { name: /切\s*换\s*用\s*户/ }),
    );

    expect(loadRememberedUser()).toBeNull();
    expect(
      screen.getByRole("button", { name: /继\s*续/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(ZH.username),
    ).toBeEnabled();
  });

  it("keeps remembered SSO user on login page until they click SSO login", async () => {
    saveRememberedUser("sso@domain.test");
    const assignMock = vi.fn();
    vi.stubGlobal(
      "fetch",
      mockFetchRouter({
        "/ui/auth/resolve": {
          auth_mode: "sso",
          authorize_url: "https://accounts.feishu.cn/oauth/authorize?state=1",
          providers: [{ provider_id: "p1", label: "Log in with Feishu", name: "Feishu" }],
        },
      }),
    );
    const hrefDescriptor = Object.getOwnPropertyDescriptor(window, "location");
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        set href(value: string) {
          assignMock(value);
        },
        get href() {
          return "http://localhost/login";
        },
      },
    });

    const user = userEvent.setup();
    renderLoginRoutes();

    expect(await screen.findByText("sso@domain.test")).toBeInTheDocument();
    const ssoButton = await screen.findByRole("button", { name: "Log in with Feishu" });
    expect(
      screen.getByRole("link", { name: /切\s*换\s*用\s*户/ }),
    ).toBeInTheDocument();
    expect(assignMock).not.toHaveBeenCalled();

    await user.click(ssoButton);
    expect(assignMock).toHaveBeenCalledWith(
      "https://accounts.feishu.cn/oauth/authorize?state=1",
    );

    if (hrefDescriptor) {
      Object.defineProperty(window, "location", hrefDescriptor);
    }
  });

  it("shows SSO confirmation after continue instead of auto-redirecting", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchRouter({
        "/ui/auth/resolve": {
          auth_mode: "sso",
          authorize_url: "https://accounts.feishu.cn/oauth/authorize?state=2",
          providers: [{ provider_id: "p1", label: "Log in with Feishu", name: "Feishu" }],
        },
      }),
    );

    const user = userEvent.setup();
    renderLoginRoutes();

    await user.type(
      screen.getByLabelText(ZH.username),
      "sso@domain.test",
    );
    await user.click(screen.getByRole("button", { name: /继\s*续/ }));

    expect(await screen.findByText("sso@domain.test")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Log in with Feishu" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(ZH.password)).not.toBeInTheDocument();
  });

  it("does not show IdP links on password step even if providers are returned", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchRouter({
        "/ui/auth/resolve": {
          auth_mode: "password",
          providers: [
            { provider_id: "p1", label: "「Feishu」登录", name: "Feishu" },
          ],
        },
      }),
    );

    const user = userEvent.setup();
    renderLoginRoutes();

    await user.type(
      screen.getByLabelText(ZH.username),
      "admin@helixford.com",
    );
    await user.click(screen.getByRole("button", { name: /继\s*续/ }));

    expect(await screen.findByLabelText(ZH.password)).toBeInTheDocument();
    expect(screen.queryByText("「Feishu」登录")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Feishu/i })).not.toBeInTheDocument();
  });

  it("enters last used vault after login when user has multiple vaults", async () => {
    const vaults = [
      {
        vault_id: "00000000-0000-4000-8000-000000000001",
        domain_id: "domain.test",
        name: "Vault One",
        state: "Active",
      },
      {
        vault_id: "00000000-0000-4000-8000-000000000002",
        domain_id: "domain.test",
        name: "Vault Two",
        state: "Active",
      },
    ];
    vi.stubGlobal(
      "fetch",
      mockFetchRouter({
        "/ui/auth/resolve": passwordResolve,
        "/ui/auth/login": {
          session_token: "test-session-token",
          user_id: "user-1",
          home_domain_id: "domain.test",
          vaults,
          default_vault_id: vaults[1].vault_id,
        },
        "/ui/me/vaults": {
          user_id: "user-1",
          home_domain_id: "domain.test",
          vaults,
          default_vault_id: vaults[1].vault_id,
        },
        "/ui/me/selected-vault": {
          vault_id: vaults[1].vault_id,
          default_vault_id: vaults[1].vault_id,
        },
      }),
    );

    const user = userEvent.setup();
    renderLoginRoutes();

    await continueThenLogin(user, "navuser@domain.test", "Phase3-Nav-Password!");

    await waitFor(() => {
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Vault Two" }),
      ).toBeInTheDocument();
    });
    expect(localStorage.getItem("vivarcus.selected_vault_id")).toBe(vaults[1].vault_id);
  });

  it("does not loop loading when me/vaults returns chrome", async () => {
    const vaults = [
      {
        vault_id: "00000000-0000-4000-8000-000000000001",
        domain_id: "domain.test",
        name: "Vault One",
        state: "Active",
      },
      {
        vault_id: "00000000-0000-4000-8000-000000000002",
        domain_id: "domain.test",
        name: "Vault Two",
        state: "Active",
      },
    ];
    const fetchMock = mockFetchRouter({
        "/ui/auth/resolve": passwordResolve,
        "/ui/auth/login": {
          session_token: "test-session-token",
          user_id: "user-1",
          home_domain_id: "domain.test",
          vaults,
          default_vault_id: vaults[0].vault_id,
        },
        "/ui/me/vaults": {
          user_id: "user-1",
          home_domain_id: "domain.test",
          vaults,
          default_vault_id: vaults[0].vault_id,
          chrome: defaultAuthChrome,
        },
        "/ui/me/selected-vault": {
          vault_id: vaults[0].vault_id,
          default_vault_id: vaults[0].vault_id,
        },
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderLoginRoutes();

    await continueThenLogin(user, "navuser@domain.test", "Phase3-Nav-Password!");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Vault One" })).toBeInTheDocument();
    });

    await waitFor(() => {
      const meVaultsCalls = fetchMock.mock.calls.filter(([url]) => url === "/ui/me/vaults");
      expect(meVaultsCalls).toHaveLength(1);
    });

    await user.click(screen.getByRole("button", { name: "Vault One" }));

    await waitFor(() => {
      expect(screen.getByText("Vault Two")).toBeInTheDocument();
      expect(screen.getAllByText("Vault One").length).toBeGreaterThanOrEqual(1);
    });

    const meVaultsCalls = fetchMock.mock.calls.filter(([url]) => url === "/ui/me/vaults");
    expect(meVaultsCalls).toHaveLength(1);
  });

  it("shows vault names in the header dropdown", async () => {
    const vaults = [
      {
        vault_id: "00000000-0000-4000-8000-000000000001",
        domain_id: "platform.accept.vivarcus.com",
        name: "Acceptance Vault",
        state: "Active",
      },
      {
        vault_id: "00000000-0000-4000-8000-000000000002",
        domain_id: "platform.accept.vivarcus.com",
        name: "Acceptance QA Vault",
        state: "Active",
      },
    ];
    vi.stubGlobal(
      "fetch",
      mockFetchRouter({
        "/ui/auth/resolve": passwordResolve,
        "/ui/auth/login": {
          session_token: "test-session-token",
          user_id: "user-1",
          home_domain_id: "platform.accept.vivarcus.com",
          vaults,
          default_vault_id: vaults[0].vault_id,
        },
        "/ui/me/vaults": {
          user_id: "user-1",
          home_domain_id: "platform.accept.vivarcus.com",
          vaults,
          default_vault_id: vaults[0].vault_id,
        },
        "/ui/me/selected-vault": {
          vault_id: vaults[0].vault_id,
          default_vault_id: vaults[0].vault_id,
        },
      }),
    );

    const user = userEvent.setup();
    renderLoginRoutes();

    await continueThenLogin(
      user,
      "acceptuser@platform.accept.vivarcus.com",
      "Accept-Vivarcus!",
    );

    await user.click(await screen.findByRole("button", { name: "Acceptance Vault" }));

    await waitFor(() => {
      expect(screen.getByText("Acceptance QA Vault")).toBeInTheDocument();
      expect(screen.getAllByText("Acceptance Vault").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows API error message on failed login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url === "/ui/auth/resolve") {
          return Promise.resolve(
            mockFetchResponse({ ok: true, json: passwordResolve }),
          );
        }
        return Promise.resolve(
          mockFetchResponse({
            ok: false,
            status: 401,
            json: { error: "invalid credentials" },
          }),
        );
      }),
    );

    const user = userEvent.setup();
    renderLoginRoutes();

    await continueThenLogin(user, "bad@domain.test", "wrong");

    await waitFor(() => {
      expect(screen.getByText("invalid credentials")).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: "Vivarcus" })).toBeInTheDocument();
    expect(localStorage.getItem("vivarcus.session_token")).toBeNull();
  });

  it("trims leading and trailing whitespace from username on submit", async () => {
    const vaults = [
      {
        vault_id: "00000000-0000-4000-8000-000000000001",
        domain_id: "d",
        name: "Vault One",
        state: "Active",
      },
      {
        vault_id: "00000000-0000-4000-8000-000000000002",
        domain_id: "d",
        name: "Vault Two",
        state: "Active",
      },
    ];
    const fetchMock = mockFetchRouter({
      "/ui/auth/resolve": passwordResolve,
      "/ui/auth/login": {
        session_token: "tok",
        user_id: "u",
        home_domain_id: "d",
        vaults,
        default_vault_id: vaults[0].vault_id,
      },
      "/ui/me/vaults": {
        user_id: "u",
        home_domain_id: "d",
        vaults,
        default_vault_id: vaults[0].vault_id,
      },
      "/ui/me/selected-vault": {
        vault_id: vaults[0].vault_id,
        default_vault_id: vaults[0].vault_id,
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderLoginRoutes();

    await continueThenLogin(user, "  user@domain.test  ", "pw");

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/ui/auth/resolve",
        expect.objectContaining({
          body: JSON.stringify({
            username: "user@domain.test",
          }),
        }),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "/ui/auth/login",
        expect.objectContaining({
          body: JSON.stringify({
            username: "user@domain.test",
            password: "pw",
          }),
        }),
      );
    });
  });
});
