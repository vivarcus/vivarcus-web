import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import type { FormSection } from "../api/types";
import { applyLookupDisplays, isLookupFormField } from "../lib/lookupForm";

type Params = {
  vaultId: string | undefined;
  objectApiName: string | undefined;
  objectTypeApiName?: string;
  fieldValues: Record<string, unknown>;
  sections: FormSection[];
  enabled: boolean;
};

const EMPTY_SECTIONS: FormSection[] = [];

export function useLookupDisplays({
  vaultId,
  objectApiName,
  objectTypeApiName,
  fieldValues,
  sections,
  enabled,
}: Params) {
  const [displays, setDisplays] = useState<Record<string, unknown>>({});
  const [evaluating, setEvaluating] = useState(false);
  const requestId = useRef(0);
  const skipInitial = useRef(true);
  const wasActiveRef = useRef(false);
  const stableSections = sections.length > 0 ? sections : EMPTY_SECTIONS;
  const hasLookupFields = stableSections.some((section) =>
    section.elements.some(isLookupFormField),
  );

  useEffect(() => {
    skipInitial.current = true;
  }, [vaultId, objectApiName, objectTypeApiName]);

  useEffect(() => {
    const active = enabled && hasLookupFields && Boolean(vaultId && objectApiName);
    if (!active) {
      if (wasActiveRef.current) {
        setDisplays({});
        setEvaluating(false);
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
      void api
        .evaluateLookupDisplays(vaultId!, {
          object_api_name: objectApiName!,
          object_type_api_name: objectTypeApiName,
          field_values: fieldValues,
        })
        .then((res) => {
          if (requestId.current !== id) {
            return;
          }
          setDisplays(res.displays ?? {});
        })
        .catch(() => {
          if (requestId.current !== id) {
            return;
          }
          setDisplays({});
        })
        .finally(() => {
          if (requestId.current === id) {
            setEvaluating(false);
          }
        });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [enabled, hasLookupFields, vaultId, objectApiName, objectTypeApiName, fieldValues, stableSections]);

  return { displays, evaluating };
}
