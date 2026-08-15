import { useEffect, useRef, useState } from "react";
import { api } from "../../api/client";
import { applyMention, findMentionQuery, normalizeMentionIds } from "../../lib/annotateMentions";

export type MentionCandidate = {
  user_id: string;
  label: string;
};

type Props = {
  vaultId: string;
  value: string;
  mentionedUserIds: string[];
  rows?: number;
  placeholder?: string;
  emptyLabel?: string;
  loadingLabel?: string;
  disabled?: boolean;
  testId?: string;
  onChange: (next: { text: string; mentionedUserIds: string[] }) => void;
};

export function AnnotationMentionField({
  vaultId,
  value,
  mentionedUserIds,
  rows = 3,
  placeholder,
  emptyLabel = "No users",
  loadingLabel = "…",
  disabled,
  testId,
  onChange,
}: Props) {
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const [caret, setCaret] = useState(0);
  const [options, setOptions] = useState<MentionCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const active = findMentionQuery(value, caret);

  useEffect(() => {
    if (!active || disabled) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(() => {
      setLoading(true);
      void api
        .domainUserOptions(vaultId, active.query, 8)
        .then((res) => {
          if (cancelled) {
            return;
          }
          setOptions(
            (res.options ?? []).map((opt) => ({
              user_id: opt.user_id,
              label: opt.display_name || opt.label || opt.username,
            })),
          );
        })
        .catch(() => {
          if (!cancelled) {
            setOptions([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [active?.query, active?.start, vaultId, disabled]);

  function pick(option: MentionCandidate) {
    const next = applyMention(value, caret, option.label);
    onChange({
      text: next.text,
      mentionedUserIds: normalizeMentionIds([...mentionedUserIds, option.user_id]),
    });
    setOptions([]);
    window.requestAnimationFrame(() => {
      const el = areaRef.current;
      if (!el) {
        return;
      }
      el.focus();
      el.setSelectionRange(next.caret, next.caret);
      setCaret(next.caret);
    });
  }

  return (
    <div className="document-viewer__mention-field">
      <textarea
        ref={areaRef}
        value={value}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        data-testid={testId}
        onChange={(e) => {
          setCaret(e.target.selectionStart ?? e.target.value.length);
          onChange({ text: e.target.value, mentionedUserIds });
        }}
        onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
        onKeyUp={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
        onClick={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
      />
      {active ? (
        <ul className="document-viewer__mention-menu" data-testid="annotation-mention-menu">
          {loading ? (
            <li className="document-viewer__mention-empty">{loadingLabel}</li>
          ) : options.length === 0 ? (
            <li className="document-viewer__mention-empty">{emptyLabel}</li>
          ) : (
            options.map((opt) => (
              <li key={opt.user_id}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(opt)}>
                  @{opt.label}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
