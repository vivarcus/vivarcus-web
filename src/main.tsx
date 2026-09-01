import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { installVivarcusAutomation } from "./lib/automation/installVivarcusAutomation";
import { installChunkLoadRecovery } from "./lib/chunkLoadRecovery";
import "./lib/dayjsSetup";
import { AntdProvider } from "./theme/antdProvider";
import "./styles/global.css";

installChunkLoadRecovery();

if (import.meta.env.DEV) {
  installVivarcusAutomation();
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AntdProvider>
      <App />
    </AntdProvider>
  </StrictMode>,
);
