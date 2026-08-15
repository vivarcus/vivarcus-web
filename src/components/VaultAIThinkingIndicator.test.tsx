import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VaultAIThinkingIndicator, vaultAIThinkingLabel } from "./VaultAIThinkingIndicator";

describe("VaultAIThinkingIndicator", () => {
  it("exposes the thinking label to assistive tech", () => {
    render(<VaultAIThinkingIndicator label="正在思考" />);
    expect(screen.getByRole("status", { name: "正在思考" })).toBeInTheDocument();
    expect(screen.getByText("正在思考")).toBeInTheDocument();
  });

  it("maps progress stages to localized labels", () => {
    const chrome = {
      thinking: { text: "正在思考", key: "system:vault_ai.thinking" },
      thinking_searching: { text: "正在查询", key: "system:vault_ai.thinking_searching" },
      thinking_generating: { text: "正在生成回复", key: "system:vault_ai.thinking_generating" },
    };
    expect(vaultAIThinkingLabel(chrome, "thinking")).toBe("正在思考");
    expect(vaultAIThinkingLabel(chrome, "searching")).toBe("正在查询");
    expect(vaultAIThinkingLabel(chrome, "generating")).toBe("正在生成回复");
    expect(vaultAIThinkingLabel(chrome, undefined)).toBe("正在思考");
  });
});
