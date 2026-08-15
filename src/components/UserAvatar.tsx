import { useEffect, useState, type ReactNode } from "react";
import { api } from "../api/client";
import "../styles/components/user-avatar.css";

type Props = {
  vaultId?: string;
  imageUrl?: string;
  alt?: string;
  className?: string;
  fallback?: ReactNode;
};

export function UserAvatar({
  vaultId,
  imageUrl,
  alt = "",
  className,
  fallback,
}: Props) {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const remotePath = imageUrl?.trim() || "";

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      if (!remotePath || !vaultId) {
        setLoadedUrl(null);
        return;
      }
      try {
        const blob = await api.fetchMediaBlob(vaultId, remotePath);
        if (cancelled) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setLoadedUrl(objectUrl);
      } catch {
        if (!cancelled) {
          setLoadedUrl(null);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [remotePath, vaultId]);

  const rootClass = [className, loadedUrl ? "user-avatar--has-image" : null].filter(Boolean).join(" ");

  return (
    <span className={rootClass} aria-hidden={alt ? undefined : true}>
      {loadedUrl ? <img className="user-avatar__img" src={loadedUrl} alt={alt} /> : fallback}
    </span>
  );
}
