import { Button } from "antd";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { DisplayText, ListRouting, ObjectTypeOption } from "../api/types";
import { useUi } from "../context/UiContext";
import { displayText } from "../lib/i18n";
import { buildListCreateHref } from "../lib/listRouting";
import { CreateObjectTypeModal } from "./CreateObjectTypeModal";

type Props = {
  vaultId: string;
  tabApiName: string;
  objectApiName: string;
  objectLabel?: DisplayText;
  allowed: boolean;
  requiresTypeSelection?: boolean;
  objectTypes?: ObjectTypeOption[];
  defaultObjectType?: string;
  listRouting?: ListRouting | null;
  className?: string;
};

export function ListCreateButton({
  vaultId,
  tabApiName,
  objectApiName,
  objectLabel,
  allowed,
  requiresTypeSelection,
  objectTypes = [],
  defaultObjectType,
  listRouting,
  className = "tab-nav__create",
}: Props) {
  const { shell } = useUi();
  const navigate = useNavigate();
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const resolvedObjectLabel = displayText(objectLabel, objectApiName);

  if (!allowed) return null;

  if (requiresTypeSelection && objectTypes.length > 1) {
    return (
      <>
        <Button type="primary" className={className} onClick={() => setTypeModalOpen(true)}>
          {displayText(shell.list_create)}
        </Button>
        <CreateObjectTypeModal
          open={typeModalOpen}
          objectLabel={resolvedObjectLabel}
          objectTypes={objectTypes}
          defaultObjectType={defaultObjectType}
          onCancel={() => setTypeModalOpen(false)}
          onConfirm={(objectType) => {
            navigate(buildListCreateHref(objectApiName, tabApiName, objectType, listRouting));
            setTypeModalOpen(false);
          }}
        />
      </>
    );
  }

  const objectType =
    objectTypes.length === 1 ? objectTypes[0]?.api_name : defaultObjectType;
  const href = buildListCreateHref(objectApiName, tabApiName, objectType, listRouting);

  return (
    <Link to={href} className="list-create-button__link">
      <Button type="primary" className={className}>
        {displayText(shell.list_create)}
      </Button>
    </Link>
  );
}
