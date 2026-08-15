import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

describe("userEvent.setup", () => {
  it("binds the current jsdom document", async () => {
    expect(globalThis.document).toBeDefined();
    const user = userEvent.setup();
    document.body.innerHTML = '<button type="button">go</button>';
    await user.click(document.querySelector("button")!);
    expect(document.querySelector("button")).toBeTruthy();
  });
});
