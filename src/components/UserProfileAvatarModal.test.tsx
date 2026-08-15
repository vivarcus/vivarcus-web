import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UserProfileAvatarModal } from "./UserProfileAvatarModal";

describe("UserProfileAvatarModal", () => {
  it("renders when open", () => {
    render(
      <UserProfileAvatarModal
        open
        hasCustomAvatar={false}
        onCancel={vi.fn()}
        onConfirm={vi.fn(async () => {})}
      />,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("User Profile")).toBeInTheDocument();
    expect(screen.getByText("Use default image")).toBeInTheDocument();
    expect(screen.getByText("Upload an image:")).toBeInTheDocument();
  });

  it("calls onCancel from Cancel button", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <UserProfileAvatarModal
        open
        hasCustomAvatar={false}
        onCancel={onCancel}
        onConfirm={vi.fn(async () => {})}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
