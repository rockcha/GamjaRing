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

/** ✅ 고정 베이지톤 테마 (시간/쿼리 영향 X) */
const THEME = {
  base: "bg-gradient-to-b from-[#FFF7ED] via-[#FFE7CC] to-[#FFD7B3]", // almond → peach → apricot
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

  // ✅ 경로 → 타이틀 매핑
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

  // 경로 정규화(뒤 슬래시 제거)
  const normalizedPath =
    pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  // (선택) Sheet에서 전달해 둔 커스텀 헤더 읽기 (1회성)
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

  // <title> 동기화
  React.useEffect(() => {
    document.title = routeTitle;
  }, [routeTitle]);

  return (
    // ✅ 전체 배경은 최상단 div에서 처리 (헤더 포함)
    <div className={["min-h-[100svh]", THEME.base, THEME.text].join(" ")}>
      {/* ✅ fixed 헤더 */}
      <AppHeader routeTitle={routeTitle} />

      {/* ✅ 실제 콘텐츠 래퍼 (max-width / overflow는 여기서만) */}
      <div className="relative max-w-screen-2xl mx-auto overflow-hidden">
        {/* 메시 블롭 오버레이 (빛 번짐) */}
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
          {/* 가장자리 비네트 살짝 (가독 보정) */}
          <div className="absolute inset-0 bg-[radial-gradient(120rem_120rem_at_50%_120%,transparent,rgba(0,0,0,0.08))]" />
        </div>

        <QuickMenu />
        <HomeFabButton tone="daily" position="bottom-right" />

        {/* ✅ 헤더 바로 밑에서부터 콘텐츠 시작 (헤더 높이만큼만 padding-top) */}
        <main
          id="main"
          className="relative mx-auto w-full max-w-screen-2xl px-3 sm:px-4 pb-8"
          style={{
            // AppHeader에서 --app-header-height를 갱신해 줌
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
