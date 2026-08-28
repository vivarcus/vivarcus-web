import { Button } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { RelatedCreateOptions, RelatedSectionModel } from "../api/types";
import { buildRelatedCreateHref } from "../lib/relatedCreate";
import { readNavTrailParam } from "../lib/navTrail";
import { defaultRelatedChrome, displayText } from "../lib/i18n";
import { useRelatedSectionVaultId } from "../hooks/useRelatedSectionVaultId";
import { CreateObjectTypeModal } from "./CreateObjectTypeModal";
import { RelatedCreateFormPanel } from "./RelatedCreateFormPanel";

type Props = {
  vaultId: string;
  sectionToken: string;
  targetObjectApiName: string;
  modalCreateRecord: boolean;
  chrome?: typeof defaultRelatedChrome;
  onCreated: (section?: RelatedSectionModel) => void;
  onError: (message: string) => void;
};

export function RelatedCreateButton({
  vaultId: _vaultId,
  sectionToken,
  targetObjectApiName,
  modalCreateRecord,
  chrome = defaultRelatedChrome,
  onCreated,
  onError,
}: Props) {
  const effectiveVaultId = useRelatedSectionVaultId(sectionToken);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<RelatedCreateOptions | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [selectedObjectType, setSelectedObjectType] = useState<string | undefined>();
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // The parent record itself comes from the related-create form model, so only
  // its own ancestors need forwarding.
  const navTrail = readNavTrailParam(location.search);

  const loadOptions = useCallback(async () => {
    setLoading(true);
    onErrorRef.current("");
    try {
      const model = await api.loadRelatedCreateOptions(effectiveVaultId, {
        section_context_token: sectionToken,
      });
      setOptions(model);
      return model;
    } catch (err) {
      onErrorRef.current(
        err instanceof Error ? err.message : displayText(defaultRelatedChrome.create_failed),
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [effectiveVaultId, sectionToken]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const openCreate = useCallback(
    (objectType?: string) => {
      if (modalCreateRecord) {
        setSelectedObjectType(objectType);
        setShowCreateForm(true);
        return;
      }
      const tab = searchParams.get("tab") ?? undefined;
      navigate(
        buildRelatedCreateHref(targetObjectApiName, sectionToken, {
          objectType,
          navTrail,
          tab,
        }),
      );
    },
    [modalCreateRecord, navigate, navTrail, searchParams, sectionToken, targetObjectApiName],
  );

  function startCreate(objectType?: string) {
    const action = options?.create_action;
    if (!action?.allowed) return;
    openCreate(objectType ?? action.default_object_type ?? action.object_types?.[0]?.api_name);
  }

  const types = options?.create_action.object_types ?? [];
  const needsTypeSelection =
    Boolean(options?.create_action.requires_type_selection) && types.length > 1;
  const createObjectLabel = displayText(options?.target_object_label, targetObjectApiName);

  return (
    <>
      <Button
        type="primary"
        size="small"
        className="related-section__create-btn"
        loading={loading}
        disabled={loading || options?.create_action.allowed === false}
        onClick={() => {
          if (needsTypeSelection) {
            setShowTypeModal(true);
            return;
          }
          startCreate();
        }}
      >
        {displayText(chrome.create_related)}
      </Button>
      {needsTypeSelection && (
        <CreateObjectTypeModal
          open={showTypeModal}
          objectLabel={createObjectLabel}
          objectTypes={types}
          defaultObjectType={options?.create_action.default_object_type}
          onCancel={() => setShowTypeModal(false)}
          onConfirm={(objectType) => {
            setShowTypeModal(false);
            startCreate(objectType);
          }}
        />
      )}
      {showCreateForm && (
        <RelatedCreateFormPanel
          sectionToken={sectionToken}
          objectTypeName={selectedObjectType}
          modal
          chrome={chrome}
          onCreated={(section, createAnother) => {
            onCreated(section);
            if (!createAnother) {
              setShowCreateForm(false);
            }
          }}
          onCancel={() => setShowCreateForm(false)}
          onError={onError}
        />
      )}
    </>
  );
}
