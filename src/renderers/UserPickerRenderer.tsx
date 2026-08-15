import type { FormRendererProps } from "./types";
import { RecordPickerRenderer } from "./RecordPickerRenderer";
import { resolveTargetObjectApiName } from "./formUtils";

const USER_SYS_OBJECT = "user__sys";

export function UserPickerRenderer(props: FormRendererProps) {
  const target = resolveTargetObjectApiName(props.element) || USER_SYS_OBJECT;
  return (
    <RecordPickerRenderer
      {...props}
      element={{
        ...props.element,
        target_object_api_name: target,
        field_render: props.element.field_render
          ? {
              ...props.element.field_render,
              target_object_api_name: target,
            }
          : {
              field_ref: {
                field_api_name: props.element.field_api_name ?? "",
              },
              field_type: "users",
              renderer_kind: "user_picker",
              support_state: "supported",
              target_object_api_name: target,
              visibility: "visible",
              editability: props.element.read_only ? "readonly" : "editable",
              requiredness: props.element.required ? "required" : "optional",
              required_satisfaction: "satisfied",
            },
      }}
    />
  );
}
