import { useEffect, useState } from "react";
import { api } from "../api/client";

export function AppHeaderLogo({ vaultId }: { vaultId?: string }) {
  const [logoSrc, setLogoSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!vaultId) {
      setLogoSrc(null);
      return;
    }
    let active = true;
    let objectUrl = "";
    void api
      .getSiteHeaderLogo(vaultId)
      .then(async (model) => {
        const asset = model.site_header_logo;
        if (!asset.storage_key || !asset.url) {
          return;
        }
        const cacheKey = asset.updated_at || asset.storage_key;
        const assetPath = cacheKey
          ? `${asset.url}${asset.url.includes("?") ? "&" : "?"}v=${encodeURIComponent(cacheKey)}`
          : asset.url;
        const blob = await api.fetchBrandingAssetBlob(vaultId, assetPath);
        if (!active) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setLogoSrc(objectUrl);
      })
      .catch(() => {
        if (active) {
          setLogoSrc(null);
        }
      });
    return () => {
      active = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [vaultId]);

  if (logoSrc) {
    return <img className="app-header__logo-image" src={logoSrc} alt="Vault logo" />;
  }

  return (
    <span className="app-header__logo">
      <span className="app-header__logo-dark">Vivar</span>
      <span className="app-header__logo-accent">cus</span>
    </span>
  );
}
