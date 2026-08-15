import { Button, Modal } from "antd";
import { useState } from "react";
import { RecordAuditPanel } from "./RecordAuditPanel";
import { auditTrailModalTitle, formatAuditRecordCellLabel } from "../lib/recordAuditDisplay";
import { defaultAuditChrome, displayText, type AuditChrome } from "../lib/i18n";

type Props = {
  open: boolean;
  vaultId: string;
  objectName: string;
  recordId: string;
  objectLabel: string;
  recordDisplayName: string;
  onClose: () => void;
};

export function RecordAuditModal({
  open,
  vaultId,
  objectName,
  recordId,
  objectLabel,
  recordDisplayName,
  onClose,
}: Props) {
  const [auditChrome, setAuditChrome] = useState<AuditChrome>(defaultAuditChrome);

  return (
    <Modal
      open={open}
      title={auditTrailModalTitle(objectLabel, recordDisplayName, auditChrome)}
      onCancel={onClose}
      footer={
        <div className="record-audit-modal__footer">
          <Button type="primary" onClick={onClose}>
            {displayText(auditChrome.close)}
          </Button>
        </div>
      }
      width={920}
      className="record-audit-modal"
      destroyOnHidden
      maskClosable
      afterOpenChange={(isOpen) => {
        if (!isOpen) setAuditChrome(defaultAuditChrome);
      }}
    >
      <RecordAuditPanel
        vaultId={vaultId}
        objectName={objectName}
        recordId={recordId}
        recordCell={formatAuditRecordCellLabel(objectLabel, recordDisplayName)}
        onChromeChange={setAuditChrome}
      />
    </Modal>
  );
}
