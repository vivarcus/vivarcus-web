import { AdminCompactTable } from "../admin/AdminCompactTable";
import type { TableProps } from "antd";

type Props<T extends object> = TableProps<T> & {
  scrollX?: number;
  loading?: boolean;
  compact?: boolean;
  fixedLayout?: boolean;
};

/** Sandbox deployment tables — same as {@link AdminCompactTable} with `compact` default false. */
export function SandboxDeploymentTable<T extends object>({
  loading,
  compact = false,
  ...props
}: Props<T>) {
  return <AdminCompactTable<T> loadingOverlay={loading} compact={compact} {...props} />;
}
