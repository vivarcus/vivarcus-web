/// <reference types="vite/client" />

import type { VivarcusAutomation } from "./lib/automation/vivarcusAutomation";

declare global {
  interface Window {
    __vivarcus?: VivarcusAutomation & Record<string, unknown>;
  }
}

export {};
