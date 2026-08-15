import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { Breadcrumb } from "./Breadcrumb";

function renderCrumbs(items: { label: string; to?: string }[]) {
  return render(
    <MemoryRouter>
      <Breadcrumb items={items} />
    </MemoryRouter>,
  );
}

describe("Breadcrumb", () => {
  it("links every crumb that has a target, including the last one", () => {
    renderCrumbs([
      { label: "Library", to: "/tabs/library__v" },
      { label: "Protocol Item", to: "/objects/edl_item__v/records/LFA001" },
    ]);

    expect(screen.getByRole("link", { name: "Library" })).toHaveAttribute(
      "href",
      "/tabs/library__v",
    );
    expect(screen.getByRole("link", { name: "Protocol Item" })).toHaveAttribute(
      "href",
      "/objects/edl_item__v/records/LFA001",
    );
  });

  it("marks a trailing crumb without a target as the current page", () => {
    renderCrumbs([
      { label: "Admin", to: "/admin/configuration" },
      { label: "Audit Trail" },
    ]);

    expect(screen.queryByRole("link", { name: "Audit Trail" })).toBeNull();
    expect(screen.getByText("Audit Trail")).toHaveAttribute("aria-current", "page");
  });

  it("renders nothing when there are no crumbs", () => {
    const { container } = renderCrumbs([]);
    expect(container.querySelector(".breadcrumb")).toBeNull();
  });
});
