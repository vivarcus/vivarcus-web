import type { DisplayContext, SummaryInfoModel } from "../api/types";
import { displayText } from "../lib/i18n";
import { FieldValue } from "./FieldValue";

type Props = {
  vaultId: string;
  summary: SummaryInfoModel;
  tabApiName?: string;
  displayContext?: DisplayContext;
};

export function SummaryInfoPanel({ vaultId, summary, tabApiName, displayContext }: Props) {
  if ((summary.fields?.length ?? 0) === 0) {
    return null;
  }

  return (
    <div className="summary-info">
      <dl className="summary-info__grid">
        {summary.fields.map((field) => (
          <div key={field.field_api_name} className="summary-info__item">
            <dt>{displayText(field.label, field.field_api_name)}</dt>
            <dd>
              <FieldValue
                vaultId={vaultId}
                value={field.value}
                fieldApiName={field.field_api_name}
                fieldType={field.field_type}
                targetObjectApiName={field.target_object_api_name}
                tabApiName={tabApiName}
                displayContext={displayContext}
                fieldRender={field.field_render}
                hoverCard={field.field_render?.hover_card}
              />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
