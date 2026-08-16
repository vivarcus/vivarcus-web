import { Tag } from "antd";
import { Link } from "react-router-dom";
import type { MetadataLayoutElement, MetadataLayoutSection } from "../../api/types";
import { useUi } from "../../context/UiContext";
import { displayText } from "../../lib/i18n";
import type { ShellChrome } from "../../lib/i18n";
import { detailformTypeLabel, layoutElementKindLabel } from "../../lib/metadataFormat";

function elementReference(el: MetadataLayoutElement): string {
  if (el.field_api_name) return el.field_api_name;
  if (el.control_ref) return el.control_ref;
  if (el.relationship_ref) return el.relationship_ref;
  if (el.detailform_type) return el.detailform_type;
  return "";
}

function elementDisplayLabel(el: MetadataLayoutElement, shell: ShellChrome): string {
  return el.label || el.name || elementReference(el) || layoutElementKindLabel(el.kind, shell);
}

/** Field chips: Label is primary; API name is always secondary (never promoted to title). */
function fieldChipPrimaryLabel(el: MetadataLayoutElement, shell: ShellChrome): string {
  const label = (el.label || "").trim();
  if (label) return label;
  // Spacers / controls without a catalog label keep a readable fallback.
  if (!el.field_api_name) {
    return elementDisplayLabel(el, shell);
  }
  return "—";
}

function isTwoColumnDetailform(el: MetadataLayoutElement): boolean {
  const t = (el.detailform_type || "").toLowerCase();
  return t.includes("two");
}

/** Column-major split matching record detailform Two-Columns flow. */
function splitTwoColumns<T>(items: T[]): [T[], T[]] {
  const mid = Math.ceil(items.length / 2);
  return [items.slice(0, mid), items.slice(mid)];
}

function FieldChip({
  el,
  objectApiName,
  shell,
}: {
  el: MetadataLayoutElement;
  objectApiName?: string;
  shell: ShellChrome;
}) {
  const primary = fieldChipPrimaryLabel(el, shell);
  const apiName = (el.field_api_name || el.name || "").trim();
  const showApi = !!apiName && apiName !== primary;
  const body = (
    <>
      <span
        className={`layout-form-preview__label${primary === "—" ? " layout-form-preview__label--missing" : ""}`}
      >
        {primary}
      </span>
      {showApi ? <span className="layout-form-preview__name mono">{apiName}</span> : null}
    </>
  );
  if (objectApiName && el.field_api_name) {
    return (
      <Link
        className="layout-form-preview__field layout-form-preview__field--link"
        to={`/admin/configuration/objects/${encodeURIComponent(objectApiName)}/fields/${encodeURIComponent(el.field_api_name)}`}
      >
        {body}
      </Link>
    );
  }
  return <div className="layout-form-preview__field">{body}</div>;
}

function DetailformPreview({
  el,
  objectApiName,
  shell,
}: {
  el: MetadataLayoutElement;
  objectApiName?: string;
  shell: ShellChrome;
}) {
  const children = el.elements ?? [];
  if (children.length === 0) {
    return (
      <div className="layout-form-preview layout-form-preview--empty">
        <Tag>{layoutElementKindLabel(el.kind, shell)}</Tag>
        <span>
          {el.detailform_type ? detailformTypeLabel(el.detailform_type, shell) : "—"}
        </span>
      </div>
    );
  }

  const twoCol = isTwoColumnDetailform(el);
  if (twoCol) {
    const [left, right] = splitTwoColumns(children);
    return (
      <div className="layout-form-preview layout-form-preview--two">
        <div className="layout-form-preview__col">
          {left.map((child, i) => (
            <FieldChip
              key={`${child.kind}-${child.order_index}-${i}`}
              el={child}
              objectApiName={objectApiName}
              shell={shell}
            />
          ))}
        </div>
        <div className="layout-form-preview__col">
          {right.map((child, i) => (
            <FieldChip
              key={`${child.kind}-${child.order_index}-${i}`}
              el={child}
              objectApiName={objectApiName}
              shell={shell}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="layout-form-preview layout-form-preview--one">
      {children.map((child, i) => (
        <FieldChip
          key={`${child.kind}-${child.order_index}-${i}`}
          el={child}
          objectApiName={objectApiName}
          shell={shell}
        />
      ))}
    </div>
  );
}

function CompactElementRow({
  el,
  shell,
}: {
  el: MetadataLayoutElement;
  shell: ShellChrome;
}) {
  const ref = elementReference(el);
  const label = (el.label || "").trim();
  const primary = label || (el.field_api_name ? "—" : elementDisplayLabel(el, shell));
  const showRef = !!ref && ref !== primary;
  return (
    <li className="layout-section-items__row">
      <Tag>{layoutElementKindLabel(el.kind, shell)}</Tag>
      <span
        className={`layout-section-items__label${primary === "—" ? " layout-section-items__label--missing" : ""}`}
      >
        {primary}
      </span>
      {showRef ? <span className="layout-section-items__ref mono">{ref}</span> : null}
    </li>
  );
}

/** Read-friendly layout sections: detailforms as field previews; other kinds as compact rows. */
export function LayoutSectionsView({
  sections,
  objectApiName,
}: {
  sections: MetadataLayoutSection[];
  objectApiName?: string;
}) {
  const { shell } = useUi();

  if (sections.length === 0) {
    return (
      <span className="data-table__empty">{displayText(shell.metadata_empty_sections)}</span>
    );
  }

  return (
    <div className="layout-sections">
      {sections.map((sec, si) => {
        const title =
          sec.label || sec.name || `${displayText(shell.metadata_sections_tab)} ${si + 1}`;
        const detailforms = (sec.elements ?? []).filter((el) => el.kind === "detailform");
        const other = (sec.elements ?? []).filter((el) => el.kind !== "detailform");

        return (
          <div key={si} className="object-detail__subsection layout-sections__section">
            <h3 className="object-detail__subsection-title">{title}</h3>
            {detailforms.map((df, di) => (
              <div key={`df-${di}`} className="layout-sections__detailform">
                {df.detailform_type ? (
                  <p className="layout-sections__detailform-meta">
                    <Tag>{layoutElementKindLabel(df.kind, shell)}</Tag>
                    <span>{detailformTypeLabel(df.detailform_type, shell)}</span>
                  </p>
                ) : null}
                <DetailformPreview el={df} objectApiName={objectApiName} shell={shell} />
              </div>
            ))}
            {other.length > 0 ? (
              <ul className="layout-section-items">
                {other.map((el, ei) => (
                  <CompactElementRow
                    key={`${el.kind}-${el.order_index}-${ei}`}
                    el={el}
                    shell={shell}
                  />
                ))}
              </ul>
            ) : null}
            {detailforms.length === 0 && other.length === 0 ? (
              <span className="data-table__empty">{displayText(shell.metadata_empty_sections)}</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
