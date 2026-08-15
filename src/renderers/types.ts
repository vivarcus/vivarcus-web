import type { ReactNode } from "react";
import type {
  DisplayContext,
  FieldRenderModel,
  FormElement,
  HoverCardModel,
  NavigationTarget,
} from "../api/types";

export type FormRendererProps = {
  vaultId: string;
  element: FormElement;
  value: unknown;
  onChange: (value: unknown) => void;
  recordIdPlaceholder?: string;
  showLabel?: boolean;
  displayContext?: DisplayContext;
  /** Current form values for relationship_criteria {{this.field}} resolution. */
  formValues?: Record<string, unknown>;
  /** Field display_value map for controlling_field path option labels. */
  formFieldDisplays?: Record<string, string>;
  /** field_api_name → field label for "Depends on {field}" placeholders. */
  formFieldLabels?: Record<string, string>;
  /** field_api_name → controlling_field_api_name for path walks. */
  controllingParents?: Record<string, string>;
};

export type DisplayRendererProps = {
  vaultId?: string;
  value: unknown;
  fieldApiName?: string;
  fieldType?: string;
  targetObjectApiName?: string;
  tabApiName?: string;
  displayContext?: DisplayContext;
  fieldRender?: FieldRenderModel;
  navigationTarget?: NavigationTarget | null;
  hoverCard?: HoverCardModel;
  onRecordMutated?: () => void | Promise<void>;
};

export type FormRendererComponent = (props: FormRendererProps) => ReactNode;
export type DisplayRendererComponent = (props: DisplayRendererProps) => ReactNode;

export const FORM_RENDERER_KINDS = [
  "text_input",
  "textarea",
  "number_input",
  "boolean_checkbox",
  "date_input",
  "datetime_input",
  "picklist_select",
  "picklist_multiselect",
  "record_picker",
  "image_picker",
  "user_picker",
  "component_picker",
  "rich_text_editor",
  "display_rich_text",
  "display_text",
  "display_link",
] as const;

export type FormRendererKind = (typeof FORM_RENDERER_KINDS)[number];

export const DISPLAY_RENDERER_KINDS = [
  "display_text",
  "display_link",
  "display_rich_text",
  "display_icon",
  "display_image",
] as const;

export type DisplayRendererKind = (typeof DISPLAY_RENDERER_KINDS)[number];
