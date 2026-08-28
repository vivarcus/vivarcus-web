import { useCallback, useEffect, useRef, useState } from "react";
import type { AuditPanelModel } from "../api/types";
import { auditChromeFromModel } from "../lib/auditPanel";
import { defaultAuditChrome, displayText } from "../lib/i18n";

type Options = {
  enabled?: boolean;
  fetchPanel: (pageToken?: string) => Promise<AuditPanelModel>;
  loadFailedMessage?: string;
  retryWhenEmpty?: (panel: AuditPanelModel) => boolean;
  retryIntervalMs?: number;
  maxEmptyRetries?: number;
};

export function useAuditPanelLoader({
  enabled = true,
  fetchPanel,
  loadFailedMessage = displayText(defaultAuditChrome.load_logs_failed),
  retryWhenEmpty,
  retryIntervalMs = 2000,
  maxEmptyRetries = 6,
}: Options) {
  const [panel, setPanel] = useState<AuditPanelModel | null>(null);
  const [pageToken, setPageToken] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const emptyRetries = useRef(0);

  useEffect(() => {
    emptyRetries.current = 0;
  }, [fetchPanel]);

  const load = useCallback(
    async (token?: string) => {
      if (!enabled) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPanel(token);
        setPanel(data);
        setPageToken(token);
      } catch (err) {
        setError(err instanceof Error ? err.message : loadFailedMessage);
        if (!token) {
          setPanel(null);
        }
      } finally {
        setLoading(false);
      }
    },
    [enabled, fetchPanel, loadFailedMessage],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!enabled || loading || error || !panel || pageToken) {
      return;
    }
    if (!retryWhenEmpty?.(panel) || emptyRetries.current >= maxEmptyRetries) {
      return;
    }
    const timer = window.setTimeout(() => {
      emptyRetries.current += 1;
      void load();
    }, retryIntervalMs);
    return () => window.clearTimeout(timer);
  }, [
    enabled,
    loading,
    error,
    panel,
    pageToken,
    load,
    retryWhenEmpty,
    retryIntervalMs,
    maxEmptyRetries,
  ]);

  return {
    panel,
    pageToken,
    error,
    loading,
    load,
    auditChrome: auditChromeFromModel(panel),
  };
}
