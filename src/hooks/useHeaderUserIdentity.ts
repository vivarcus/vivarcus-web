import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { resolveHeaderUserIdentity } from "../lib/headerUserIdentity";

export function useHeaderUserIdentity(vaultId: string | undefined, sessionUsername?: string) {
  const [profileName, setProfileName] = useState<string | undefined>();
  const [profileEmail, setProfileEmail] = useState<string | undefined>();
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .meIdentity()
      .then((model) => {
        if (cancelled) return;
        setProfileName(model.display_name);
        setProfileEmail(model.email);
      })
      .catch(() => {
        if (cancelled) return;
        setProfileName(undefined);
        setProfileEmail(undefined);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!vaultId) {
      setAvatarUrl(undefined);
      return () => {
        cancelled = true;
      };
    }

    api
      .meAvatar(vaultId)
      .then((model) => {
        if (cancelled) return;
        setAvatarUrl(model.avatar_url);
      })
      .catch(() => {
        if (cancelled) return;
        setAvatarUrl(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [vaultId]);

  const identity = useMemo(
    () =>
      resolveHeaderUserIdentity({
        profileName,
        profileEmail,
        sessionUsername,
      }),
    [profileEmail, profileName, sessionUsername],
  );

  return { ...identity, avatarUrl, loading };
}
