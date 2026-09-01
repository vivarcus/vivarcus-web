import {
  Alert,
  Button,
  Radio,
  message,
} from "antd";
import { EditOutlined, SaveOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import "../styles/pages/branding-settings.css";
import { RecordSectionBlock } from "../components/record/RecordSectionBlock";
import { AdminPageLoading } from "../components/admin/AdminPageLoading";
import { AdminPageSection } from "../components/admin/AdminPageSection";
import { AdminPageShell } from "../components/admin/AdminPageShell";
import { useVaultId } from "../hooks/useVaultId";
import { useUi } from "../context/UiContext";
import { api } from "../api/client";
import type {
  BrandingAsset,
  BrandingAssetSlot,
  BrandingDefaults,
  BrandingPageChrome,
  BrandingSettingsModel,
} from "../api/types";
import { displayText } from "../lib/i18n";

const EMPTY_ASSET: BrandingAsset = {
  storage_key: "",
  filename: "",
  content_type: "",
  size: 0,
  url: "",
  updated_at: "",
};

type PreviewKind = "logo" | "header" | "banner";

type AssetConfig = {
  slot: BrandingAssetSlot;
  label: string;
  preview: PreviewKind;
};

const DOCUMENT_LOGO_ITEMS: AssetConfig[] = [
  { slot: "document_primary_logo", label: "primary", preview: "logo" },
  { slot: "document_secondary_logo", label: "secondary", preview: "logo" },
];

function formatFileSize(size: number) {
  if (size <= 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function BrandingImage({
  vaultId,
  asset,
  alt,
  className,
}: {
  vaultId: string;
  asset: BrandingAsset;
  alt: string;
  className?: string;
}) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    if (!asset.url) {
      setSrc("");
      return;
    }
    if (asset.storage_key === "preview" || asset.url.startsWith("blob:")) {
      setSrc(asset.url);
      return;
    }
    if (!asset.storage_key) {
      setSrc("");
      return;
    }
    let active = true;
    let objectUrl = "";
    void api.fetchBrandingAssetBlob(vaultId, asset.url).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setSrc(objectUrl);
    }).catch(() => {
      if (active) setSrc("");
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [vaultId, asset.storage_key, asset.url]);

  if (!src) return null;
  return <img className={className} src={src} alt={alt} />;
}

function BrandingPreview({
  vaultId,
  asset,
  defaults,
  preview,
}: {
  vaultId: string;
  asset: BrandingAsset;
  defaults: BrandingDefaults;
  preview: PreviewKind;
}) {
  if (asset.storage_key) {
    return (
      <div className={`branding-settings__preview branding-settings__preview--${preview}`}>
        <BrandingImage vaultId={vaultId} asset={asset} alt={asset.filename || defaults.header_text} />
      </div>
    );
  }

  if (preview === "header") {
    return (
      <div className="branding-settings__preview branding-settings__preview--header">
        <span className="branding-settings__product">{defaults.product_name}</span>
        <span className="branding-settings__clinical">{defaults.app_name}</span>
      </div>
    );
  }

  return (
    <div className={`branding-settings__preview branding-settings__preview--${preview}`}>
      <div className="branding-settings__banner-line" />
      <span className="branding-settings__product">{defaults.banner_text}</span>
    </div>
  );
}

function labelForItem(chrome: BrandingPageChrome, item: AssetConfig) {
  if (item.label === "primary") return displayText(chrome.primary_logo_label);
  if (item.label === "secondary") return displayText(chrome.secondary_logo_label);
  return item.label;
}

export function BrandingSettingsPage() {
  const vaultId = useVaultId();
  const { shell } = useUi();
  const [model, setModel] = useState<BrandingSettingsModel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!vaultId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBrandingSettings(vaultId);
      setModel(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : displayText(shell.load_failed));
    } finally {
      setLoading(false);
    }
  }, [vaultId, shell.load_failed]);

  useEffect(() => {
    void load();
  }, [load]);

  const validateFile = (file: File) => {
    if (!model) return false;
    if (file.size > model.constraints.max_asset_size) {
      message.error(displayText(model.chrome.file_too_large));
      return false;
    }
    if (!model.constraints.content_types.includes(file.type)) {
      message.error(displayText(model.chrome.unsupported_type));
      return false;
    }
    return true;
  };

  const uploadAsset = async (slot: BrandingAssetSlot, file: File) => {
    if (!vaultId || !model || !validateFile(file)) return;
    setSaving(true);
    try {
      const data = await api.uploadBrandingAsset(vaultId, slot, file);
      setModel(data);
      message.success(displayText(data.chrome.upload_success));
    } catch (err) {
      message.error(err instanceof Error ? err.message : displayText(model.chrome.upload_failed));
    } finally {
      setSaving(false);
    }
  };

  const saveDefaultAsset = async (slot: BrandingAssetSlot) => {
    if (!vaultId || !model) return;
    setSaving(true);
    try {
      const data = await api.saveBrandingSettings(vaultId, {
        ...model.settings,
        [slot]: EMPTY_ASSET,
      });
      setModel(data);
      message.success(displayText(data.chrome.save_success));
    } catch (err) {
      message.error(err instanceof Error ? err.message : displayText(model.chrome.save_failed));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <AdminPageLoading />;
  }

  if (error || !model) {
    return (
      <AdminPageShell title={displayText(shell.admin_branding_settings)}>
        <Alert type="error" showIcon title={error ?? displayText(shell.load_failed)} />
      </AdminPageShell>
    );
  }

  const chrome = model.chrome;

  return (
    <AdminPageShell title={displayText(chrome.vault_section_title)}>
      <div className="admin-page__body admin-settings-form__body">
          <RecordSectionBlock title={displayText(chrome.document_logos_title)}>
            <p className="admin-settings-form__note">{displayText(chrome.document_logos_note)}</p>
            <DocumentLogosPanel
              vaultId={vaultId!}
              model={model}
              saving={saving}
              onUpload={uploadAsset}
            />
          </RecordSectionBlock>

          <BrandingPanel
            vaultId={vaultId!}
            title={displayText(chrome.email_banner_title)}
            note={displayText(chrome.vault_email_banner_note)}
            item={{ slot: "vault_email_banner", label: "default_banner", preview: "banner" }}
            model={model}
            saving={saving}
            onUpload={uploadAsset}
            onUseDefault={saveDefaultAsset}
          />

          <AdminPageSection title={displayText(chrome.site_user_section_title)}>
            <BrandingPanel
              vaultId={vaultId!}
              title={displayText(chrome.header_logo_title)}
              note={displayText(chrome.site_header_logo_note)}
              item={{ slot: "site_header_logo", label: "default_logo", preview: "header" }}
              model={model}
              saving={saving}
              onUpload={uploadAsset}
              onUseDefault={saveDefaultAsset}
            />

            <BrandingPanel
              vaultId={vaultId!}
              title={displayText(chrome.email_banner_title)}
              note={displayText(chrome.site_email_banner_note)}
              item={{ slot: "site_email_banner", label: "default_banner", preview: "banner" }}
              model={model}
              saving={saving}
              onUpload={uploadAsset}
              onUseDefault={saveDefaultAsset}
            />
          </AdminPageSection>
        </div>
    </AdminPageShell>
  );
}

function DocumentLogosPanel({
  vaultId,
  model,
  saving,
  onUpload,
}: {
  vaultId: string;
  model: BrandingSettingsModel;
  saving: boolean;
  onUpload: (slot: BrandingAssetSlot, file: File) => Promise<void>;
}) {
  const chrome = model.chrome;
  const [editing, setEditing] = useState(false);
  const [draftFiles, setDraftFiles] = useState<Partial<Record<BrandingAssetSlot, File>>>({});

  const chooseFile = (slot: BrandingAssetSlot, file: File) => {
    setDraftFiles((current) => ({ ...current, [slot]: file }));
  };

  const cancelEdit = () => {
    setDraftFiles({});
    setEditing(false);
  };

  const saveEdit = async () => {
    for (const item of DOCUMENT_LOGO_ITEMS) {
      const file = draftFiles[item.slot];
      if (file) {
        await onUpload(item.slot, file);
      }
    }
    setDraftFiles({});
    setEditing(false);
  };

  return (
    <>
      <div className="branding-settings__panel-header">
        <h2>{displayText(chrome.document_logos_title)}</h2>
        {!editing && model.can_edit && (
          <Button size="small" icon={<EditOutlined />} onClick={() => setEditing(true)}>
            {displayText(chrome.edit_button)}
          </Button>
        )}
      </div>
      {editing ? (
        <div className="branding-settings__edit">
          <div className="branding-settings__stack">
            {DOCUMENT_LOGO_ITEMS.map((item) => (
              <DocumentLogoEditRow
                key={item.slot}
                vaultId={vaultId}
                item={item}
                asset={draftFiles[item.slot]
                  ? {
                      ...EMPTY_ASSET,
                      filename: draftFiles[item.slot]!.name,
                      content_type: draftFiles[item.slot]!.type,
                      size: draftFiles[item.slot]!.size,
                    }
                  : model.settings[item.slot]}
                draftFile={draftFiles[item.slot]}
                defaults={model.defaults}
                chrome={chrome}
                onChoose={chooseFile}
              />
            ))}
          </div>
          <div className="admin-settings-form__footer-actions">
            <Button size="small" type="link" onClick={cancelEdit}>
              {displayText(chrome.cancel_button)}
            </Button>
            <Button size="small" type="primary" icon={<SaveOutlined />} loading={saving} onClick={saveEdit}>
              {displayText(chrome.save_button)}
            </Button>
          </div>
        </div>
      ) : (
        <div className="branding-settings__stack">
          {DOCUMENT_LOGO_ITEMS.map((item) => (
            <BrandingReadView
              key={item.slot}
              vaultId={vaultId}
              config={item}
              asset={model.settings[item.slot]}
              defaults={model.defaults}
              chrome={chrome}
            />
          ))}
        </div>
      )}
    </>
  );
}

function DocumentLogoEditRow({
  vaultId,
  item,
  asset,
  draftFile,
  defaults,
  chrome,
  onChoose,
}: {
  vaultId: string;
  item: AssetConfig;
  asset: BrandingAsset;
  draftFile?: File;
  defaults: BrandingDefaults;
  chrome: BrandingPageChrome;
  onChoose: (slot: BrandingAssetSlot, file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!draftFile) {
      setPreviewUrl("");
      return;
    }
    const nextUrl = URL.createObjectURL(draftFile);
    setPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [draftFile]);

  const previewAsset = draftFile
    ? { ...asset, url: previewUrl, storage_key: previewUrl ? "preview" : "" }
    : asset;

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onChoose(item.slot, file);
  };

  return (
    <div className="branding-settings__document-row">
      <div className="admin-settings-form__label admin-settings-form__label--strong">{labelForItem(chrome, item)}</div>
      {(asset.storage_key || draftFile) && (
        <BrandingPreview
          vaultId={vaultId}
          asset={previewAsset}
          defaults={defaults}
          preview={item.preview}
        />
      )}
      {(asset.filename || draftFile) && (
        <div className="branding-settings__meta">
          <span>{draftFile?.name || asset.filename}</span>
          <span>{formatFileSize(draftFile?.size ?? asset.size)}</span>
        </div>
      )}
      <input
        ref={inputRef}
        className="branding-settings__file-input"
        type="file"
        accept="image/png,image/jpeg,image/gif,image/svg+xml"
        onChange={onFileChange}
      />
      <Button size="small" onClick={() => inputRef.current?.click()}>
        {displayText(chrome.choose_button)}
      </Button>
    </div>
  );
}

function BrandingPanel({
  vaultId,
  title,
  note,
  item,
  model,
  saving,
  onUpload,
  onUseDefault,
}: {
  vaultId: string;
  title: string;
  note: string;
  item: AssetConfig;
  model: BrandingSettingsModel;
  saving: boolean;
  onUpload: (slot: BrandingAssetSlot, file: File) => Promise<void>;
  onUseDefault: (slot: BrandingAssetSlot) => Promise<void>;
}) {
  const chrome = model.chrome;
  const asset = model.settings[item.slot];
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<"default" | "custom">(asset.storage_key ? "custom" : "default");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) {
      setMode(asset.storage_key ? "custom" : "default");
      setSelectedFile(null);
    }
  }, [asset.storage_key, editing]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl("");
      return;
    }
    const nextUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [selectedFile]);

  const defaultLabel = item.preview === "banner"
    ? displayText(chrome.default_email_banner_label)
    : displayText(chrome.default_logo_label);
  const customLabel = item.preview === "banner"
    ? displayText(chrome.custom_banner_label)
    : displayText(chrome.custom_logo_label);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setSelectedFile(file);
    setMode("custom");
  };

  const cancelEdit = () => {
    setEditing(false);
    setMode(asset.storage_key ? "custom" : "default");
    setSelectedFile(null);
  };

  const saveEdit = async () => {
    if (mode === "default") {
      await onUseDefault(item.slot);
      setEditing(false);
      setSelectedFile(null);
      return;
    }
    if (selectedFile) {
      await onUpload(item.slot, selectedFile);
      setEditing(false);
      setSelectedFile(null);
      return;
    }
    if (asset.storage_key) {
      setEditing(false);
      return;
    }
    message.error(displayText(chrome.choose_image_before_save));
  };

  const previewAsset = selectedFile
    ? {
        ...EMPTY_ASSET,
        filename: selectedFile.name,
        content_type: selectedFile.type,
        size: selectedFile.size,
        url: previewUrl,
        storage_key: previewUrl ? "preview" : "",
      }
    : asset;

  return (
    <RecordSectionBlock title={title}>
      <p className="admin-settings-form__note">{note}</p>
      <div className="branding-settings__panel-header">
        <h2>{title}</h2>
        {!editing && model.can_edit && (
          <Button size="small" icon={<EditOutlined />} onClick={() => setEditing(true)}>
            {displayText(chrome.edit_button)}
          </Button>
        )}
      </div>
      {editing ? (
        <div className="branding-settings__edit">
          <Radio.Group
            className="branding-settings__choice-group"
            value={mode}
            onChange={(event) => setMode(event.target.value)}
          >
            <div className="branding-settings__choice">
              <Radio value="default">{defaultLabel}</Radio>
              <BrandingPreview
                vaultId={vaultId}
                asset={EMPTY_ASSET}
                defaults={model.defaults}
                preview={item.preview}
              />
            </div>
            <div className="branding-settings__choice">
              <Radio value="custom">{customLabel}</Radio>
              {mode === "custom" && (
                <div className="branding-settings__custom">
                  {(asset.storage_key || selectedFile) && (
                    <>
                      <BrandingPreview
                        vaultId={vaultId}
                        asset={previewAsset}
                        defaults={model.defaults}
                        preview={item.preview}
                      />
                      <div className="branding-settings__meta">
                        <span>{selectedFile?.name || asset.filename}</span>
                        <span>{formatFileSize(selectedFile?.size ?? asset.size)}</span>
                      </div>
                    </>
                  )}
                  <input
                    ref={inputRef}
                    className="branding-settings__file-input"
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/svg+xml"
                    onChange={onFileChange}
                  />
                  <Button size="small" onClick={() => inputRef.current?.click()}>
                    {displayText(chrome.choose_button)}
                  </Button>
                </div>
              )}
            </div>
          </Radio.Group>
          <div className="admin-settings-form__footer-actions">
            <Button size="small" type="link" onClick={cancelEdit}>
              {displayText(chrome.cancel_button)}
            </Button>
            <Button size="small" type="primary" icon={<SaveOutlined />} loading={saving} onClick={saveEdit}>
              {displayText(chrome.save_button)}
            </Button>
          </div>
        </div>
      ) : (
        <BrandingReadView
          vaultId={vaultId}
          config={item}
          asset={asset}
          defaults={model.defaults}
          chrome={chrome}
        />
      )}
    </RecordSectionBlock>
  );
}

function BrandingReadView({
  vaultId,
  config,
  asset,
  defaults,
  chrome,
}: {
  vaultId: string;
  config: AssetConfig;
  asset: BrandingAsset;
  defaults: BrandingDefaults;
  chrome: BrandingPageChrome;
}) {
  const hasAsset = Boolean(asset.storage_key);
  const label = hasAsset
    ? (config.preview === "banner" ? displayText(chrome.custom_banner_label) : displayText(chrome.custom_logo_label))
    : (config.preview === "banner" ? displayText(chrome.default_email_banner_label) : displayText(chrome.default_logo_label));

  return (
    <div className="admin-settings-form__row admin-settings-form__row--start">
      <div className="admin-settings-form__label admin-settings-form__label--strong">{label}</div>
      <div className="admin-settings-form__control">
        <BrandingPreview vaultId={vaultId} asset={asset} defaults={defaults} preview={config.preview} />
        {hasAsset && (
          <div className="branding-settings__meta">
            <span>{asset.filename}</span>
            <span>{formatFileSize(asset.size)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
