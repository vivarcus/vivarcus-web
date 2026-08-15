import { Button, Input } from "antd";
import { useEffect, useState } from "react";

type Props = {
  rangeLabel: string;
  currentPage: number;
  totalPages?: number;
  hasPrevious: boolean;
  hasNext: boolean;
  loading?: boolean;
  previousAria: string;
  nextAria: string;
  pageInputAria: string;
  onPrevious: () => void;
  onNext: () => void;
  onGoToPage: (page: number) => void;
};

export function ListPagination({
  rangeLabel,
  currentPage,
  totalPages,
  hasPrevious,
  hasNext,
  loading,
  previousAria,
  nextAria,
  pageInputAria,
  onPrevious,
  onNext,
  onGoToPage,
}: Props) {
  const [pageInput, setPageInput] = useState(String(currentPage));

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  function commitPageInput() {
    const parsed = Number.parseInt(pageInput, 10);
    if (!Number.isFinite(parsed)) {
      setPageInput(String(currentPage));
      return;
    }
    let target = Math.max(1, parsed);
    if (totalPages != null) {
      target = Math.min(totalPages, target);
    }
    setPageInput(String(target));
    if (target !== currentPage) {
      onGoToPage(target);
    }
  }

  return (
    <div className="list-pagination">
      <span className="list-pagination__meta">{rangeLabel}</span>
      <div className="list-pagination__nav">
        <Button
          type="text"
          className="list-pagination__arrow"
          disabled={!hasPrevious || loading}
          aria-label={previousAria}
          title={previousAria}
          onClick={onPrevious}
        >
          ‹
        </Button>
        <Input
          className="list-pagination__page-input"
          value={pageInput}
          disabled={loading}
          aria-label={pageInputAria}
          inputMode="numeric"
          onChange={(event) => setPageInput(event.target.value.replace(/[^\d]/g, ""))}
          onBlur={commitPageInput}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
        />
        {totalPages != null && (
          <>
            <span className="list-pagination__separator" aria-hidden="true">
              /
            </span>
            <span className="list-pagination__total">{totalPages}</span>
          </>
        )}
        <Button
          type="text"
          className="list-pagination__arrow"
          disabled={!hasNext || loading}
          aria-label={nextAria}
          title={nextAria}
          onClick={onNext}
        >
          ›
        </Button>
      </div>
    </div>
  );
}
