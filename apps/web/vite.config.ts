import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_PROXY ?? "http://localhost:8080";
  const wsTarget = env.VITE_WS_PROXY ?? "ws://localhost:8085";

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.svg", "logo.svg", "logo-wordmark.svg"],
        manifest: {
          name: "Folio · Editor de Documentos",
          short_name: "Folio",
          description:
            "Editor colaborativo offline-first. Hecho en Colombia, listo para el mundo.",
          theme_color: "#0F172A",
          background_color: "#FAFAF7",
          display: "standalone",
          lang: "es-CO",
          start_url: "/",
          icons: [
            { src: "/logo.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
          ],
        },
        workbox: {
          navigateFallback: "/index.html",
          globPatterns: ["**/*.{js,css,html,svg,woff2}"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts",
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 3000,
      host: true,
      proxy: {
        "/api": { target: apiTarget, changeOrigin: true },
        "/ws": { target: wsTarget, ws: true },
      },
    },
    preview: { port: 3000, host: true },
    build: {
      target: "es2022",
      sourcemap: mode !== "production",
      cssCodeSplit: true,
      reportCompressedSize: false,
      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            "editor-vendor": [
              "@tiptap/react",
              "@tiptap/starter-kit",
              "@tiptap/extension-collaboration",
              "@tiptap/extension-collaboration-cursor",
            ],
            "yjs-vendor": ["yjs", "y-websocket"],
            "query-vendor": ["@tanstack/react-query"],
          },
        },
      },
    },
  };
});
