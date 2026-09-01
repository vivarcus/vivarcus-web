import { Alert, Button, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { SecuritySettingsModel, SecuritySettingsURSObject } from "../api/types";
import { RecordSectionBlock } from "../components/record/RecordSectionBlock";
import { AdminPageLoading } from "../components/admin/AdminPageLoading";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { useUi } from "../context/UiContext";
import { useVaultId } from "../hooks/useVaultId";
import { displayText } from "../lib/i18n";

function cloneObjects(objects: SecuritySettingsURSObject[]): SecuritySettingsURSObject[] {
  return objects.map((obj) => ({
    ...obj,
    fields: obj.fields.map((field) => ({ ...field })),
  }));
}

function moveField(
  objects: SecuritySettingsURSObject[],
  objectName: string,
  fromIndex: number,
  toIndex: number,
): SecuritySettingsURSObject[] {
  return objects.map((obj) => {
    if (obj.object_name !== objectName) return obj;
    const fields = [...obj.fields];
    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= fields.length ||
      toIndex >= fields.length ||
      fromIndex === toIndex
    ) {
      return obj;
    }
    const [item] = fields.splice(fromIndex, 1);
    fields.splice(toIndex, 0, item);
    return { ...obj, fields };
  });
}

export function SecuritySettingsPage() {
  const vaultId = useVaultId();
  const { shell } = useUi();
  const [model, setModel] = useState<SecuritySettingsModel | null>(null);
  const [draftObjects, setDraftObjects] = useState<SecuritySettingsURSObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ objectName: string; index: number } | null>(null);

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.securitySettings(vaultId);
      setModel(data);
      setDraftObjects(cloneObjects(data.auto_managed_group_field_order.objects ?? []));
      setReordering(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.load_failed));
      setModel(null);
    } finally {
      setLoading(false);
    }
  }, [vaultId, shell.load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const startReorder = () => {
    if (!model?.can_edit) return;
    setDraftObjects(cloneObjects(model.auto_managed_group_field_order.objects ?? []));
    setReordering(true);
  };

  const cancelReorder = () => {
    if (!model) return;
    setDraftObjects(cloneObjects(model.auto_managed_group_field_order.objects ?? []));
    setReordering(false);
    setDrag(null);
  };

  const saveReorder = async () => {
    if (!vaultId || !model?.can_edit) return;
    setSaving(true);
    try {
      const next = await api.patchSecuritySettings(vaultId, {
        objects: draftObjects.map((obj) => ({
          object_name: obj.object_name,
          fields: obj.fields.map((field) => field.api_name),
        })),
      });
      setModel(next);
      setDraftObjects(cloneObjects(next.auto_managed_group_field_order.objects ?? []));
      setReordering(false);
      message.success(displayText(next.chrome.save_label));
    } catch (err) {
      message.error(err instanceof Error ? err.message : displayText(shell.save_failed));
    } finally {
      setSaving(false);
      setDrag(null);
    }
  };

  if (!vaultId) return null;
  if (loading && !model) {
    return <AdminPageLoading />;
  }
  if (error && !model) {
    return (
      <AdminPageShell title="Security Settings">
        <Alert type="error" title={error} showIcon />
      </AdminPageShell>
    );
  }
  if (!model) return null;

  const chrome = model.chrome;
  const objects = reordering
    ? draftObjects
    : (model.auto_managed_group_field_order.objects ?? []);

  return (
    <AdminPageShell
      title={displayText(chrome.page_title)}
    >
      {error ? <Alert type="error" title={error} showIcon className="admin-page__banner" /> : null}
      <div className="admin-page__body admin-settings-form__body admin-settings-form__body--medium">
        <RecordSectionBlock title={displayText(chrome.field_order_title)}>
          <p className="admin-settings-form__help">{displayText(chrome.field_order_help)}</p>
          <div className="admin-settings-form__toolbar">
          {reordering ? (
            <>
              <Button type="primary" loading={saving} onClick={() => void saveReorder()}>
                {displayText(chrome.save_label)}
              </Button>
              <Button disabled={saving} onClick={cancelReorder}>
                {displayText(chrome.cancel_label)}
              </Button>
            </>
          ) : (
            <Button disabled={!model.can_edit} onClick={startReorder}>
              {displayText(chrome.reorder_label)}
            </Button>
          )}
        </div>
        {objects.length === 0 ? (
          <p className="admin-page__hint">{displayText(chrome.empty_objects_label)}</p>
        ) : (
          <div className="admin-reorder-sections">
            {objects.map((obj) => (
              <div key={obj.object_name}>
                <h3 className="admin-reorder-section__title">{displayText(obj.object_label)}</h3>
                <ul className="admin-reorder-list">
                  {obj.fields.map((field, index) => (
                    <li
                      key={field.api_name}
                      className={
                        reordering
                          ? "admin-reorder-list__item admin-reorder-list__item--draggable"
                          : "admin-reorder-list__item"
                      }
                      draggable={reordering}
                      onDragStart={() => {
                        if (!reordering) return;
                        setDrag({ objectName: obj.object_name, index });
                      }}
                      onDragOver={(event) => {
                        if (!reordering || !drag || drag.objectName !== obj.object_name) return;
                        event.preventDefault();
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        if (!reordering || !drag || drag.objectName !== obj.object_name) return;
                        setDraftObjects((prev) =>
                          moveField(prev, obj.object_name, drag.index, index),
                        );
                        setDrag(null);
                      }}
                      onDragEnd={() => setDrag(null)}
                    >
                      <span className="admin-reorder-list__label">
                        {displayText(field.label)}
                      </span>
                      <span className="admin-reorder-list__meta">({field.api_name})</span>
                      {reordering && (
                        <span className="admin-reorder-list__actions">
                          <Button
                            size="small"
                            disabled={index === 0 || saving}
                            onClick={() =>
                              setDraftObjects((prev) =>
                                moveField(prev, obj.object_name, index, index - 1),
                              )
                            }
                          >
                            ↑
                          </Button>
                          <Button
                            size="small"
                            disabled={index === obj.fields.length - 1 || saving}
                            onClick={() =>
                              setDraftObjects((prev) =>
                                moveField(prev, obj.object_name, index, index + 1),
                              )
                            }
                          >
                            ↓
                          </Button>
                        </span>
                      )}
                    </li>
                  ))}
                  <li className="admin-reorder-list__item admin-reorder-list__item--locked">
                    <span className="admin-reorder-list__label">
                      {displayText(chrome.application_role_label)}
                    </span>
                    <span className="admin-reorder-list__hint">
                      {displayText(chrome.application_role_hint)}
                    </span>
                  </li>
                </ul>
              </div>
            ))}
          </div>
        )}
        </RecordSectionBlock>
      </div>
    </AdminPageShell>
  );
}
