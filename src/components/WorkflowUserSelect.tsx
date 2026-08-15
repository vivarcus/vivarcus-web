import { Alert, Select } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { SharingMemberOption } from "../api/types";

type Props = {
  vaultId: string;
  objectName: string;
  recordId: string;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  mode?: "single" | "multiple";
  placeholder?: string;
  constrainRoles?: string[];
  excludeRoles?: string[];
  disabled?: boolean;
};

export function WorkflowUserSelect({
  vaultId,
  objectName,
  recordId,
  value,
  onChange,
  mode = "single",
  placeholder = "Search users…",
  constrainRoles,
  excludeRoles,
  disabled,
}: Props) {
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<SharingMemberOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labelByUserID, setLabelByUserID] = useState<Record<string, string>>({});

  const selectedIDs = useMemo(
    () => (Array.isArray(value) ? value : value ? [value] : []),
    [value],
  );

  const runSearch = useCallback(
    async (term: string) => {
      if (!vaultId || !objectName || !recordId) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await api.searchSharingMembers(vaultId, objectName, recordId, {
          q: term.trim() || undefined,
          limit: 25,
          workflow_participants: true,
          constrain_roles: constrainRoles,
          exclude_roles: excludeRoles,
        });
        const users = res.options.filter((opt) => opt.member_kind === "user");
        setOptions(users);
        setLabelByUserID((prev) => {
          const next = { ...prev };
          for (const opt of users) {
            next[opt.member_id] = opt.label;
          }
          return next;
        });
      } catch (err) {
        setOptions([]);
        setError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        setLoading(false);
      }
    },
    [vaultId, objectName, recordId, constrainRoles, excludeRoles],
  );

  useEffect(() => {
    void runSearch("");
  }, [runSearch]);

  const selectOptions = useMemo(() => {
    const seen = new Set<string>();
    const out = options.map((opt) => {
      seen.add(opt.member_id);
      return { value: opt.member_id, label: opt.label };
    });
    for (const userID of selectedIDs) {
      if (seen.has(userID)) {
        continue;
      }
      out.push({ value: userID, label: labelByUserID[userID] ?? userID });
    }
    return out;
  }, [labelByUserID, options, selectedIDs]);

  return (
    <>
      <Select
        mode={mode === "multiple" ? "multiple" : undefined}
        showSearch
        filterOption={false}
        loading={loading}
        allowClear
        disabled={disabled}
        value={mode === "multiple" ? selectedIDs : selectedIDs[0]}
        options={selectOptions}
        placeholder={placeholder}
        style={{ width: "100%" }}
        onSearch={(term) => {
          setSearch(term);
          void runSearch(term);
        }}
        onChange={(next) => {
          if (mode === "multiple") {
            onChange(Array.isArray(next) ? next : []);
            return;
          }
          onChange(typeof next === "string" ? next : "");
        }}
        onBlur={() => {
          if (search) {
            setSearch("");
            void runSearch("");
          }
        }}
      />
      {error ? <Alert type="error" showIcon title={error} style={{ marginTop: 8 }} /> : null}
    </>
  );
}
