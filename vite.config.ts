// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    server: {
      proxy: {
        "/api": { target: "http://localhost:8000", changeOrigin: true },
        "/auth": { target: "http://localhost:8000", changeOrigin: true },
        "/media": { target: "http://localhost:8000", changeOrigin: true },
      },
    },
    optimizeDeps: {
      // Force Vite to always re-bundle these on startup — prevents stale cache errors
      include: [
        "use-sync-external-store/shim/with-selector",
        "@tanstack/react-query",
        "@tanstack/react-router",
        "react",
        "react-dom",
      ],
    },
  },
});
