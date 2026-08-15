import { useEffect, useMemo, useRef } from "react";
import { api } from "../api/client";
import type { PageSection } from "../api/types";
import {
  collectRelatedSectionCountTargets,
  relatedSectionRowCount,
} from "../lib/relatedSectionCount";

/** Cap parallel count_only prefetch so study-detail pages (~18 sections) do not
 *  exhaust the shared data-plane DB pool and starve login membership snapshots. */
const COUNT_PREFETCH_CONCURRENCY = 4;

type Options = {
  vaultId: string | undefined;
  sections: PageSection[];
  expandedSections: Set<string>;
  onCountChange: (sectionId: string, total: number | undefined) => void;
  resetKey?: number;
  enabled?: boolean;
};

export function useRelatedSectionCountPrefetch({
  vaultId,
  sections,
  expandedSections,
  onCountChange,
  resetKey = 0,
  enabled = true,
}: Options) {
  const loadedRef = useRef<Map<string, string>>(new Map());
  const onCountChangeRef = useRef(onCountChange);
  onCountChangeRef.current = onCountChange;

  const targets = useMemo(() => collectRelatedSectionCountTargets(sections), [sections]);
  const targetsKey = useMemo(
    () => targets.map((target) => `${target.sectionId}:${target.token}`).join("|"),
    [targets],
  );
  const expandedKey = useMemo(
    () => [...expandedSections].sort().join(","),
    [expandedSections],
  );

  useEffect(() => {
    loadedRef.current.clear();
  }, [targetsKey, resetKey]);

  useEffect(() => {
    if (!enabled || !vaultId || targets.length === 0) {
      return;
    }

    const validSectionIds = new Set(targets.map((target) => target.sectionId));
    for (const sectionId of loadedRef.current.keys()) {
      if (!validSectionIds.has(sectionId)) {
        loadedRef.current.delete(sectionId);
      }
    }

    const pending = targets.filter(({ sectionId, token }) => {
      if (expandedSections.has(sectionId)) {
        loadedRef.current.delete(sectionId);
        return false;
      }
      if (loadedRef.current.get(sectionId) === token) {
        return false;
      }
      loadedRef.current.set(sectionId, token);
      return true;
    });

    if (pending.length === 0) {
      return;
    }

    let cancelled = false;
    let nextIndex = 0;

    const runOne = async (sectionId: string, token: string) => {
      try {
        const data = await api.loadRelatedSection(vaultId, {
          section_context_token: token,
          count_only: true,
        });
        if (!cancelled) {
          onCountChangeRef.current(sectionId, relatedSectionRowCount(data));
        }
      } catch {
        loadedRef.current.delete(sectionId);
        if (!cancelled) {
          onCountChangeRef.current(sectionId, undefined);
        }
      }
    };

    const worker = async () => {
      while (!cancelled) {
        const index = nextIndex++;
        if (index >= pending.length) {
          return;
        }
        const { sectionId, token } = pending[index]!;
        await runOne(sectionId, token);
      }
    };

    const workers = Array.from(
      { length: Math.min(COUNT_PREFETCH_CONCURRENCY, pending.length) },
      () => worker(),
    );
    void Promise.all(workers);

    return () => {
      cancelled = true;
    };
  }, [enabled, vaultId, targets, targetsKey, expandedKey, expandedSections, resetKey]);
}
