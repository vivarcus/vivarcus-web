import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  TAB_NAV_MORE_BUTTON_WIDTH,
  computeVisibleTabCount,
} from "../lib/tabNavOverflow";

export function useTabNavOverflow(itemCount: number, resetKey: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRowRef = useRef<HTMLDivElement>(null);
  const prefixMeasureRef = useRef<HTMLDivElement>(null);
  const moreMeasureRef = useRef<HTMLButtonElement>(null);
  const [visibleCount, setVisibleCount] = useState(itemCount);

  const recalculate = useCallback(() => {
    const container = containerRef.current;
    const measureRow = measureRowRef.current;
    if (!container || !measureRow) {
      setVisibleCount(itemCount);
      return;
    }

    const prefixWidth = prefixMeasureRef.current?.offsetWidth ?? 0;
    const itemWidths = Array.from(
      measureRow.querySelectorAll<HTMLElement>(".tab-nav__measure-item"),
    ).map((element) => element.offsetWidth);
    const moreButtonWidth =
      moreMeasureRef.current?.offsetWidth ?? TAB_NAV_MORE_BUTTON_WIDTH;

    setVisibleCount(
      computeVisibleTabCount(
        container.clientWidth,
        prefixWidth,
        itemWidths,
        moreButtonWidth,
      ),
    );
  }, [itemCount]);

  useLayoutEffect(() => {
    setVisibleCount(itemCount);
    recalculate();
  }, [itemCount, resetKey, recalculate]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }
    const observer = new ResizeObserver(() => recalculate());
    observer.observe(container);
    return () => observer.disconnect();
  }, [recalculate]);

  const overflowCount = Math.max(0, itemCount - visibleCount);

  return {
    containerRef,
    measureRowRef,
    prefixMeasureRef,
    moreMeasureRef,
    visibleCount,
    overflowCount,
    recalculate,
  };
}
