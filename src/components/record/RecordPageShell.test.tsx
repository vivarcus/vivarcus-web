import { LockOutlined } from "@ant-design/icons";
import { Alert } from "antd";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecordPageBody, RecordPageShell } from "./RecordPageShell";
import { RecordPageHeader } from "./RecordPageHeader";

describe("RecordPageShell", () => {
  it("renders record page structure with header, alerts, and body", () => {
    const { container } = render(
      <RecordPageShell
        header={
          <RecordPageHeader
            breadcrumb={[{ label: "Studies" }]}
            title="Study: Alpha"
          />
        }
        alerts={<Alert type="error" title="Load failed" showIcon role="alert" />}
        body={
          <RecordPageBody>
            <p>Main content</p>
          </RecordPageBody>
        }
      />,
    );

    expect(container.querySelector(".record-page")).toBeTruthy();
    expect(container.querySelector(".record-page__header .page-header--record")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Study: Alpha" })).toBeTruthy();
    expect(screen.getByText("Load failed")).toBeTruthy();
    expect(screen.getByText("Main content")).toBeTruthy();
    expect(container.querySelector(".record-page__body .record-page__main")).toBeTruthy();
  });

  it("places list nav on the top row beside the breadcrumb", () => {
    const { container } = render(
      <RecordPageHeader
        breadcrumb={[{ label: "Studies" }]}
        title="Study: Alpha"
        nav={<span data-testid="list-nav">1 of 3 records in this list</span>}
        actions={<button type="button">Edit</button>}
      />,
    );

    const topRow = container.querySelector(".page-header__top-row");
    const titleRow = container.querySelector(".page-header__title-row");
    expect(topRow).toContainElement(screen.getByText("Studies"));
    expect(topRow).toContainElement(screen.getByTestId("list-nav"));
    expect(titleRow).toContainElement(screen.getByRole("heading", { name: "Study: Alpha" }));
    expect(titleRow).toContainElement(screen.getByRole("button", { name: "Edit" }));
  });

  it("renders checkout lock indicator next to the document title", () => {
    render(
      <RecordPageHeader
        breadcrumb={[{ label: "Library" }]}
        title="Quality Plan (v1.1)"
        trailing={
          <span
            className="record-checkout-lock"
            title="Checked out by you"
            aria-label="Checked out by you"
            data-testid="record-checkout-lock"
          >
            <LockOutlined aria-hidden="true" />
          </span>
        }
      />,
    );

    expect(screen.getByRole("heading", { name: "Quality Plan (v1.1)" })).toBeTruthy();
    expect(screen.getByTestId("record-checkout-lock")).toHaveAttribute(
      "aria-label",
      "Checked out by you",
    );
  });
});
