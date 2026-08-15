import { createVivarcusAutomation } from "./vivarcusAutomation";

/** Mount browser automation helpers on window.__vivarcus (dev / local acceptance only). */
export function installVivarcusAutomation(): void {
  if (typeof window === "undefined") {
    return;
  }
  const automation = createVivarcusAutomation();
  window.__vivarcus = {
    ...(window.__vivarcus ?? {}),
    ...automation,
  };
}
