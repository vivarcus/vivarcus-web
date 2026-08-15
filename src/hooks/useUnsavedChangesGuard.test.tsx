import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { useUnsavedChangesGuard } from "./useUnsavedChangesGuard";

function GuardProbe({ when }: { when: boolean }) {
  useUnsavedChangesGuard(when);
  return <div>ok</div>;
}

describe("useUnsavedChangesGuard", () => {
  it("renders under a data router without throwing", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const router = createMemoryRouter([{ path: "/", element: <GuardProbe when={false} /> }]);

    expect(() => render(<RouterProvider router={router} />)).not.toThrow();

    expect(screen.getByText("ok")).toBeInTheDocument();
    error.mockRestore();
  });
});
