// src/layouts/PageLayout.tsx
import * as React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import "@/lib/fontawesome";

import AppHeader from "./AppHeader";
import FloatingLeftRail from "../widgets/FloatingLeftRail";
import QuickMenu from "../widgets/QuickMenu";
import FloatingHomeButton from "../widgets/Cards/FloatingHomeButton";
import HomeFabButton from "../widgets/HomeFabButton";

type PageLayoutProps = {
  /** 명시적으로 넘기면 이 값이 최우선. 없으면 현재 경로로 타이틀 계산 */
  title?: string;
  /** UserGreetingSection에서 저장하는 세션 키 (필요 시 커스터마이즈) */
  sessionHeaderKey?: string;
};

type ThemeKey =
  | "deepNight" // 00–02
  | "dawn" // 03–05
  | "earlyMorning" // 06–08
  | "lateMorning" // 09–11
  | "noon" // 12–14
  | "afternoon" // 15–17
  | "sunset" // 18–20
  | "evening"; // 21–23

const THEMES: Record<ThemeKey, { bg: string; text: string; desc: string }> = {
  deepNight: {
    bg: "bg-gradient-to-b from-[#0b1020] via-[#121e2b] to-[#1a2a3a]",
    text: "text-[#EDE9E3]",
    desc: "00–02",
  },
  dawn: {
    bg: "bg-gradient-to-b from-[#1b2845] via-[#3a4e72] to-[#b1c4e7]",
    text: "text-[#F5F3EF]",
    desc: "03–05",
  },
  earlyMorning: {
    bg: "bg-gradient-to-b from-[#FDF6E3] via-[#FCE9C9] to-[#F8D9A6]",
    text: "text-[#3d2b1f]",
    desc: "06–08",
  },
  lateMorning: {
    bg: "bg-gradient-to-b from-[#FFF7E6] via-[#FFE7BA] to-[#FFD591]",
    text: "text-[#3d2b1f]",
    desc: "09–11",
  },
  noon: {
    bg: "bg-gradient-to-b from-[#E0F7FF] via-[#B8E6FF] to-[#8FD6FF]",
    text: "text-[#203045]",
    desc: "12–14",
  },
  afternoon: {
    bg: "bg-gradient-to-b from-[#FFF1E6] via-[#FFD8B1] to-[#FFB784]",
    text: "text-[#3d2b1f]",
    desc: "15–17",
  },
  sunset: {
    bg: "bg-gradient-to-b from-[#FFDAC1] via-[#FF9A8B] to-[#8351A3]",
    text: "text-[#FEF9F6]",
    desc: "18–20",
  },
  evening: {
    bg: "bg-gradient-to-b from-[#2E2252] via-[#3B2C6E] to-[#4A3A8C]",
    text: "text-[#EDE9F6]",
    desc: "21–23",
  },
};

/** 24시간을 3시간 단위 8버킷으로 정확 매핑 (빈 시간대 없음) */
const BUCKETS: ThemeKey[] = [
  "deepNight", // 00-02
  "dawn", // 03-05
  "earlyMorning", // 06-08
  "lateMorning", // 09-11
  "noon", // 12-14
  "afternoon", // 15-17
  "sunset", // 18-20
  "evening", // 21-23
];

function themeByHour(h: number): ThemeKey {
  const safe = ((h % 24) + 24) % 24; // 안전 가드
  return BUCKETS[Math.floor(safe / 3)];
}

export default function PageLayout({
  title = "감자링",
  sessionHeaderKey = "app:nextHeader",
}: PageLayoutProps) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  // --- 시간대별 테마 상태 ---
  const [hour, setHour] = React.useState<number>(() => new Date().getHours());

  // 1분마다 갱신
  React.useEffect(() => {
    const id = setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => clearInterval(id);
  }, []);

  // 쿼리로 강제 미리보기 (?theme=sunset 등)
  const forcedTheme = React.useMemo<ThemeKey | null>(() => {
    const params = new URLSearchParams(search);
    const t = params.get("theme") as ThemeKey | null;
    return t && THEMES[t] ? t : null;
  }, [search]);

  const activeThemeKey = forcedTheme ?? themeByHour(hour);
  const activeTheme = THEMES[activeThemeKey];

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

  // (선택) Sheet에서 전달해 둔 커스텀 헤더 읽기
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
      sessionStorage.removeItem(sessionHeaderKey); // 1회성
    } catch {
      setOverrideTitle(null);
    }
  }, [normalizedPath, sessionHeaderKey]);

  // 경로 기반 타이틀이 있으면 우선 사용, 없으면 prop title 사용
  const routeTitle = overrideTitle ?? titleMap[normalizedPath] ?? title;

  // <title> 동기화
  React.useEffect(() => {
    document.title = routeTitle;
  }, [routeTitle]);

  return (
    <div
      className={[
        "min-h-[100svh] max-w-screen-2xl mx-auto",
        activeTheme.bg, // ⬅️ 시간대별 그라데이션
        activeTheme.text, // ⬅️ 시간대별 텍스트 톤
      ].join(" ")}
    >
      {/* 고정 헤더 */}
      <AppHeader routeTitle={routeTitle} />

      <QuickMenu />

      <HomeFabButton tone="daily" position="bottom-right" />

      {/* 본문 */}
      <main
        id="main"
        className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-screen-2xl items-center justify-center px-2"
        aria-label={`Theme: ${activeThemeKey}`}
      >
        <Outlet />
      </main>
    </div>
  );
}
