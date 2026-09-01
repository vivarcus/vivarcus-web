import { Button, Result } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useRouteError } from "react-router-dom";
import { loadLoginLang } from "../auth/rememberedUser";
import { isChunkLoadError, tryReloadForStaleChunk } from "../lib/chunkLoadRecovery";
import { chunkLoadLabels } from "../lib/i18n/preAuthLabels";

export function RouteChunkLoadRecovery() {
  const error = useRouteError();
  const [reloading, setReloading] = useState(false);
  const labels = useMemo(() => chunkLoadLabels(loadLoginLang()), []);

  useEffect(() => {
    if (tryReloadForStaleChunk(error)) {
      setReloading(true);
    }
  }, [error]);

  if (reloading) {
    return (
      <Result
        status="info"
        title={labels.page_updated}
        subTitle={labels.reloading}
      />
    );
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : labels.unknown_error;

  return (
    <Result
      status="error"
      title={isChunkLoadError(error) ? labels.chunk_failed : labels.page_failed}
      subTitle={message}
      extra={
        <Button type="primary" onClick={() => window.location.reload()}>
          {labels.reload}
        </Button>
      }
    />
  );
}
