import { Button, Result } from "antd";
import { useEffect, useState } from "react";
import { useRouteError } from "react-router-dom";
import { isChunkLoadError, tryReloadForStaleChunk } from "../lib/chunkLoadRecovery";

export function RouteChunkLoadRecovery() {
  const error = useRouteError();
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    if (tryReloadForStaleChunk(error)) {
      setReloading(true);
    }
  }, [error]);

  if (reloading) {
    return (
      <Result
        status="info"
        title="页面已更新"
        subTitle="正在刷新以加载最新版本…"
      />
    );
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "未知错误";

  return (
    <Result
      status="error"
      title={isChunkLoadError(error) ? "页面资源加载失败" : "页面加载失败"}
      subTitle={message}
      extra={
        <Button type="primary" onClick={() => window.location.reload()}>
          刷新页面
        </Button>
      }
    />
  );
}
