import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { LayoutRuleEffects } from "../api/types";
import { defaultShellChrome, displayText } from "../lib/i18n";

type Params = {
  vaultId: string | undefined;
  objectApiName: string | undefined;
  objectTypeApiName?: string;
  layoutApiName: string | undefined;
  fieldValues: Record<string, unknown>;
  /** When false, skip live re-evaluation (initial server effects still apply). */
  liveEvaluation?: boolean;
  enabled: boolean;
};

export function useLayoutRuleEffects({
  vaultId,
  objectApiName,
  objectTypeApiName,
  layoutApiName,
  fieldValues,
  liveEvaluation = true,
  enabled,
}: Params) {
  const [effects, setEffects] = useState<LayoutRuleEffects | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const skipInitial = useRef(true);
  const wasActiveRef = useRef(false);

  useEffect(() => {
    skipInitial.current = true;
  }, [vaultId, objectApiName, layoutApiName]);

  useEffect(() => {
    const active =
      enabled && liveEvaluation && Boolean(vaultId && objectApiName && layoutApiName);
    if (!active) {
      if (wasActiveRef.current) {
        setEffects(null);
        setEvaluating(false);
        setError(null);
      }
      wasActiveRef.current = false;
      return;
    }
    wasActiveRef.current = true;

    if (skipInitial.current) {
      skipInitial.current = false;
      return;
    }

    const id = ++requestId.current;
    const timer = window.setTimeout(() => {
      setEvaluating(true);
      setError(null);
      void api
        .evaluateLayoutRules(vaultId!, {
          object_api_name: objectApiName!,
          layout_api_name: layoutApiName!,
          object_type_api_name: objectTypeApiName,
          field_values: fieldValues,
        })
        .then((res) => {
          if (requestId.current !== id) return;
          setEffects(res);
        })
        .catch((err: unknown) => {
          if (requestId.current !== id) return;
          setEffects(null);
          setError(err instanceof Error ? err.message : displayText(defaultShellChrome.layout_rules_failed));
        })
        .finally(() => {
          if (requestId.current === id) {
            setEvaluating(false);
          }
        });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [
    enabled,
    liveEvaluation,
    vaultId,
    objectApiName,
    objectTypeApiName,
    layoutApiName,
    fieldValues,
  ]);

  return { effects, evaluating, error };
}
