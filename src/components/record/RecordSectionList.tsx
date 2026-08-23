import type { ReactNode } from "react";
import { useMemo } from "react";
import type {
  DisplayContext,
  DisplayText,
  FormElement,
  FormSection,
  PageElement,
  PageSection,
  PicklistEntryOption,
  RecordPageModel,
  WorkflowTaskAction,
} from "../../api/types";
import { defaultPageMessages, displayText, type PageMessages } from "../../lib/i18n";
import {
  collectFormReferenceDisplayContext,
  type FormReferenceDisplayContext,
} from "../../lib/studyScopeReference";
import { fieldGridClassName, partitionDetailformColumns } from "./RecordFieldGrid";
import { RecordSectionBlock } from "./RecordSectionBlock";
import { RecordSectionElement, recordSectionElementKey } from "./RecordSectionElement";
import { sectionDomId, sectionKey } from "./recordSectionUtils";

type SectionContainer = {
  name?: string;
  label: DisplayText;
  form_columns?: number;
};

type ViewProps = {
  mode: "view";
  vaultId: string;
  sections: PageSection[];
  objectName?: string;
  recordId?: string;
  page?: RecordPageModel;
  workflowTasks?: WorkflowTaskAction[];
  tabApiName?: string;
  displayContext?: DisplayContext;
  messages?: PageMessages;
  expandedSections: Set<string>;
  sectionCounts?: Record<string, number>;
  onToggleSection: (sectionId: string) => void;
  onSectionCountChange?: (sectionId: string, total: number | undefined) => void;
  onPageUpdate?: (page: RecordPageModel) => void;
  onError?: (message: string) => void;
  onReloadPage?: () => Promise<void>;
};

type EditProps = {
  mode: "edit";
  vaultId: string;
  sections: FormSection[];
  values: Record<string, unknown>;
  onFieldChange: (name: string, value: unknown) => void;
  recordIdPlaceholder?: string;
  relatedAfterSaveHint?: string;
  displayContext?: DisplayContext;
  localeReferencesByLanguage?: Record<string, PicklistEntryOption[]>;
};

export type RecordSectionListProps = ViewProps | EditProps;

function isViewProps(props: RecordSectionListProps): props is ViewProps {
  return props.mode === "view";
}

function viewGridElements(elements: PageElement[] | null | undefined): PageElement[] {
  return (elements ?? []).filter((el) => el.kind === "field" || el.kind === "spacer");
}

function editGridElements(elements: FormElement[] | null | undefined): FormElement[] {
  return (elements ?? []).filter(
    (el) =>
      (el.kind === "field" && !el.hidden && el.field_api_name) ||
      el.kind === "spacer",
  );
}

function isLayoutPhantom(el: { kind: string }): boolean {
  return el.kind === "control";
}

function isViewGridCell(el: PageElement): boolean {
  return el.kind === "field" || el.kind === "spacer";
}

function isEditGridCell(el: FormElement): boolean {
  return (
    (el.kind === "field" && !el.hidden && Boolean(el.field_api_name)) ||
    el.kind === "spacer"
  );
}

function layoutElements<T extends { kind: string }>(
  elements: T[] | null | undefined,
  formColumns?: number,
): T[] {
  return (elements ?? []).filter((el) => {
    if (formColumns === 2 && isLayoutPhantom(el)) {
      return false;
    }
    return el.kind !== "field" && el.kind !== "spacer";
  });
}

function renderEmptyState(props: RecordSectionListProps): ReactNode {
  if (!isViewProps(props)) {
    return null;
  }
  const pageMessages = props.messages ?? defaultPageMessages;
  return <p className="empty-state">{displayText(pageMessages.empty_sections)}</p>;
}

function renderViewGridElement(
  props: ViewProps,
  el: PageElement,
  sectionKeyValue: string,
  idx: number,
): ReactNode {
  if (el.kind === "spacer") {
    return (
      <div
        key={`spacer-${sectionKeyValue}-${idx}`}
        className="field-grid__item field-grid__item--spacer"
        aria-hidden
      />
    );
  }
  if (el.kind === "control") {
    return (
      <div
        key={`control-${sectionKeyValue}-${el.name ?? idx}`}
        className="field-grid__item field-grid__item--layout-control"
      >
        <RecordSectionElement
          mode="view"
          vaultId={props.vaultId}
          element={el}
          objectName={props.objectName}
          recordId={props.recordId}
          page={props.page}
          workflowTasks={props.workflowTasks}
          tabApiName={props.tabApiName}
          displayContext={props.displayContext}
          onReloadPage={props.onReloadPage}
        />
      </div>
    );
  }
  return (
    <RecordSectionElement
      key={el.field_api_name ?? displayText(el.label)}
      mode="view"
      vaultId={props.vaultId}
      element={el}
      objectName={props.objectName}
      recordId={props.recordId}
      page={props.page}
      workflowTasks={props.workflowTasks}
      tabApiName={props.tabApiName}
      displayContext={props.displayContext}
      onReloadPage={props.onReloadPage}
    />
  );
}

function editReferenceDisplay(
  props: EditProps,
  referenceDisplay?: FormReferenceDisplayContext,
): FormReferenceDisplayContext {
  return referenceDisplay ?? collectFormReferenceDisplayContext(props.sections);
}

function renderEditGridElement(
  props: EditProps,
  el: FormElement,
  sectionKeyValue: string,
  idx: number,
  referenceDisplay: FormReferenceDisplayContext,
): ReactNode {
  if (el.kind === "spacer") {
    return (
      <div
        key={`spacer-${sectionKeyValue}-${idx}`}
        className="field-grid__item field-grid__item--spacer"
        aria-hidden
      />
    );
  }
  if (el.kind === "control") {
    return (
      <div
        key={`control-${sectionKeyValue}-${el.name ?? idx}`}
        className="field-grid__item field-grid__item--layout-control"
      >
        <RecordSectionElement
          mode="edit"
          vaultId={props.vaultId}
          element={el}
          values={props.values}
          onFieldChange={props.onFieldChange}
          relatedAfterSaveHint={props.relatedAfterSaveHint}
          displayContext={props.displayContext}
          formSections={props.sections}
          localeReferencesByLanguage={props.localeReferencesByLanguage}
          referenceDisplay={referenceDisplay}
        />
      </div>
    );
  }
  return (
    <RecordSectionElement
      key={el.field_api_name}
      mode="edit"
      vaultId={props.vaultId}
      element={el}
      value={props.values[el.field_api_name!]}
      values={props.values}
      onFieldChange={props.onFieldChange}
      recordIdPlaceholder={props.recordIdPlaceholder}
      relatedAfterSaveHint={props.relatedAfterSaveHint}
      displayContext={props.displayContext}
      formSections={props.sections}
      localeReferencesByLanguage={props.localeReferencesByLanguage}
      referenceDisplay={referenceDisplay}
    />
  );
}

function renderTwoColumnGrid(
  props: RecordSectionListProps,
  sectionElements: PageElement[] | FormElement[],
  sectionKeyValue: string,
  referenceDisplay?: FormReferenceDisplayContext,
): ReactNode {
  const gridClass = fieldGridClassName(2);
  const { left, right } =
    props.mode === "view"
      ? partitionDetailformColumns(sectionElements as PageElement[], {
          isGridCell: isViewGridCell,
          isLayoutPhantom: isLayoutPhantom,
        })
      : partitionDetailformColumns(sectionElements as FormElement[], {
          isGridCell: isEditGridCell,
          isLayoutPhantom: isLayoutPhantom,
        });

  if (props.mode === "view") {
    const viewProps = props as ViewProps;
    return (
      <div className={gridClass}>
        <dl className="field-grid__column">
          {left.map((el, idx) => renderViewGridElement(viewProps, el as PageElement, sectionKeyValue, idx))}
        </dl>
        <dl className="field-grid__column">
          {right.map((el, idx) =>
            renderViewGridElement(viewProps, el as PageElement, sectionKeyValue, left.length + idx),
          )}
        </dl>
      </div>
    );
  }

  const editProps = props as EditProps;
  const resolvedReferenceDisplay = editReferenceDisplay(editProps, referenceDisplay);
  return (
    <div className={gridClass}>
      <dl className="field-grid__column">
        {left.map((el, idx) =>
          renderEditGridElement(editProps, el as FormElement, sectionKeyValue, idx, resolvedReferenceDisplay),
        )}
      </dl>
      <dl className="field-grid__column">
        {right.map((el, idx) =>
          renderEditGridElement(
            editProps,
            el as FormElement,
            sectionKeyValue,
            left.length + idx,
            resolvedReferenceDisplay,
          ),
        )}
      </dl>
    </div>
  );
}

function renderSingleColumnGrid(
  props: RecordSectionListProps,
  gridElements: PageElement[] | FormElement[],
  sectionKeyValue: string,
  formColumns: number | undefined,
  referenceDisplay?: FormReferenceDisplayContext,
): ReactNode {
  const gridClass = fieldGridClassName(formColumns);
  if (props.mode === "view") {
    const viewProps = props as ViewProps;
    return (
      <dl className={gridClass}>
        {gridElements.map((el, idx) => renderViewGridElement(viewProps, el as PageElement, sectionKeyValue, idx))}
      </dl>
    );
  }
  const editProps = props as EditProps;
  const resolvedReferenceDisplay = editReferenceDisplay(editProps, referenceDisplay);
  return (
    <dl className={gridClass}>
      {gridElements.map((el, idx) =>
        renderEditGridElement(editProps, el as FormElement, sectionKeyValue, idx, resolvedReferenceDisplay),
      )}
    </dl>
  );
}

function renderSectionBody(
  props: RecordSectionListProps,
  section: SectionContainer & { elements?: PageElement[] | FormElement[] | null },
  sectionId: string,
  sectionKeyValue: string,
  referenceDisplay?: FormReferenceDisplayContext,
): ReactNode {
  if (props.mode === "view") {
    const elements = section.elements as PageElement[];
    const gridElements = viewGridElements(elements);
    const otherElements = layoutElements(elements, section.form_columns);
    const relatedElements = otherElements.filter(
      (el) => el.kind === "relatedObject",
    );
    const sectionTitle = displayText(section.label, section.name);
    const hideRelatedHeader = Boolean(sectionTitle && relatedElements.length > 0);
    const isExpanded = props.expandedSections.has(sectionId);

    return (
      <>
        {gridElements.length > 0 &&
          (section.form_columns === 2
            ? renderTwoColumnGrid(props, elements, sectionKeyValue)
            : renderSingleColumnGrid(props, gridElements, sectionKeyValue, section.form_columns))}
        {otherElements.map((el, idx) => (
          <RecordSectionElement
            key={recordSectionElementKey("view", el, `${sectionKeyValue}-${idx}`, idx)}
            mode="view"
            vaultId={props.vaultId}
            element={el}
            objectName={props.objectName}
            recordId={props.recordId}
            page={props.page}
            workflowTasks={props.workflowTasks}
            tabApiName={props.tabApiName}
            displayContext={props.displayContext}
            hideRelatedHeader={
              el.kind === "relatedObject" ? hideRelatedHeader : undefined
            }
            sectionOpen={isExpanded}
            onRelatedCountChange={
              el.kind === "relatedObject"
                ? (total) => props.onSectionCountChange?.(sectionId, total)
                : undefined
            }
            onPageUpdate={props.onPageUpdate}
            onError={props.onError}
            onReloadPage={props.onReloadPage}
          />
        ))}
      </>
    );
  }

  const elements = section.elements as FormElement[];
  const gridElements = editGridElements(elements);
  const nonFieldElements = layoutElements(elements, section.form_columns);
  const resolvedReferenceDisplay = editReferenceDisplay(props, referenceDisplay);

  return (
    <>
      {gridElements.length > 0 &&
        (section.form_columns === 2
          ? renderTwoColumnGrid(props, elements, sectionKeyValue, resolvedReferenceDisplay)
          : renderSingleColumnGrid(props, gridElements, sectionKeyValue, section.form_columns, resolvedReferenceDisplay))}
      {nonFieldElements.map((el, idx) => (
        <RecordSectionElement
          key={recordSectionElementKey("edit", el, `${sectionKeyValue}-${idx}`, idx)}
          mode="edit"
          vaultId={props.vaultId}
          element={el}
          values={props.values}
          onFieldChange={props.onFieldChange}
          relatedAfterSaveHint={props.relatedAfterSaveHint}
          displayContext={props.displayContext}
          formSections={props.sections}
          localeReferencesByLanguage={props.localeReferencesByLanguage}
          referenceDisplay={resolvedReferenceDisplay}
        />
      ))}
    </>
  );
}

export function RecordSectionList(props: RecordSectionListProps) {
  const sections = props.sections ?? [];
  const editSections = props.mode === "edit" ? props.sections : undefined;
  const referenceDisplay = useMemo(
    () => (editSections ? collectFormReferenceDisplayContext(editSections) : undefined),
    [editSections],
  );
  if (sections.length === 0) {
    return renderEmptyState(props);
  }

  return (
    <div className="record-sections">
      {sections.map((section, sectionIndex) => {
        const sectionKeyValue = sectionKey(section, sectionIndex);
        const sectionTitle = displayText(section.label, section.name);
        const sectionId = sectionDomId(section, sectionIndex);
        const collapsible = props.mode === "view";
        const isExpanded = collapsible ? props.expandedSections.has(sectionId) : true;
        const hasRelatedElements =
          isViewProps(props) &&
          (section.elements ?? []).some(
            (el) => el.kind === "relatedObject",
          );
        const sectionCount = isViewProps(props) ? props.sectionCounts?.[sectionId] : undefined;
        const titleCount = hasRelatedElements ? sectionCount : undefined;

        const sectionHelp =
          "help_content" in section ? section.help_content : undefined;

        return (
          <RecordSectionBlock
            key={sectionKeyValue}
            id={sectionId}
            title={sectionTitle}
            titleCount={titleCount}
            helpContent={sectionHelp}
            collapsible={collapsible}
            expanded={isExpanded}
            onToggle={collapsible ? () => props.onToggleSection(sectionId) : undefined}
          >
            {renderSectionBody(props, section, sectionId, sectionKeyValue, referenceDisplay)}
          </RecordSectionBlock>
        );
      })}
    </div>
  );
}
