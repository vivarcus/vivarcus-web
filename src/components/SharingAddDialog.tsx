import { Alert, Button, Form, Input, Modal, Select, Spin } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { SharingMemberOption, SharingPanelRow } from "../api/types";
import { displayText, type SharingChrome } from "../lib/i18n";

type RoleOption = {
  value: string;
  label: string;
};

type Props = {
  open: boolean;
  vaultId: string;
  objectName: string;
  recordId: string;
  chrome: SharingChrome;
  roleOptions: RoleOption[];
  onClose: () => void;
  onAdded: (row: SharingPanelRow) => void;
};

export function SharingAddDialog({
  open,
  vaultId,
  objectName,
  recordId,
  chrome,
  roleOptions,
  onClose,
  onAdded,
}: Props) {
  const [roleName, setRoleName] = useState("");
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<SharingMemberOption[]>([]);
  const [selectedMember, setSelectedMember] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberOptions = useMemo(
    () =>
      options.map((opt) => ({
        value: `${opt.member_kind}:${opt.member_id}`,
        label: opt.label,
      })),
    [options],
  );

  const reset = useCallback(() => {
    setRoleName("");
    setSearch("");
    setOptions([]);
    setSelectedMember("");
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const runSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.searchSharingMembers(vaultId, objectName, recordId, {
        q: search.trim() || undefined,
        limit: 25,
      });
      setOptions(res.options);
      if (res.options.length === 1) {
        const only = res.options[0];
        setSelectedMember(`${only.member_kind}:${only.member_id}`);
      }
    } catch (err) {
      setOptions([]);
      setError(err instanceof Error ? err.message : displayText(chrome.add_failed));
    } finally {
      setLoading(false);
    }
  }, [vaultId, objectName, recordId, search, chrome.add_failed]);

  useEffect(() => {
    if (!open) {
      return;
    }
    void runSearch();
  }, [open, runSearch]);

  async function submit() {
    const selected = options.find(
      (opt) => `${opt.member_kind}:${opt.member_id}` === selectedMember,
    );
    if (!roleName || !selected) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.addSharingGrant(vaultId, objectName, recordId, {
        role_name: roleName,
        member_kind: selected.member_kind,
        member_id: selected.member_id,
      });
      onAdded(res.row);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(chrome.add_failed));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      className="sharing-panel__add-modal"
      title={displayText(chrome.add_dialog_title)}
      width={520}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          {displayText(chrome.add_cancel)}
        </Button>,
        <Button
          key="add"
          type="primary"
          loading={submitting}
          disabled={!roleName || !selectedMember}
          onClick={() => void submit()}
        >
          {displayText(chrome.add_submit)}
        </Button>,
      ]}
    >
      <Form layout="vertical" requiredMark={false} className="sharing-panel__add-form">
        <Form.Item label={displayText(chrome.add_role_label)} required>
          <Select
            value={roleName || undefined}
            options={roleOptions}
            placeholder={displayText(chrome.add_role_label)}
            onChange={(value) => setRoleName(value)}
          />
        </Form.Item>
        <Form.Item label={displayText(chrome.add_member_label)} required>
          <div className="sharing-panel__add-search-row">
            <Input.Search
              value={search}
              placeholder={displayText(chrome.add_search_label)}
              onChange={(e) => setSearch(e.target.value)}
              onSearch={() => void runSearch()}
              loading={loading}
            />
          </div>
          {loading ? (
            <Spin className="sharing-panel__add-loading" />
          ) : (
            <Select
              className="sharing-panel__add-member-select"
              value={selectedMember || undefined}
              options={memberOptions}
              placeholder={displayText(chrome.add_member_label)}
              showSearch
              optionFilterProp="label"
              onChange={(value) => setSelectedMember(value)}
            />
          )}
        </Form.Item>
        {error && <Alert type="error" title={error} showIcon />}
      </Form>
    </Modal>
  );
}
