// src/layouts/PageLayout.tsx
import * as React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
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
  // 크리미 베이지 → 소프트 코랄로 부드럽게 떨어지는 그라데이션
  base: "bg-gradient-to-b from-[#FFF7ED] via-[#FFE7CC] to-[#FFD7B3]", // almond → peach → apricot
  // 텍스트는 따뜻한 다크브라운
  text: "text-[#2B1F16]",
  // 메시 블롭(라디얼) 오버레이: 밝은 크림 + 코랄 살짝
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
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // ✅ 경로 → 타이틀 매핑 (그대로 유지)
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
    <div
      className={[
        "relative min-h-[100svh] max-w-screen-2xl mx-auto overflow-hidden",
        THEME.base,
        THEME.text,
      ].join(" ")}
    >
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

      {/* 고정 헤더 */}
      <AppHeader routeTitle={routeTitle} />

      <QuickMenu />
      <HomeFabButton tone="daily" position="bottom-right" />

      {/* 본문 */}
      <main
        id="main"
        className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-screen-2xl items-center justify-center px-2 mt-4"
        aria-label="Theme: beige-fixed"
      >
        <Outlet />
      </main>
    </div>
  );
}
