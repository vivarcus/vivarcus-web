/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }
          if (
            id.includes("/react-dom/") ||
            id.includes("/react-router") ||
            id.includes("/react/")
          ) {
            return "react-vendor";
          }
          if (id.includes("/antd/") || id.includes("/@ant-design/") || id.includes("/rc-")) {
            return "antd-vendor";
          }
          if (id.includes("/dayjs/")) {
            return "dayjs";
          }
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["acceptance/**", "node_modules/**"],
    // ECS Spot (4c8g) batches the full suite; the 5s Vitest default flakes under load.
    testTimeout: 20_000,
    hookTimeout: 20_000,
    ...(process.env.CI ? { maxWorkers: 2 } : {}),
  },
  server: {
    port: 5173,
    proxy: {
      "/ui": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/internal": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/healthz": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/readyz": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
