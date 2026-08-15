import { Alert, Select, Spin } from "antd";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import type { BinderTreeModel } from "../../api/types";
import { displayText } from "../../lib/i18n";
import { BinderTreePanel } from "./BinderTreePanel";

type Props = {
  vaultId: string;
  objectName: string;
  recordId: string;
};

export function BinderContextPanel({ vaultId, objectName, recordId }: Props) {
  const [model, setModel] = useState<BinderTreeModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [binderId, setBinderId] = useState<string | undefined>();

  const load = useCallback(async () => {
    if (!vaultId || !objectName || !recordId) return;
    setLoading(true);
    setError(null);
    try {
      const next = await api.binderTree(vaultId, {
        binderId,
        contextObject: objectName,
        contextRecord: recordId,
        readonly: true,
      });
      setModel(next);
      if (!binderId && next.binder_id) {
        setBinderId(next.binder_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(undefined, "Failed to load Binder"));
    } finally {
      setLoading(false);
    }
  }, [vaultId, objectName, recordId, binderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const chrome = model?.chrome;
  const binders = model?.binders ?? [];

  if (loading && !model) {
    return (
      <div className="binder-context-panel binder-context-panel--loading">
        <Spin />
      </div>
    );
  }

  if (error) {
    return <Alert type="error" showIcon title={error} />;
  }

  if (!model || binders.length === 0) {
    return (
      <div className="binder-context-panel__empty">
        {displayText(chrome?.empty_binders, "No Binder matches this context.")}
      </div>
    );
  }

  return (
    <div className="binder-context-panel">
      <div className="binder-context-panel__header">
        {binders.length > 1 ? (
          <Select
            className="binder-context-panel__select"
            value={binderId ?? model.binder_id}
            onChange={(value) => setBinderId(value)}
            options={binders.map((item) => ({ value: item.record_id, label: item.name }))}
            aria-label={displayText(chrome?.select_binder, "Binder")}
          />
        ) : (
          <span className="binder-context-panel__name">{model.binder_name}</span>
        )}
        {model.binder_detail_href ? (
          <Link className="binder-context-panel__open" to={model.binder_detail_href}>
            {displayText(chrome?.open_binder, "Open Binder")}
          </Link>
        ) : null}
      </div>
      {model.binder_id ? (
        <BinderTreePanel vaultId={vaultId} binderId={model.binder_id} readonly key={model.binder_id} />
      ) : null}
    </div>
  );
}
