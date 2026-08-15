import { Collapse } from "antd";
import type { MetadataNameValuePair } from "../../api/types";
import { useUi } from "../../context/UiContext";
import { groupFieldAttributes, groupObjectAttributes } from "../../lib/metadataAttributeGroups";
import { AttributeTable } from "./AttributeTable";

// GroupedAttributeTable presents attributes in concern-based Collapse panels instead of one
// flat table. mode="object" (default) uses Object groups; mode="field" uses Field groups.
export function GroupedAttributeTable({
  attributes,
  mode = "object",
}: {
  attributes: MetadataNameValuePair[];
  mode?: "object" | "field";
}) {
  const { shell } = useUi();
  const groups =
    mode === "field"
      ? groupFieldAttributes(attributes, shell)
      : groupObjectAttributes(attributes, shell);
  if (groups.length === 0) {
    return <AttributeTable attributes={attributes} />;
  }
  return (
    <Collapse
      defaultActiveKey={groups.map((g) => g.key)}
      items={groups.map((g) => ({
        key: g.key,
        label: `${g.label} (${g.attributes.length})`,
        children: <AttributeTable attributes={g.attributes} />,
      }))}
    />
  );
}
