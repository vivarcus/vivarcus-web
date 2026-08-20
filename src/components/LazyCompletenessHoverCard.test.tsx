import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { api } from "../api/client";
import { UiProvider } from "../context/UiContext";
import { LazyCompletenessHoverCard } from "./LazyCompletenessHoverCard";

vi.mock("../api/client", () => ({
  api: {
    completenessHover: vi.fn(),
  },
}));

describe("LazyCompletenessHoverCard", () => {
  beforeEach(() => {
    vi.mocked(api.completenessHover).mockReset();
  });

  it("fetches hover details for one milestone", async () => {
    vi.mocked(api.completenessHover).mockResolvedValue({
      milestone_name: "Site Initiation",
      milestone_record_id: "V0MS0001",
      percent_complete: "50%",
    });

    render(
      <MemoryRouter>
        <UiProvider>
          <LazyCompletenessHoverCard recordId="V0MS0001" vaultId="vault-1" />
        </UiProvider>
      </MemoryRouter>,
    );

    expect(api.completenessHover).toHaveBeenCalledWith("vault-1", "V0MS0001");
    await waitFor(() => {
      expect(screen.getByText("Site Initiation")).toBeInTheDocument();
    });
  });
});
