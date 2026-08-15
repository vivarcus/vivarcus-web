import { Checkbox, Tag, Tooltip } from "antd";
import { displayText } from "../lib/i18n";
import type { ShellChrome } from "../lib/i18n";
import { OBJECT_CRUD_ACTIONS } from "./permissionSetView";

export function permissionActionLabel(shell: ShellChrome, action: string): string {
  const labels: Record<string, ReturnType<typeof displayText>> = {
    create: displayText(shell.metadata_permission_action_create),
    read: displayText(shell.metadata_permission_action_read),
    edit: displayText(shell.metadata_permission_action_edit),
    delete: displayText(shell.metadata_permission_action_delete),
    view: displayText(shell.metadata_permission_action_view),
  };
  return labels[action] ?? action;
}

// renderActions renders a permission entry's actions as a checkbox matrix, mirroring Veeva's
// permission set detail page. When the entry carries an available_actions candidate set, each
// candidate is a read-only checkbox laid out in an aligned grid: a granted action is checked
// with full contrast; a supported-but-ungranted action is unchecked and dimmed so the eye can
// tell at a glance which capabilities are held back. Granted actions outside the candidate set
// (exotic/custom) are appended in a visually separated "other" group as Tags so nothing is
// silently dropped. Entries without a candidate set fall back to showing each granted action as
// a checked checkbox.
export function renderActions(
  entry: { actions: string[]; available_actions: string[] },
  shell: ShellChrome,
) {
  const granted = entry.actions ?? [];
  const candidates = entry.available_actions ?? [];
  if (granted.length === 0 && candidates.length === 0) return "";

  if (candidates.length === 0) {
    return (
      <span className="perm-actions">
        {granted.map((a) => (
          <Checkbox key={a} checked disabled className="perm-actions__check">
            {permissionActionLabel(shell, a)}
          </Checkbox>
        ))}
      </span>
    );
  }

  const grantedSet = new Set(granted);
  const overflow = granted.filter((a) => !candidates.includes(a));
  return (
    <span className="perm-actions">
      {candidates.map((a) => {
        const isGranted = grantedSet.has(a);
        return (
          <Checkbox
            key={a}
            checked={isGranted}
            disabled
            className={`perm-actions__check${isGranted ? "" : " perm-actions__check--off"}`}
          >
            {permissionActionLabel(shell, a)}
          </Checkbox>
        );
      })}
      {overflow.length > 0 && (
        <span className="perm-actions__other">
          {overflow.map((a) => (
            <Tag key={a} className="mono">
              {a}
            </Tag>
          ))}
        </span>
      )}
    </span>
  );
}

// ObjectCrudBadges renders an object's object-level record-access grant as compact Read / Create /
// Edit / Delete pills (granted = solid, ungranted = faint) so an administrator can scan an
// object's access at a glance. Empty grants render as faint unchecked pills (no "No record
// access" copy) so the row never looks like a missing configuration.
export function ObjectCrudBadges({ actions }: { actions: string[] }) {
  const granted = new Set(actions);
  return (
    <span className="perm-obj-header__crud">
      {OBJECT_CRUD_ACTIONS.map((action) => {
        const on = granted.has(action);
        return (
          <Tooltip key={action} title={action}>
            <span className={`perm-crud${on ? " perm-crud--on" : ""}`}>
              {action.charAt(0).toUpperCase()}
            </span>
          </Tooltip>
        );
      })}
    </span>
  );
}

// ObjectCrudCheckbox renders one read-only CRUD checkbox for the Objects-tab / object-detail
// matrix, matching Veeva's Read / Create / Edit / Delete columns. When the action is in
// inheritedActions (came from an All/wildcard rule), a "*" is shown beside the checkbox.
export function ObjectCrudCheckbox({
  action,
  actions,
  inheritedActions,
  label,
}: {
  action: string;
  actions: string[];
  inheritedActions?: string[];
  label?: string;
}) {
  const granted = (actions ?? []).includes(action);
  const inherited = granted && (inheritedActions ?? []).includes(action);
  const ariaLabel = label ?? action;
  return (
    <span className="perm-crud-cell">
      <Checkbox
        checked={granted}
        disabled
        className={`perm-actions__check${granted ? "" : " perm-actions__check--off"}`}
        aria-label={inherited ? `${ariaLabel} (*)` : ariaLabel}
      />
      {inherited && (
        <span className="perm-crud-cell__star" aria-hidden="true">
          *
        </span>
      )}
    </span>
  );
}
