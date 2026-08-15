import { Button } from "antd";
import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  ariaLabel: string;
  disabled?: boolean;
  children: (close: () => void) => ReactNode;
};

export function ListActionsMenu({ ariaLabel, disabled, children }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocumentMouseDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onDocumentKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocumentMouseDown);
    document.addEventListener("keydown", onDocumentKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocumentMouseDown);
      document.removeEventListener("keydown", onDocumentKeyDown);
    };
  }, [open]);

  function close() {
    setOpen(false);
  }

  function toggle() {
    if (disabled) return;
    setOpen((prev) => !prev);
  }

  return (
    <div
      ref={rootRef}
      className={`list-toolbar__actions${open ? " list-toolbar__actions--open" : ""}`}
    >
      <Button
        type="text"
        className="list-toolbar__actions-trigger"
        aria-label={ariaLabel}
        title={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={toggle}
      />
      {open && (
        <div className="dropdown__panel dropdown__panel--list-actions" role="menu">
          {children(close)}
        </div>
      )}
    </div>
  );
}
