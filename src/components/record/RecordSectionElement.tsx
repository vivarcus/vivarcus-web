import { Button } from "antd";
import { Link } from "react-router-dom";
import type {
  DisplayContext,
  FormElement,
  FormSection,
  PageElement,
  PicklistEntryOption,
  RecordPageModel,
  WorkflowTaskAction,
} from "../../api/types";
import { displayText } from "../../lib/i18n";
import { vaultPagelinkHref } from "../../lib/pagelink";
import { BinderContextPanel } from "../binder/BinderContextPanel";
import { RelatedObjectSection } from "../RelatedObjectSection";
import { WorkflowTimeline } from "../WorkflowTimeline";
import { RecordSharingPanel } from "../RecordSharingPanel";
import { collectFormReferenceDisplayContext, type FormReferenceDisplayContext } from "../../lib/studyScopeReference";
import { DomainUserField } from "./DomainUserField";
import { RecordFieldCell } from "./RecordFieldCell";
import { RecordLayoutElement, recordLayoutElementKey } from "./RecordLayoutElement";

type ViewElementProps = {
  mode: "view";
  vaultId: string;
  element: PageElement;
  objectName?: string;
  recordId?: string;
  page?: RecordPageModel;
  workflowTasks?: WorkflowTaskAction[];
  tabApiName?: string;
  displayContext?: DisplayContext;
  hideRelatedHeader?: boolean;
  sectionOpen?: boolean;
  onRelatedCountChange?: (total: number | undefined) => void;
  onPageUpdate?: (page: RecordPageModel) => void;
  onError?: (message: string) => void;
  onReloadPage?: () => Promise<void>;
};

type EditElementProps = {
  mode: "edit";
  vaultId: string;
  element: FormElement;
  value?: unknown;
  values?: Record<string, unknown>;
  onFieldChange?: (name: string, value: unknown) => void;
  recordIdPlaceholder?: string;
  relatedAfterSaveHint?: string;
  displayContext?: DisplayContext;
  formSections?: FormSection[];
  localeReferencesByLanguage?: Record<string, PicklistEntryOption[]>;
  referenceDisplay?: FormReferenceDisplayContext;
};

export type RecordSectionElementProps = ViewElementProps | EditElementProps;

export function recordSectionElementKey(
  mode: "view" | "edit",
  element: PageElement | FormElement,
  fallbackKey: string,
  elementIndex: number,
): string {
  if (mode === "view") {
    const pageEl = element as PageElement;
    return pageEl.layout_element_id ?? pageEl.name ?? fallbackKey;
  }
  const formEl = element as FormElement;
  return recordLayoutElementKey(formEl.kind, formEl.name, formEl.label, elementIndex);
}

export function RecordSectionElement(props: RecordSectionElementProps) {
  if (props.mode === "edit") {
    const {
      vaultId,
      element: el,
      value,
      values,
      onFieldChange,
      recordIdPlaceholder,
      relatedAfterSaveHint,
      displayContext,
    } = props;

    if (el.kind === "domainUser" && el.domain_user) {
      return (
        <DomainUserField
          vaultId={vaultId}
          config={el.domain_user}
          values={values ?? {}}
          onFieldChange={(name, next) => onFieldChange?.(name, next)}
          formSections={props.formSections}
          localeReferencesByLanguage={props.localeReferencesByLanguage}
          displayContext={displayContext}
        />
      );
    }

    if (el.kind === "field") {
      if (el.hidden || !el.field_api_name) {
        return null;
      }
      const referenceDisplay =
        props.referenceDisplay ?? collectFormReferenceDisplayContext(props.formSections ?? []);
      return (
        <RecordFieldCell
          mode="edit"
          vaultId={vaultId}
          element={el}
          value={value}
          onChange={(next) => onFieldChange?.(el.field_api_name!, next)}
          recordIdPlaceholder={recordIdPlaceholder}
          displayContext={displayContext}
          formValues={values}
          formFieldDisplays={referenceDisplay.formFieldDisplays}
          formFieldLabels={referenceDisplay.formFieldLabels}
          controllingParents={referenceDisplay.controllingParents}
        />
      );
    }

    if (el.kind === "control" && el.pagelink) {
      return (
        <div className="layout-control">
          <Link to={vaultPagelinkHref(vaultId, el.pagelink.route_path)}>
            <Button>
              {displayText(el.pagelink.label, el.pagelink.api_name) ||
                displayText(el.label) ||
                el.pagelink.api_name}
            </Button>
          </Link>
        </div>
      );
    }

    if (el.kind === "relatedObject") {
      const label = displayText(el.label, el.name ?? el.relationship_ref);
      if (el.related) {
        return (
          <RelatedObjectSection
            vaultId={vaultId}
            label={label}
            descriptor={el.related}
            isOpen
            viewOnly
          />
        );
      }
      return (
        <div className="layout-help">
          <p>{relatedAfterSaveHint}</p>
        </div>
      );
    }

    return (
      <RecordLayoutElement
        kind={el.kind}
        label={el.label}
        name={el.name}
      />
    );
  }

  const {
    vaultId,
    element: el,
    objectName,
    recordId,
    page,
    tabApiName,
    displayContext,
    hideRelatedHeader,
    sectionOpen,
    onRelatedCountChange,
    onPageUpdate,
    onError,
    onReloadPage,
  } = props;

  switch (el.kind) {
    case "field":
      return (
        <RecordFieldCell
          mode="view"
          vaultId={vaultId}
          element={el}
          tabApiName={tabApiName}
          displayContext={displayContext}
          onRecordMutated={onReloadPage}
        />
      );
    case "domainUser":
      if (!el.domain_user) return null;
      return (
        <DomainUserField
          vaultId={vaultId}
          config={el.domain_user}
          values={{}}
          onFieldChange={() => {}}
          readOnly
        />
      );
    case "helpSection":
    case "text":
    case "spacer":
      return (
        <RecordLayoutElement
          kind={el.kind}
          label={el.label}
          name={el.name}
          value={el.value}
          vaultId={vaultId}
          fieldApiName={el.field_api_name}
          fieldType={el.field_type}
          targetObjectApiName={el.target_object_api_name}
          tabApiName={tabApiName}
          displayContext={displayContext}
        />
      );
    case "wftimeline":
      return (
        <WorkflowTimeline
          timeline={page?.workflow_timeline}
          workflow={page?.workflow}
          vaultId={vaultId}
          objectName={objectName}
          recordId={recordId}
          page={page}
          onPageUpdate={onPageUpdate}
          onError={onError}
          onReloadPage={onReloadPage}
        />
      );
    case "control":
      if (el.name === "binder_context_panel__c" && objectName && recordId) {
        return (
          <BinderContextPanel vaultId={vaultId} objectName={objectName} recordId={recordId} />
        );
      }
      if (el.pagelink) {
        return (
          <div className="layout-control">
            <Link to={vaultPagelinkHref(vaultId, el.pagelink.route_path, tabApiName)}>
              <Button>
                {displayText(el.pagelink.label, el.pagelink.api_name) ||
                  displayText(el.label) ||
                  el.pagelink.api_name}
              </Button>
            </Link>
          </div>
        );
      }
      return null;
    case "relatedObject":
      if (!el.related) return null;
      return (
        <RelatedObjectSection
          key={`${el.layout_element_id ?? el.relationship_ref}-v${page?.record_version ?? 0}`}
          vaultId={vaultId}
          label={displayText(el.label, el.related.target_object_api_name)}
          descriptor={el.related}
          hideHeader={hideRelatedHeader}
          isOpen={sectionOpen ?? false}
          onTotalChange={onRelatedCountChange}
          parentObjectName={objectName}
          parentRecordId={recordId}
        />
      );
    case "sharingSettings":
      if (!objectName || !recordId) return null;
      return (
        <RecordSharingPanel
          vaultId={vaultId}
          objectName={objectName}
          recordId={recordId}
        />
      );
    default:
      return null;
  }
}
