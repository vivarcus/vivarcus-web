import {
  Alert,
  Button,
  Checkbox,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Steps,
  Tabs,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type {
  InboundComparisonRow,
  InboundDependencyView,
  InboundPackageDetail,
  InboundPackageStep,
  InboundStepReviewDetail,
} from "../api/types";
import { AdminCompactTable, adminTableEmptyText } from "../components/admin/AdminCompactTable";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { useUi } from "../context/UiContext";
import { useVaultId } from "../hooks/useVaultId";
import { displayText, displayTextTemplate } from "../lib/i18n";
import { recordDetailHref } from "../lib/fields";

type Phase = "select" | "reorder" | "confirm";
type ComparisonTableRow = InboundComparisonRow & { key: string };

function isBlockedStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s === "blocked__v" || s === "blocked";
}

function withKeys(rows: InboundComparisonRow[], prefix = ""): ComparisonTableRow[] {
  return rows.map((row, idx) => {
    const key = `${prefix}${idx}:${row.operation}:${row.item}`;
    return {
      ...row,
      key,
      children: row.children?.length ? withKeys(row.children, `${key}/`) : undefined,
    };
  });
}

function operationFamily(operation: string): string {
  const op = operation.toLowerCase();
  if (op === "change" || op.startsWith("change ")) return "change";
  if (op.startsWith("add ")) return "add";
  if (op.startsWith("remove ")) return "remove";
  if (op.startsWith("modify ")) return "modify";
  if (op.includes("no change")) return "no_change";
  return "other";
}

function filterComparisonRows(
  rows: ComparisonTableRow[],
  opFilter: string,
  search: string,
): ComparisonTableRow[] {
  const q = search.trim().toLowerCase();
  const matchRow = (row: ComparisonTableRow): boolean => {
    if (opFilter !== "all" && operationFamily(row.operation) !== opFilter) {
      if (!row.children?.length) return false;
    }
    if (!q) {
      if (opFilter === "all") return true;
      if (operationFamily(row.operation) === opFilter) return true;
      return (row.children ?? []).some((c) => operationFamily(c.operation) === opFilter);
    }
    const selfHit =
      row.item.toLowerCase().includes(q) ||
      row.operation.toLowerCase().includes(q) ||
      (row.from_target ?? "").toLowerCase().includes(q) ||
      (row.to ?? "").toLowerCase().includes(q);
    const childHit = (row.children ?? []).some(
      (c) =>
        c.item.toLowerCase().includes(q) ||
        c.operation.toLowerCase().includes(q) ||
        (c.from_target ?? "").toLowerCase().includes(q) ||
        (c.to ?? "").toLowerCase().includes(q),
    );
    if (!selfHit && !childHit) return false;
    if (opFilter === "all") return true;
    return (
      operationFamily(row.operation) === opFilter ||
      (row.children ?? []).some((c) => operationFamily(c.operation) === opFilter)
    );
  };

  return rows
    .map((row) => {
      if (!matchRow(row)) return null;
      const children = row.children
        ? filterComparisonRows(
            row.children as ComparisonTableRow[],
            opFilter === "all" ? "all" : opFilter,
            search,
          )
        : undefined;
      if (opFilter !== "all" && operationFamily(row.operation) !== opFilter) {
        if (!children?.length) return null;
        return { ...row, children };
      }
      return { ...row, children: children?.length ? children : row.children };
    })
    .filter((row): row is ComparisonTableRow => row != null);
}

function filterDependencies(
  rows: InboundDependencyView[],
  statusFilter: string,
  search: string,
): InboundDependencyView[] {
  const q = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (statusFilter !== "all" && row.status !== statusFilter) return false;
    if (!q) return true;
    return (
      row.component_name.toLowerCase().includes(q) ||
      row.component_type.toLowerCase().includes(q) ||
      (row.sub_component_name ?? "").toLowerCase().includes(q) ||
      (row.sub_component_type ?? "").toLowerCase().includes(q) ||
      row.status.toLowerCase().includes(q)
    );
  });
}

function initialExcluded(steps: InboundPackageStep[]): string[] {
  const fromServer = steps.filter((s) => s.excluded_by).map((s) => s.id);
  const blocked = steps.filter((s) => isBlockedStatus(s.deployment_status)).map((s) => s.id);
  return [...new Set([...fromServer, ...blocked])];
}

/** Review & Deploy wizard for vault_package__v (Admin Deployment). */
export function AdminReviewDeployPage() {
  const { recordId } = useParams();
  const vaultId = useVaultId();
  const navigate = useNavigate();
  const { shell } = useUi();
  const cfg = shell.cfg_packaging;
  const [detail, setDetail] = useState<InboundPackageDetail | null>(null);
  const [cfgId, setCfgId] = useState<string | null>(null);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("select");
  const [showBlockedOnly, setShowBlockedOnly] = useState(false);
  const [reorderDraft, setReorderDraft] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [review, setReview] = useState<InboundStepReviewDetail | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [componentIdx, setComponentIdx] = useState(0);
  const [activeTab, setActiveTab] = useState("comparison");
  const [opFilter, setOpFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reviewSearch, setReviewSearch] = useState("");

  const load = useCallback(async () => {
    if (!vaultId || !recordId) return;
    setLoading(true);
    setError(null);
    try {
      const resolved = await api.resolveInboundPackageCFGId(vaultId, recordId);
      setCfgId(resolved.id);
      const data = await api.getInboundPackage(vaultId, resolved.id);
      setDetail(data);
      setExcluded(initialExcluded(data.steps));
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.load_failed));
    } finally {
      setLoading(false);
    }
  }, [vaultId, recordId, shell.load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const steps = useMemo(() => detail?.steps ?? [], [detail]);
  const visibleSteps = useMemo(() => {
    const sorted = [...steps].sort((a, b) => a.review_order - b.review_order);
    if (!showBlockedOnly) return sorted;
    return sorted.filter((s) => isBlockedStatus(s.deployment_status));
  }, [steps, showBlockedOnly]);
  const includedSteps = useMemo(
    () => steps.filter((s) => !excluded.includes(s.id)).sort((a, b) => a.review_order - b.review_order),
    [steps, excluded],
  );
  const includedBlocked = useMemo(
    () => includedSteps.some((s) => isBlockedStatus(s.deployment_status)),
    [includedSteps],
  );
  const canGoNext = includedSteps.length > 0 && !includedBlocked;

  const openStepReview = useCallback(
    async (stepId: string) => {
      if (!vaultId || !cfgId) return;
      setReviewOpen(true);
      setReviewLoading(true);
      setReviewError(null);
      setOpFilter("all");
      setStatusFilter("all");
      setReviewSearch("");
      setActiveTab("comparison");
      try {
        const data = await api.getInboundPackageStepReview(vaultId, cfgId, stepId);
        setReview(data);
        setComponentIdx(0);
      } catch (err) {
        setReview(null);
        setReviewError(err instanceof Error ? err.message : displayText(shell.load_failed));
      } finally {
        setReviewLoading(false);
      }
    },
    [vaultId, cfgId, shell.load_failed],
  );

  const onSaveExclusions = async () => {
    if (!vaultId || !cfgId) return;
    setBusy(true);
    try {
      const data = await api.excludeInboundPackageSteps(vaultId, cfgId, excluded);
      setDetail(data);
      message.success(displayText(cfg.exclusions_saved));
    } catch (err) {
      message.error(err instanceof Error ? err.message : displayText(shell.load_failed));
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const onNext = async () => {
    try {
      await onSaveExclusions();
      setPhase("confirm");
    } catch {
      // error already toasted
    }
  };

  const enterReorder = () => {
    const draft: Record<string, number> = {};
    for (const step of steps) {
      draft[step.id] = step.review_order;
    }
    setReorderDraft(draft);
    setPhase("reorder");
  };

  const onSaveReorder = async () => {
    if (!vaultId || !cfgId) return;
    const updates = steps.map((s) => ({
      step_id: s.id,
      review_order: reorderDraft[s.id] ?? s.review_order,
    }));
    const orders = updates.map((u) => u.review_order);
    if (new Set(orders).size !== orders.length) {
      message.error(displayText(cfg.step_numbers_unique));
      return;
    }
    if (orders.some((n) => !Number.isFinite(n) || n < 1)) {
      message.error(displayText(cfg.step_numbers_min));
      return;
    }
    setBusy(true);
    try {
      const data = await api.reorderInboundPackageSteps(vaultId, cfgId, updates);
      setDetail(data);
      setPhase("select");
      message.success(displayText(cfg.step_order_saved));
    } catch (err) {
      message.error(err instanceof Error ? err.message : displayText(shell.load_failed));
    } finally {
      setBusy(false);
    }
  };

  const onDeploy = async (resume: boolean) => {
    if (!vaultId || !cfgId) return;
    setBusy(true);
    try {
      await onSaveExclusions();
      const res = await api.deployInboundPackage(vaultId, cfgId, { resume });
      message.success(
        displayTextTemplate(cfg.deploy_finished, { status: res.deployment_status }),
      );
      await load();
      setPhase("select");
    } catch (err) {
      message.error(err instanceof Error ? err.message : displayText(shell.load_failed));
    } finally {
      setBusy(false);
    }
  };

  const activeComponent = review?.components[componentIdx] ?? null;
  const comparisonTree = useMemo(
    () => withKeys(activeComponent?.comparison ?? []),
    [activeComponent],
  );
  const filteredComparison = useMemo(
    () => filterComparisonRows(comparisonTree, opFilter, reviewSearch),
    [comparisonTree, opFilter, reviewSearch],
  );
  const filteredDependencies = useMemo(
    () => filterDependencies(activeComponent?.dependencies ?? [], statusFilter, reviewSearch),
    [activeComponent, statusFilter, reviewSearch],
  );
  const dependencyStatuses = useMemo(() => {
    const set = new Set((activeComponent?.dependencies ?? []).map((d) => d.status));
    return [...set].sort();
  }, [activeComponent]);

  const comparisonColumns: ColumnsType<ComparisonTableRow> = [
    { title: displayText(cfg.column_operation), dataIndex: "operation", width: 180 },
    { title: displayText(cfg.column_item), dataIndex: "item", ellipsis: true },
    {
      title: displayText(cfg.column_from_target),
      dataIndex: "from_target",
      ellipsis: true,
      render: (v?: string) => v || "",
    },
    {
      title: displayText(cfg.column_to),
      dataIndex: "to",
      ellipsis: true,
      render: (v?: string) => v || "",
    },
  ];

  const dependencyColumns: ColumnsType<InboundDependencyView> = [
    { title: displayText(cfg.column_component_name), dataIndex: "component_name", ellipsis: true },
    { title: displayText(cfg.column_component_type), dataIndex: "component_type", width: 140 },
    {
      title: displayText(cfg.column_subcomponent_name),
      dataIndex: "sub_component_name",
      ellipsis: true,
      render: (v?: string) => v || "",
    },
    {
      title: displayText(cfg.column_subcomponent_type),
      dataIndex: "sub_component_type",
      width: 140,
      render: (v?: string) => v || "",
    },
    { title: displayText(cfg.column_status), dataIndex: "status", width: 260 },
  ];

  const stepColumns = (opts: { editableOrder?: boolean; selectable?: boolean }): ColumnsType<InboundPackageStep> => [
    {
      title: "",
      width: 48,
      render: (_: unknown, row) => (
        <Checkbox
          checked={!excluded.includes(row.id)}
          disabled={!opts.selectable}
          onChange={(e) => {
            setExcluded((prev) =>
              e.target.checked ? prev.filter((id) => id !== row.id) : [...prev, row.id],
            );
          }}
        />
      ),
    },
    {
      title: displayText(cfg.column_step),
      dataIndex: "name",
      width: 110,
      render: (_: unknown, row) =>
        opts.editableOrder ? (
          <InputNumber
            min={1}
            value={reorderDraft[row.id] ?? row.review_order}
            onChange={(value) => {
              const n = typeof value === "number" ? value : Number(value);
              setReorderDraft((prev) => ({ ...prev, [row.id]: n }));
            }}
          />
        ) : (
          row.name
        ),
    },
    { title: displayText(cfg.column_step_type), dataIndex: "step_type", width: 110 },
    {
      title: displayText(cfg.column_label),
      dataIndex: "component_label",
      ellipsis: true,
      render: (_: unknown, row) => row.component_label || row.component_name || "—",
    },
    {
      title: displayText(cfg.column_name),
      dataIndex: "component_name",
      ellipsis: true,
      render: (v?: string) => v || "—",
    },
    {
      title: displayText(cfg.column_type),
      dataIndex: "component_type",
      width: 120,
      render: (v?: string) => v || "—",
    },
    { title: displayText(cfg.column_deployment_status), dataIndex: "deployment_status", width: 140 },
    {
      title: displayText(cfg.column_deployment_action),
      dataIndex: "deployment_action",
      width: 260,
      render: (action: string | undefined, row) =>
        action && phase !== "reorder" ? (
          <Button type="link" className="admin-table__link-btn" onClick={() => void openStepReview(row.id)}>
            {action}
          </Button>
        ) : (
          action || "—"
        ),
    },
  ];

  if (!recordId) {
    return null;
  }

  const componentTitle = activeComponent
    ? `${activeComponent.component_type} ${activeComponent.component_name}`
    : (review?.name ?? displayText(cfg.component_fallback));

  const wizardStep = phase === "confirm" ? 1 : 0;
  const heading =
    phase === "reorder"
      ? displayText(cfg.review_reorder_steps_heading)
      : phase === "confirm"
        ? displayText(cfg.deployment_confirmation_heading)
        : displayText(cfg.review_select_steps_heading);

  return (
    <AdminPageShell
      title={heading}
      actions={
        <Space wrap>
          {vaultId && (
            <Link to={recordDetailHref(vaultId, "vault_package__v", recordId)}>
              {displayText(cfg.back_to_package)}
            </Link>
          )}
          <Button onClick={() => navigate("/admin/deployment/inbound_packages")}>
            {displayText(cfg.inbound_packages)}
          </Button>
        </Space>
      }
    >

      <Steps
        className="admin-page__wizard-steps"
        size="small"
        current={wizardStep}
        items={[
          { title: displayText(cfg.wizard_select_steps) },
          { title: displayText(cfg.wizard_confirm) },
        ]}
      />

      {error && <Alert type="error" message={error} className="admin-page__banner" />}
      {includedBlocked && phase === "select" && (
        <Alert
          type="warning"
          showIcon className="admin-page__banner"
          message={displayText(cfg.blocked_steps_warning)}
        />
      )}

      <Spin spinning={loading || busy}>
        {detail && (
          <>
            <p>
              <strong>{detail.name}</strong> — {detail.deployment_status}
            </p>
            <Space className="admin-page__stack" wrap>
              <Checkbox
                checked={showBlockedOnly}
                onChange={(e) => setShowBlockedOnly(e.target.checked)}
                disabled={phase === "confirm"}
              >
                {displayText(cfg.show_blocked_status)}
              </Checkbox>
              {phase === "select" && (
                <Button onClick={enterReorder}>{displayText(cfg.reorder)}</Button>
              )}
              <span>
                {displayTextTemplate(cfg.steps_selected, {
                  selected: includedSteps.length,
                  total: steps.length,
                })}
              </span>
            </Space>

            <AdminCompactTable<InboundPackageStep>
              rowKey="id"
              dataSource={phase === "confirm" ? includedSteps : visibleSteps}
              pagination={{ pageSize: 25, showSizeChanger: false }}
              columns={stepColumns({
                editableOrder: phase === "reorder",
                selectable: phase === "select",
              })}
              locale={{ emptyText: adminTableEmptyText(displayText(shell.empty_no_records, "No items found")) }}
            />

            <Space className="admin-page__stack--top" wrap>
              {phase === "select" && (
                <>
                  <Button onClick={() => navigate("/admin/deployment/inbound_packages")}>
                    {displayText(shell.cancel)}
                  </Button>
                  <Button type="primary" disabled={!canGoNext} onClick={() => void onNext()}>
                    {displayText(cfg.next)}
                  </Button>
                </>
              )}
              {phase === "reorder" && (
                <>
                  <Button
                    onClick={() => {
                      setPhase("select");
                      setReorderDraft({});
                    }}
                  >
                    {displayText(shell.cancel)}
                  </Button>
                  <Button type="primary" onClick={() => void onSaveReorder()}>
                    {displayText(shell.save)}
                  </Button>
                </>
              )}
              {phase === "confirm" && (
                <>
                  <Button onClick={() => setPhase("select")}>{displayText(shell.back)}</Button>
                  <Button type="primary" onClick={() => void onDeploy(false)}>
                    {displayText(cfg.finish)}
                  </Button>
                  <Button onClick={() => void onDeploy(true)}>{displayText(cfg.resume_deploy)}</Button>
                </>
              )}
            </Space>
          </>
        )}
      </Spin>

      <Modal
        open={reviewOpen}
        title={displayText(cfg.comparison_dependencies_title)}
        onCancel={() => setReviewOpen(false)}
        footer={[
          <Button key="close" onClick={() => setReviewOpen(false)}>
            {displayText(cfg.close)}
          </Button>,
        ]}
        width={960}
        destroyOnHidden
      >
        {reviewLoading ? (
          <Spin />
        ) : reviewError ? (
          <Alert type="error" message={reviewError} />
        ) : review ? (
          <>
            <Space className="admin-page__stack admin-page__stack--between" wrap>
              <strong>{componentTitle}</strong>
              <Space>
                <Button
                  size="small"
                  disabled={!review.prev_step_id}
                  onClick={() => review.prev_step_id && void openStepReview(review.prev_step_id)}
                >
                  {"<"}
                </Button>
                <span>
                  {review.step_index + 1} / {review.step_count}
                </span>
                <Button
                  size="small"
                  disabled={!review.next_step_id}
                  onClick={() => review.next_step_id && void openStepReview(review.next_step_id)}
                >
                  {">"}
                </Button>
              </Space>
            </Space>
            {review.components.length > 1 && (
              <Space className="admin-page__stack" wrap>
                {review.components.map((comp, idx) => (
                  <Button
                    key={`${comp.component_type}.${comp.component_name}`}
                    size="small"
                    type={idx === componentIdx ? "primary" : "default"}
                    onClick={() => setComponentIdx(idx)}
                  >
                    {comp.component_type}.{comp.component_name}
                  </Button>
                ))}
              </Space>
            )}
            <Tabs
              activeKey={activeTab}
              onChange={(key) => {
                setActiveTab(key);
                setReviewSearch("");
              }}
              items={[
                {
                  key: "comparison",
                  label: displayText(cfg.comparison_tab),
                  children: (
                    <>
                      <Space className="admin-page__stack" wrap>
                        <Select
                          value={opFilter}
                          className="filter-bar__min-160"
                          onChange={setOpFilter}
                          options={[
                            { value: "all", label: displayText(cfg.filter_all_operations) },
                            { value: "change", label: displayText(cfg.filter_change) },
                            { value: "add", label: displayText(cfg.filter_add) },
                            { value: "remove", label: displayText(cfg.filter_remove) },
                            { value: "modify", label: displayText(cfg.filter_modify) },
                            { value: "no_change", label: displayText(cfg.filter_no_change) },
                          ]}
                        />
                        <Input.Search
                          allowClear
                          placeholder={displayText(cfg.search_placeholder)}
                          className="filter-bar__w-240"
                          value={reviewSearch}
                          onChange={(e) => setReviewSearch(e.target.value)}
                        />
                      </Space>
                      <AdminCompactTable<InboundComparisonRow>
                        rowKey="key"
                        pagination={{ pageSize: 25, showSizeChanger: false }}
                        columns={comparisonColumns}
                        dataSource={filteredComparison}
                        expandable={{ defaultExpandAllRows: true }}
                        locale={{ emptyText: adminTableEmptyText(displayText(cfg.no_differences)) }}
                      />
                    </>
                  ),
                },
                {
                  key: "dependencies",
                  label: displayText(cfg.dependencies_tab),
                  children: (
                    <>
                      <Space className="admin-page__stack" wrap>
                        <Select
                          value={statusFilter}
                          className="filter-bar__w-240"
                          onChange={setStatusFilter}
                          options={[
                            { value: "all", label: displayText(cfg.filter_all_statuses) },
                            ...dependencyStatuses.map((status) => ({ value: status, label: status })),
                          ]}
                        />
                        <Input.Search
                          allowClear
                          placeholder={displayText(cfg.search_placeholder)}
                          className="filter-bar__w-240"
                          value={reviewSearch}
                          onChange={(e) => setReviewSearch(e.target.value)}
                        />
                      </Space>
                      <AdminCompactTable<InboundDependencyView>
                        rowKey={(row) =>
                          `${row.component_type}.${row.component_name}.${row.sub_component_type ?? ""}.${row.sub_component_name ?? ""}`
                        }
                        pagination={{ pageSize: 25, showSizeChanger: false }}
                        columns={dependencyColumns}
                        dataSource={filteredDependencies}
                        locale={{ emptyText: adminTableEmptyText(displayText(cfg.no_dependencies)) }}
                      />
                    </>
                  ),
                },
              ]}
            />
          </>
        ) : null}
      </Modal>
    </AdminPageShell>
  );
}
