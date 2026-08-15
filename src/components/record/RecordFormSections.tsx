import type { DisplayContext, FormSection, PicklistEntryOption } from "../../api/types";
import { RecordSectionList } from "./RecordSectionList";

type Props = {
  vaultId: string;
  sections: FormSection[];
  values: Record<string, unknown>;
  onFieldChange: (name: string, value: unknown) => void;
  recordIdPlaceholder?: string;
  relatedAfterSaveHint?: string;
  displayContext?: DisplayContext;
  localeReferencesByLanguage?: Record<string, PicklistEntryOption[]>;
};

export function RecordFormSections({
  vaultId,
  sections,
  values,
  onFieldChange,
  recordIdPlaceholder,
  relatedAfterSaveHint,
  displayContext,
  localeReferencesByLanguage,
}: Props) {
  return (
    <RecordSectionList
      mode="edit"
      vaultId={vaultId}
      sections={sections}
      values={values}
      onFieldChange={onFieldChange}
      recordIdPlaceholder={recordIdPlaceholder}
      relatedAfterSaveHint={relatedAfterSaveHint}
      displayContext={displayContext}
      localeReferencesByLanguage={localeReferencesByLanguage}
    />
  );
}
