// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { VitePWA } from "vite-plugin-pwa";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,svg,webp,woff2}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /\/aquarium\/.*\.(png|jpg|jpeg)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "aquarium-assets",
              expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/(images|img)\/.*\.(png|jpg|jpeg|webp|svg)$/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "site-images",
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 14 },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === self.location.origin,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "app-shell" },
          },
        ],
      },
    }),
  ],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
