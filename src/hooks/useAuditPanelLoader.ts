import { useCallback, useEffect, useState } from "react";
import type { AuditPanelModel } from "../api/types";
import { auditChromeFromModel } from "../lib/auditPanel";
import { defaultAuditChrome, displayText } from "../lib/i18n";

type Options = {
  enabled?: boolean;
  fetchPanel: (pageToken?: string) => Promise<AuditPanelModel>;
  loadFailedMessage?: string;
};

export function useAuditPanelLoader({
  enabled = true,
  fetchPanel,
  loadFailedMessage = displayText(defaultAuditChrome.load_logs_failed),
}: Options) {
  const [panel, setPanel] = useState<AuditPanelModel | null>(null);
  const [pageToken, setPageToken] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (token?: string) => {
      if (!enabled) return;
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

  return {
    panel,
    pageToken,
    error,
    loading,
    load,
    auditChrome: auditChromeFromModel(panel),
  };
}
