import { Alert, Spin } from "antd";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { MetadataLayoutDetailModel } from "../api/types";
import { LayoutSectionsView } from "../components/metadata/LayoutSectionsView";
import { useVaultId } from "../hooks/useVaultId";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";
import type { ShellChrome } from "../lib/i18n";
import { AdminPageShell } from "../components/admin/AdminPageShell";

/** Veeva-style Page Layout detail: single-page sections + right-hand anchors. */
export function AdminMetadataLayoutDetailPage() {
  const { layoutName = "" } = useParams();
  const vaultId = useVaultId();
  const { shell } = useUi();
  const [model, setModel] = useState<MetadataLayoutDetailModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!vaultId || !layoutName) return;
    setLoading(true);
    setError(null);
    try {
      setModel(await api.metadataLayoutDetail(vaultId, layoutName));
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.metadata_load_failed));
      setModel(null);
    } finally {
      setLoading(false);
    }
  }, [vaultId, layoutName, shell.metadata_load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!vaultId) return null;

  const title = model
    ? displayText(model.label || undefined, model.api_name)
    : layoutName;

  return (
    <AdminPageShell
      breadcrumb={
        <p className="page-header__breadcrumb">
          <Link to="/admin/configuration/layouts">
            {displayText(shell.metadata_layouts_title)}
          </Link>
          {" › "}
          <span>{title}</span>
        </p>
      }
      title={title}
    >

      {error && <Alert type="error" title={error} showIcon role="alert" />}
      {loading && !model && (
        <Spin description={displayText(shell.loading)} className="page-loading page__loading" />
      )}

      {model && <LayoutDetailBody model={model} shell={shell} />}
    </AdminPageShell>
  );
}

function LayoutDetailBody({
  model,
  shell,
}: {
  model: MetadataLayoutDetailModel;
  shell: ShellChrome;
}) {
  const idBase = `layout-${model.api_name}`;
  const sections = [
    { id: `${idBase}-details`, title: displayText(shell.metadata_details_tab) },
    { id: `${idBase}-sections`, title: displayText(shell.metadata_sections_tab) },
  ];

  return (
    <div className="object-detail">
      <div className="object-detail__sections">
        <section id={sections[0].id} className="object-detail__section">
          <h2 className="object-detail__section-title">{sections[0].title}</h2>
          <LayoutDetailsFields model={model} shell={shell} />
        </section>

        <section id={sections[1].id} className="object-detail__section">
          <h2 className="object-detail__section-title">{sections[1].title}</h2>
          <LayoutSectionsView sections={model.sections ?? []} objectApiName={model.object_api_name} />
        </section>
      </div>

      <nav className="object-detail__nav" aria-label={displayText(shell.metadata_details_tab)}>
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`}>
            {s.title}
          </a>
        ))}
      </nav>
    </div>
  );
}

function LayoutDetailsFields({
  model,
  shell,
}: {
  model: MetadataLayoutDetailModel;
  shell: ShellChrome;
}) {
  const rows: { label: string; value: ReactNode }[] = [
    {
      label: displayText(shell.metadata_layout_label),
      value: displayText(model.label || undefined, model.api_name),
    },
    {
      label: displayText(shell.metadata_layout_name),
      value: <span className="mono">{model.api_name}</span>,
    },
  ];
  if (model.object_api_name) {
    const objectText = model.object_label || model.object_api_name;
    rows.push({
      label: displayText(shell.metadata_lifecycle_object),
      value: (
        <Link
          className="metadata-link"
          to={`/admin/configuration/objects/${encodeURIComponent(model.object_api_name)}`}
        >
          {objectText}
          {model.object_label && model.object_label !== model.object_api_name ? (
            <span className="mono layout-object-api"> ({model.object_api_name})</span>
          ) : null}
        </Link>
      ),
    });
  }
  if (model.object_type_api_name) {
    rows.push({
      label: displayText(shell.metadata_permission_kind_object_type),
      value: <span className="mono">{model.object_type_api_name}</span>,
    });
  }
  rows.push(
    {
      label: displayText(shell.metadata_status),
      value: model.active
        ? displayText(shell.metadata_status_active)
        : displayText(shell.metadata_status_inactive),
    },
    {
      label: displayText(shell.metadata_default),
      value: model.default_layout
        ? displayText(shell.metadata_yes)
        : displayText(shell.metadata_no),
    },
  );
  if (model.description) {
    rows.push({
      label: displayText(shell.description),
      value: model.description,
    });
  }
  if (model.namespace) {
    rows.push({
      label: displayText(shell.metadata_namespace),
      value: <span className="mono">{model.namespace}</span>,
    });
  }

  return (
    <dl className="object-detail__fields">
      {rows.map((row) => (
        <div key={row.label} className="object-detail__field">
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
