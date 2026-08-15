import type { ReactNode } from "react";
import {
  InboxOutlined,
  BlockOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  EditOutlined,
  FileDoneOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  RocketOutlined,
  StopOutlined,
} from "@ant-design/icons";

// Veeva surfaces lifecycle user actions as icon+label buttons. There is no
// per-action icon in the metadata, so we infer one from the action name's
// semantics. Unmatched actions render with no icon (graceful fallback to a
// plain label button), keeping the toolbar legible for object-specific actions.
const ICON_RULES: Array<{ test: RegExp; icon: ReactNode }> = [
  { test: /start.?planning|kickoff|initiate|plan/i, icon: <RocketOutlined /> },
  { test: /launch|activate|resume|reopen|start/i, icon: <PlayCircleOutlined /> },
  { test: /complete|finish|finalize|close|done/i, icon: <CheckCircleOutlined /> },
  { test: /archive/i, icon: <InboxOutlined /> },
  { test: /cancel|void|reject/i, icon: <CloseCircleOutlined /> },
  { test: /pause|hold|suspend/i, icon: <PauseCircleOutlined /> },
  { test: /stop|abort/i, icon: <StopOutlined /> },
  { test: /block|lock/i, icon: <BlockOutlined /> },
  { test: /reset|recalculate|reprocess/i, icon: <ReloadOutlined /> },
  { test: /sign|signature|approve/i, icon: <FileDoneOutlined /> },
  { test: /copy|clone|duplicate/i, icon: <CopyOutlined /> },
  { test: /edit|update|modify/i, icon: <EditOutlined /> },
];

export function lifecycleActionIcon(name: string, label?: string): ReactNode | undefined {
  const haystack = `${name} ${label ?? ""}`;
  for (const rule of ICON_RULES) {
    if (rule.test.test(haystack)) {
      return rule.icon;
    }
  }
  return undefined;
}
