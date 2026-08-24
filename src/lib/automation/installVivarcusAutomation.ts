import { createVivarcusAutomation } from "./vivarcusAutomation";

/** Mount browser automation helpers on window.__vivarcus (DEV install or Playwright inject). */
export function installVivarcusAutomation(source: "dev" | "inject" = "dev"): void {
  if (typeof window === "undefined") {
    return;
  }
  const automation = createVivarcusAutomation();
  window.__vivarcus = {
    ...(window.__vivarcus ?? {}),
    ...automation,
    __source: source,
  };
}
