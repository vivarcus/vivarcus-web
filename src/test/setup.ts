import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, vi } from "vitest";
import { clearSession } from "../auth/session";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;

// user-event 14 captures `document` at module load. Vitest/jsdom may recreate
// the document between files, leaving setup() with an undefined/stale document
// (`Symbol(Node prepared with document state workarounds)`). Always bind the
// current jsdom document at call time.
const originalUserEventSetup = userEvent.setup.bind(userEvent);
userEvent.setup = ((options?: Parameters<typeof userEvent.setup>[0]) =>
  originalUserEventSetup({
    ...options,
    document: options?.document ?? globalThis.document,
  })) as typeof userEvent.setup;

beforeEach(() => {
  clearSession();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
});
