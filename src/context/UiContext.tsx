import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import type { DisplayContext } from "../lib/i18n/types";
import { normalizeIntlLocale } from "../lib/i18n/dateFormat";
import { defaultDisplayContext } from "../lib/i18n/types";
import { defaultShellChrome, type ShellChrome } from "../lib/i18n/chromeTypes";

type UiContextValue = {
  displayContext: DisplayContext;
  shell: ShellChrome;
};

const UiContext = createContext<UiContextValue>({
  displayContext: defaultDisplayContext,
  shell: defaultShellChrome,
});

export function UiProvider({
  displayContext,
  shell,
  children,
}: {
  displayContext?: DisplayContext;
  shell?: ShellChrome;
  children: ReactNode;
}) {
  const value: UiContextValue = useMemo(
    () => ({
      displayContext: displayContext ?? defaultDisplayContext,
      // Navigation chrome from the server is partial; merge so client-only labels stay available.
      shell: {
        ...defaultShellChrome,
        ...shell,
        document_viewer: {
          ...defaultShellChrome.document_viewer,
          ...shell?.document_viewer,
        },
        vault_ai: {
          ...defaultShellChrome.vault_ai,
          ...shell?.vault_ai,
        },
        domain_user: {
          ...defaultShellChrome.domain_user,
          ...shell?.domain_user,
        },
        operations: {
          ...defaultShellChrome.operations,
          ...shell?.operations,
        },
        deployment: {
          ...defaultShellChrome.deployment,
          ...shell?.deployment,
        },
        configuration: {
          ...defaultShellChrome.configuration,
          ...shell?.configuration,
        },
        completeness_hover: {
          ...defaultShellChrome.completeness_hover,
          ...shell?.completeness_hover,
        },
        cfg_packaging: {
          ...defaultShellChrome.cfg_packaging,
          ...shell?.cfg_packaging,
        },
      },
    }),
    [displayContext, shell],
  );

  useEffect(() => {
    const lang =
      normalizeIntlLocale(value.displayContext.locale) ||
      value.displayContext.language ||
      "en";
    document.documentElement.lang = lang;
  }, [value.displayContext]);

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi() {
  return useContext(UiContext);
}
