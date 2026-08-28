import { Button } from "antd";
import { useEffect, useMemo, useState } from "react";
import type {
  DisplayContext,
  PageElement,
  PageSection,
  RecordPageModel,
  StartNextWorkflowResult,
  WorkflowTaskAction,
} from "../api/types";
import {
  defaultPageMessages,
  displayText,
  type PageMessages,
} from "../lib/i18n";
import { RelatedObjectSection } from "./RelatedObjectSection";
import { RecordSectionList } from "./record/RecordSectionList";
import { sectionDomId, type SectionLike } from "./record/recordSectionUtils";

export type RecordSectionNavItem = {
  id: string;
  label: string;
  count?: number;
};

export { sectionDomId };

export function shouldShowRecordSectionNav(
  sections: SectionLike[],
  sectionCounts?: Record<string, number>,
): boolean {
  return recordSectionNavItems(sections, sectionCounts).length > 1;
}

export function recordSectionNavItems(
  sections: SectionLike[] | null | undefined,
  sectionCounts?: Record<string, number>,
): RecordSectionNavItem[] {
  return (sections ?? [])
    .filter((section) => !section.hidden)
    .map((section, index) => {
      const id = sectionDomId(section, index);
      const label = displayText(section.label, section.name);
      const count = sectionCounts?.[id];
      return {
        id,
        label,
        count,
      };
    })
    .filter((item) => item.label.trim().length > 0);
}

export function RecordSectionNav({
  sections,
  sectionCounts,
  ariaLabel,
  onNavigate,
  collapsed = false,
  onToggleCollapse,
  collapseLabel,
  expandLabel,
}: {
  sections: SectionLike[];
  sectionCounts?: Record<string, number>;
  ariaLabel?: string;
  onNavigate?: (sectionId: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  collapseLabel?: string;
  expandLabel?: string;
}) {
  const items = useMemo(
    () => recordSectionNavItems(sections, sectionCounts),
    [sections, sectionCounts],
  );
  const [activeId, setActiveId] = useState(items[0]?.id);
  const navLabel = ariaLabel ?? displayText(defaultPageMessages.section_nav_aria);

  useEffect(() => {
    setActiveId(items[0]?.id);
  }, [items]);

  useEffect(() => {
    if (items.length <= 1) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: 0.1 },
    );

    for (const item of items) {
      const node = document.getElementById(item.id);
      if (node) {
        observer.observe(node);
      }
    }

    return () => observer.disconnect();
  }, [items]);

  if (items.length <= 1) {
    return null;
  }

  if (collapsed) {
    return (
      <div className="record-section-nav record-section-nav--collapsed">
        <Button
          type="text"
          className="record-section-nav__collapse record-section-nav__collapse--expand"
          aria-label={expandLabel}
          title={expandLabel}
          onClick={onToggleCollapse}
        >
          »
        </Button>
      </div>
    );
  }

  return (
    <nav className="record-section-nav" aria-label={navLabel}>
      <ul className="record-section-nav__list">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={`record-section-nav__link${activeId === item.id ? " record-section-nav__link--active" : ""}`}
              onClick={() => {
                setActiveId(item.id);
                onNavigate?.(item.id);
              }}
            >
              {item.label}
              {item.count !== undefined && (
                <span className="record-section-nav__count"> ({item.count})</span>
              )}
            </a>
          </li>
        ))}
      </ul>
      {onToggleCollapse && (
        <Button
          type="text"
          className="record-section-nav__collapse"
          aria-label={collapseLabel}
          onClick={onToggleCollapse}
        >
          {collapseLabel}
        </Button>
      )}
    </nav>
  );
}

export function splitRecordSections(sections: PageSection[]) {
  const mainSections: PageSection[] = [];
  const related: Array<{
    key: string;
    sectionLabel: string;
    label: string;
    descriptor: NonNullable<PageElement["related"]>;
  }> = [];

  for (const section of sections) {
    const sectionLabel = displayText(section.label, section.name);
    const mainElements: PageElement[] = [];
    for (const el of section.elements ?? []) {
      if (el.kind === "relatedObject" && el.related) {
        related.push({
          key:
            el.layout_element_id ??
            el.relationship_ref ??
            displayText(el.label) ??
            sectionLabel,
          sectionLabel,
          label: displayText(el.label, el.related.target_object_api_name),
          descriptor: el.related,
        });
      } else {
        mainElements.push(el);
      }
    }
    if (mainElements.length > 0 || sectionLabel) {
      mainSections.push({ ...section, elements: mainElements });
    }
  }

  return { mainSections, related };
}

export function RecordFieldSections({
  vaultId,
  objectName,
  recordId,
  page,
  sections,
  workflowTasks,
  tabApiName,
  displayContext,
  messages,
  expandedSections,
  sectionCounts,
  onToggleSection,
  onSectionCountChange,
  onPageUpdate,
  onError,
  onReloadPage,
  onStartNext,
}: {
  vaultId: string;
  objectName?: string;
  recordId?: string;
  page?: RecordPageModel;
  sections: PageSection[];
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
  onStartNext?: (prompt: StartNextWorkflowResult) => void;
}) {
  return (
    <RecordSectionList
      mode="view"
      vaultId={vaultId}
      sections={sections}
      objectName={objectName}
      recordId={recordId}
      page={page}
      workflowTasks={workflowTasks}
      tabApiName={tabApiName}
      displayContext={displayContext}
      messages={messages}
      expandedSections={expandedSections}
      sectionCounts={sectionCounts}
      onToggleSection={onToggleSection}
      onSectionCountChange={onSectionCountChange}
      onPageUpdate={onPageUpdate}
      onError={onError}
      onReloadPage={onReloadPage}
      onStartNext={onStartNext}
    />
  );
}

export function RecordRelatedSections({
  vaultId,
  related,
  messages,
}: {
  vaultId: string;
  related: ReturnType<typeof splitRecordSections>["related"];
  messages?: PageMessages;
}) {
  const pageMessages = messages ?? defaultPageMessages;
  if (related.length === 0) {
    return null;
  }

  return (
    <div className="record-aside-sections">
      <h2 className="record-aside-sections__title">{displayText(pageMessages.related_objects)}</h2>
      {related.map((item) => (
        <RelatedObjectSection
          key={item.key}
          vaultId={vaultId}
          label={item.label}
          descriptor={item.descriptor}
          isOpen
        />
      ))}
    </div>
  );
}
