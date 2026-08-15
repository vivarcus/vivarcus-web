import type { ReactNode } from "react";
import { adminEllipsisCell, adminFirstColumnCell } from "../admin/adminTableCells";

export function sandboxEllipsisCell(value: string | undefined) {
  const cell = adminEllipsisCell(value);
  return value ? cell : "";
}

export function sandboxFirstColumnCell(value: string | undefined, actions: ReactNode | null) {
  const main = sandboxEllipsisCell(value);
  if (!actions) return main;
  return adminFirstColumnCell(value, main, actions);
}
