// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { VitePWA } from "vite-plugin-pwa";

// ✅ __dirname은 직접 선언해야 함
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // SW 자동 등록 + 새 버전 발견 시 백그라운드 업데이트
      registerType: "autoUpdate",

      // 이미 /public/manifest.webmanifest를 쓰는 경우 ↓
      manifest: false,

      // 워크박스 기본 캐싱 전략 (필요 최소치)
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
        navigateFallback: "/index.html", // SPA 라우팅 깨짐 방지
        runtimeCaching: [
          // 동일 오리진 정적/페이지: 빠른 표시 + 백그라운드 갱신
          {
            urlPattern: ({ url }) => url.origin === self.location.origin,
            handler: "StaleWhileRevalidate",
          },
          // 외부 폰트/이미지/CDN 등: 빠른 표시 + 백그라운드 갱신
          {
            urlPattern: /^https:\/\/(fonts|images|cdn)\./,
            handler: "StaleWhileRevalidate",
          },
        ],
      },
      // iOS에서 주소창 숨김 등 일부 표시 최적화가 필요한 경우:
      // devOptions: { enabled: true } // (로컬 테스트 때만)
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
