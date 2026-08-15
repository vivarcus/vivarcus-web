import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation, useParams } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { defaultPageMessages, displayText } from "../lib/i18n";
import type { RecordNavState } from "../lib/vaultNav";
import { RecordListNav } from "./RecordListNav";

function LocationProbe() {
  const location = useLocation();
  const { recordId } = useParams();
  return (
    <pre data-testid="nav-state">
      {JSON.stringify({ recordId, state: (location.state as RecordNavState) ?? null })}
    </pre>
  );
}

function NavHarness({
  initialRecordId,
  recordIndex,
  pageStart = 1,
}: {
  initialRecordId: string;
  recordIndex: number;
  pageStart?: number;
}) {
  const { recordId = initialRecordId } = useParams();
  const location = useLocation();
  const state = (location.state as RecordNavState | null) ?? {
    tabApiName: "studies",
    tabLabel: "Studies",
    recordIndex,
    recordTotal: 3,
    pageStart,
    pageRecordIds: ["r1", "r2", "r3"],
  };

  return (
    <>
      <RecordListNav
        objectName="study__v"
        recordId={recordId}
        tabApiName={state.tabApiName}
        tabLabel={state.tabLabel}
        recordIndex={state.recordIndex}
        recordTotal={state.recordTotal}
        pageStart={state.pageStart}
        pageRecordIds={state.pageRecordIds}
      />
      <LocationProbe />
    </>
  );
}

describe("RecordListNav", () => {
  it("shows list position and prev/next beside each other", () => {
    render(
      <MemoryRouter>
        <RecordListNav
          objectName="study__v"
          recordId="r2"
          recordIndex={2}
          recordTotal={5}
          pageStart={1}
          pageRecordIds={["r1", "r2", "r3"]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("2 of 5 records in this list")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: displayText(defaultPageMessages.prev_record) })).toBeEnabled();
    expect(screen.getByRole("button", { name: displayText(defaultPageMessages.next_record) })).toBeEnabled();
  });

  it("disables prev on the first record of the current page", () => {
    render(
      <MemoryRouter>
        <RecordListNav
          objectName="study__v"
          recordId="r1"
          recordIndex={1}
          recordTotal={5}
          pageStart={1}
          pageRecordIds={["r1", "r2"]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: displayText(defaultPageMessages.prev_record) })).toBeDisabled();
    expect(screen.getByRole("button", { name: displayText(defaultPageMessages.next_record) })).toBeEnabled();
  });

  it("navigates to the next record while preserving list context", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/objects/study__v/records/r1",
            state: {
              tabApiName: "studies",
              tabLabel: "Studies",
              recordIndex: 1,
              recordTotal: 3,
              pageStart: 1,
              pageRecordIds: ["r1", "r2", "r3"],
            },
          },
        ]}
      >
        <Routes>
          <Route
            path="/objects/:objectName/records/:recordId"
            element={<NavHarness initialRecordId="r1" recordIndex={1} />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: displayText(defaultPageMessages.next_record) }));

    expect(JSON.parse(screen.getByTestId("nav-state").textContent ?? "null")).toEqual({
      recordId: "r2",
      state: {
        tabApiName: "studies",
        tabLabel: "Studies",
        recordIndex: 2,
        recordTotal: 3,
        pageStart: 1,
        pageRecordIds: ["r1", "r2", "r3"],
      },
    });
  });

  it("navigates to the previous record and decrements the list position", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/objects/study__v/records/r3",
            state: {
              tabApiName: "studies",
              tabLabel: "Studies",
              recordIndex: 3,
              recordTotal: 3,
              pageStart: 1,
              pageRecordIds: ["r1", "r2", "r3"],
            },
          },
        ]}
      >
        <Routes>
          <Route
            path="/objects/:objectName/records/:recordId"
            element={<NavHarness initialRecordId="r3" recordIndex={3} />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: displayText(defaultPageMessages.prev_record) }));

    expect(JSON.parse(screen.getByTestId("nav-state").textContent ?? "null")).toEqual({
      recordId: "r2",
      state: {
        tabApiName: "studies",
        tabLabel: "Studies",
        recordIndex: 2,
        recordTotal: 3,
        pageStart: 1,
        pageRecordIds: ["r1", "r2", "r3"],
      },
    });
    expect(screen.getByText("2 of 3 records in this list")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: displayText(defaultPageMessages.prev_record) })).toBeEnabled();
    expect(screen.getByRole("button", { name: displayText(defaultPageMessages.next_record) })).toBeEnabled();
  });
});
