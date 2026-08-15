import { Form } from "antd";
import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";

export function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <span>
      {label}
      {required && <span className="field__required">*</span>}
    </span>
  );
}

function withControlId(control: ReactNode, id: string): ReactNode {
  if (!isValidElement(control)) {
    return control;
  }
  const element = control as ReactElement<{ id?: string }>;
  if (element.props.id) {
    return control;
  }
  return cloneElement(element, { id });
}

export function FieldUnavailableControl({
  control,
  hint,
}: {
  control: ReactNode;
  hint: string;
}) {
  return (
    <div className="field__unavailable">
      {control}
      <span className="field__hint field__hint--error">{hint}</span>
    </div>
  );
}

export function wrapFormControl(
  control: ReactNode,
  {
    label,
    required,
    showLabel = true,
    className = "field",
  }: {
    label: string;
    required?: boolean;
    showLabel?: boolean;
    className?: string;
  },
) {
  const controlId = useId();

  if (!showLabel) {
    return control;
  }

  return (
    <Form.Item
      label={label}
      required={required}
      className={className}
      htmlFor={controlId}
    >
      {withControlId(control, controlId)}
    </Form.Item>
  );
}
