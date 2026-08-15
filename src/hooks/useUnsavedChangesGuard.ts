import { useEffect } from "react";
import { useBlocker, useBeforeUnload } from "react-router-dom";
import { displayText } from "../lib/i18n";
import { defaultShellChrome } from "../lib/i18n/chromeTypes";

export function useUnsavedChangesGuard(when: boolean) {
  const message = displayText(defaultShellChrome.unsaved_confirm);

  useBeforeUnload(
    (event) => {
      if (!when) return;
      event.preventDefault();
    },
    { capture: true },
  );

  const blocker = useBlocker(when);

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm(message)) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker, message]);
}
