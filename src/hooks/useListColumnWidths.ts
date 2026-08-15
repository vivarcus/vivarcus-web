import { useCallback, useEffect, useRef, useState } from "react";

type Options = {
  fingerprint?: string | null;
  initialWidths?: Record<string, number>;
  persist: (widths: Record<string, number>) => Promise<void>;
};

export function useListColumnWidths({ fingerprint, initialWidths, persist }: Options) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(initialWidths ?? {});
  const saveTimerRef = useRef<number | null>(null);
  const persistRef = useRef(persist);

  persistRef.current = persist;

  useEffect(() => {
    setColumnWidths(initialWidths ?? {});
  }, [fingerprint]);

  useEffect(
    () => () => {
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
      }
    },
    [],
  );

  const onColumnWidthChange = useCallback((fieldApiName: string, width: number) => {
    setColumnWidths((prev) => {
      const nextWidths = { ...prev, [fieldApiName]: width };
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null;
        void persistRef.current(nextWidths);
      }, 400);
      return nextWidths;
    });
  }, []);

  return { columnWidths, onColumnWidthChange };
}
