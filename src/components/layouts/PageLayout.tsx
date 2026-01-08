// src/components/layouts/PageLayout.tsx
import * as React from "react";
import { Outlet, useLocation } from "react-router-dom";
import "@/lib/fontawesome";

import AppHeader from "./AppHeader";
import QuickMenu from "../widgets/QuickMenu";
import HomeFabButton from "../widgets/HomeFabButton";

type PageLayoutProps = {
  title?: string;
  sessionHeaderKey?: string;
};

const THEME = {
  base: "bg-gradient-to-b from-[#FFF7ED] via-[#FFE7CC] to-[#FFD7B3]",
  text: "text-[#2B1F16]",
  blobs: [
    {
      className:
        "bg-[radial-gradient(44rem_44rem_at_10%_15%,rgba(255,214,170,0.36),transparent_60%)]",
    },
    {
      className:
        "bg-[radial-gradient(36rem_36rem_at_85%_80%,rgba(255,179,156,0.28),transparent_60%)]",
    },
    {
      className:
        "bg-[radial-gradient(48rem_48rem_at_50%_120%,rgba(255,240,220,0.30),transparent_60%)]",
    },
  ],
} as const;

export default function PageLayout({
  title = "감자링",
  sessionHeaderKey = "app:nextHeader",
}: PageLayoutProps) {
  const { pathname } = useLocation();

  const titleMap: Record<string, string> = {
    "/main": "감자링",
    "/info": "감자링이란?",
    "/settings": "마이페이지",
    "/notifications": "알림페이지",
    "/bundle": "답변꾸러미",
    "/scheduler": "커플 스케쥴러",
    "/questions": "오늘의 질문",
    "/aquarium": "아쿠아리움",
    "/kitchen": "조리실",
    "/potatoField": "농장",
    "/fishing": "바다낚시",
    "/oddEven": "홀짝게임",
    "/stickerBoard": "스티커보드",
    "/timeCapsule": "타임캡슐",
    "/exchange": "교환소",
    "/miniGame": "미니게임",
    "/gloomy": "음침한 방",
    "/bucketlist": "버킷리스트",
    "/recyclingStation": "분리수거장",
    "/flowershop": "꽃집",
  };

  const normalizedPath =
    pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  const [overrideTitle, setOverrideTitle] = React.useState<string | null>(null);
  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem(sessionHeaderKey);
      if (!raw) {
        setOverrideTitle(null);
        return;
      }
      const parsed = JSON.parse(raw) as {
        header?: string;
        url?: string;
        ts?: number;
      };
      if (parsed?.url) {
        const pathFromUrl = new URL(
          parsed.url,
          window.location.origin
        ).pathname.replace(/\/+$/, "");
        if (pathFromUrl === normalizedPath)
          setOverrideTitle(parsed.header ?? null);
        else setOverrideTitle(null);
      } else {
        setOverrideTitle(parsed?.header ?? null);
      }
      sessionStorage.removeItem(sessionHeaderKey);
    } catch {
      setOverrideTitle(null);
    }
  }, [normalizedPath, sessionHeaderKey]);

  const routeTitle = overrideTitle ?? titleMap[normalizedPath] ?? title;

  React.useEffect(() => {
    document.title = routeTitle;
  }, [routeTitle]);

  return (
    <div className={["min-h-[100svh]", THEME.base, THEME.text].join(" ")}>
      <AppHeader routeTitle={routeTitle} />

      {/* ✅ 여기서 max-width 제한 제거 → 진짜 풀폭 */}
      <div className="relative w-full overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-soft-light"
        >
          {THEME.blobs.map((b, i) => (
            <div
              key={i}
              className={`absolute inset-0 ${b.className} opacity-95`}
            />
          ))}
          <div className="absolute inset-0 bg-[radial-gradient(120rem_120rem_at_50%_120%,transparent,rgba(0,0,0,0.08))]" />
        </div>

        <QuickMenu />
        <HomeFabButton tone="daily" position="bottom-right" />

        {/* ✅ main도 max-width 제거 */}
        <main
          id="main"
          className="relative w-full px-3 sm:px-4 pb-8"
          style={{
            paddingTop: "calc(var(--app-header-height, 260px) + 1rem)",
          }}
          aria-label="Theme: beige-fixed"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
