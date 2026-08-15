import { displayText } from "../lib/i18n/displayText";
import type { DisplayText } from "../lib/i18n/types";
import "../styles/components/vault-ai-thinking.css";

export type VaultAIThinkingStage = "thinking" | "searching" | "generating";

export function vaultAIThinkingLabel(
  chrome: {
    thinking: DisplayText;
    thinking_searching?: DisplayText;
    thinking_generating?: DisplayText;
  },
  stage?: string | null,
): string {
  if (stage === "searching") {
    return displayText(chrome.thinking_searching, displayText(chrome.thinking));
  }
  if (stage === "generating") {
    return displayText(chrome.thinking_generating, displayText(chrome.thinking));
  }
  return displayText(chrome.thinking);
}

export function VaultAIThinkingIndicator({ label }: { label: string }) {
  return (
    <span className="vault-ai-thinking" role="status" aria-live="polite" aria-label={label}>
      <span className="vault-ai-thinking__dots" aria-hidden>
        <span />
        <span />
        <span />
      </span>
      <span className="vault-ai-thinking__label">{label}</span>
    </span>
  );
}
