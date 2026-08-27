import { BooleanCheckboxRenderer } from "./BooleanCheckboxRenderer";
import { ComponentPickerRenderer } from "./ComponentPickerRenderer";
import { DateInputRenderer } from "./DateInputRenderer";
import { DateTimeInputRenderer } from "./DateTimeInputRenderer";
import { TimeInputRenderer } from "./TimeInputRenderer";
import {
  FormDisplayLinkRenderer,
  FormDisplayRichTextRenderer,
  FormDisplayTextRenderer,
} from "./FormDisplayRenderers";
import { ImagePickerRenderer } from "./ImageFieldRenderer";
import { NumberInputRenderer } from "./NumberInputRenderer";
import { PicklistMultiRenderer } from "./PicklistMultiRenderer";
import { PicklistSelectRenderer } from "./PicklistSelectRenderer";
import { RecordPickerRenderer } from "./RecordPickerRenderer";
import { RichTextEditorRenderer } from "./RichTextEditorRenderer";
import { TextAreaRenderer } from "./TextAreaRenderer";
import { TextInputRenderer } from "./TextInputRenderer";
import { UserPickerRenderer } from "./UserPickerRenderer";
import type { FormRendererComponent, FormRendererKind } from "./types";

const FORM_RENDERERS: Record<FormRendererKind, FormRendererComponent> = {
  text_input: TextInputRenderer,
  textarea: TextAreaRenderer,
  number_input: NumberInputRenderer,
  boolean_checkbox: BooleanCheckboxRenderer,
  date_input: DateInputRenderer,
  datetime_input: DateTimeInputRenderer,
  time_input: TimeInputRenderer,
  picklist_select: PicklistSelectRenderer,
  picklist_multiselect: PicklistMultiRenderer,
  record_picker: RecordPickerRenderer,
  image_picker: ImagePickerRenderer,
  user_picker: UserPickerRenderer,
  component_picker: ComponentPickerRenderer,
  rich_text_editor: RichTextEditorRenderer,
  display_rich_text: FormDisplayRichTextRenderer,
  display_text: FormDisplayTextRenderer,
  display_link: FormDisplayLinkRenderer,
};

export function getFormRenderer(kind: FormRendererKind): FormRendererComponent | undefined {
  return FORM_RENDERERS[kind];
}

export { FORM_RENDERERS };
