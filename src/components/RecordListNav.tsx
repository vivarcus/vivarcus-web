import { Button } from "antd";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { defaultPageMessages, displayText, displayTextTemplate } from "../lib/i18n";
import type { PageMessages } from "../lib/i18n/chromeTypes";
import { resolveListRecordNav, type RecordNavState } from "../lib/vaultNav";

type Props = {
  objectName: string;
  recordId: string;
  layout?: string;
  pageApiName?: string;
  tabApiName?: string;
  tabLabel?: string;
  objectLabel?: string;
  recordIndex?: number;
  recordTotal?: number;
  pageStart?: number;
  pageRecordIds?: string[];
  messages?: Partial<PageMessages>;
  disabled?: boolean;
};

/** List position + prev/next chevrons (Veeva header top-right, beside breadcrumb). */
export function RecordListNav({
  objectName,
  recordId,
  layout,
  pageApiName,
  tabApiName,
  tabLabel,
  objectLabel,
  recordIndex: recordIndexProp,
  recordTotal,
  pageStart,
  pageRecordIds,
  messages: messagesProp,
  disabled = false,
}: Props) {
  const navigate = useNavigate();
  const messages = { ...defaultPageMessages, ...(messagesProp ?? {}) };

  const resolved = useMemo(
    () =>
      resolveListRecordNav(
        { pageRecordIds, pageStart, recordIndex: recordIndexProp, recordTotal },
        recordId,
      ),
    [pageRecordIds, pageStart, recordIndexProp, recordTotal, recordId],
  );

  const { prevRecordId, nextRecordId, recordIndex, pageRecordIds: ids } = resolved;
  const showPosition =
    recordIndex !== undefined && recordTotal !== undefined && recordTotal > 0;
  const showRecordNav = Boolean(
    ids.length &&
      (prevRecordId || nextRecordId || (recordTotal !== undefined && recordTotal > 1)),
  );

  if (!showPosition && !showRecordNav) {
    return null;
  }

  function navigateRecord(targetRecordId: string) {
    const target = resolveListRecordNav(
      {
        pageRecordIds: ids,
        pageStart: resolved.pageStart,
        recordTotal,
      },
      targetRecordId,
    );
    const navState: RecordNavState = {
      tabApiName,
      tabLabel,
      objectLabel,
      recordIndex: target.recordIndex,
      recordTotal,
      pageStart: resolved.pageStart,
      pageRecordIds: ids,
    };
    const params = new URLSearchParams();
    if (layout) params.set("layout", layout);
    if (tabApiName) params.set("tab", tabApiName);
    if (pageApiName) params.set("page", pageApiName);
    const suffix = params.toString() ? `?${params}` : "";
    navigate(
      `/objects/${encodeURIComponent(objectName)}/records/${encodeURIComponent(targetRecordId)}${suffix}`,
      { state: navState },
    );
  }

  return (
    <div className="record-list-nav">
      {showPosition && (
        <span className="record-list-nav__position">
          {displayTextTemplate(messages.record_list_position, {
            index: recordIndex,
            total: recordTotal,
          })}
        </span>
      )}
      {showRecordNav && (
        <div className="record-list-nav__buttons">
          <Button
            type="text"
            size="small"
            className="record-list-nav__btn"
            aria-label={displayText(messages.prev_record)}
            title={displayText(messages.prev_record)}
            disabled={!prevRecordId || disabled}
            onClick={() => prevRecordId && navigateRecord(prevRecordId)}
          >
            ‹
          </Button>
          <Button
            type="text"
            size="small"
            className="record-list-nav__btn"
            aria-label={displayText(messages.next_record)}
            title={displayText(messages.next_record)}
            disabled={!nextRecordId || disabled}
            onClick={() => nextRecordId && navigateRecord(nextRecordId)}
          >
            ›
          </Button>
        </div>
      )}
    </div>
  );
}
