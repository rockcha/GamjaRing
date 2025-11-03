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

type ThemeKey =
  | "deepNight" // 00–02
  | "dawn" // 03–05
  | "earlyMorning" // 06–08
  | "lateMorning" // 09–11
  | "noon" // 12–14
  | "afternoon" // 15–17
  | "sunset" // 18–20
  | "evening"; // 21–23

/** 팔레트 톤을 더 차분하게, 대비는 살짝 높이고, 텍스트 가독성 보정 */
const THEMES: Record<
  ThemeKey,
  {
    /** 기본 그라데이션 */
    base: string;
    /** 텍스트 톤 */
    text: string;
    /** 메시 블롭(라디얼) 오버레이들 */
    blobs: Array<{ className: string }>;
    desc: string;
  }
> = {
  deepNight: {
    base:
      // 딥 네이비 → 그린블루로 아주 미세하게
      "bg-gradient-to-b from-[#0a0f1f] via-[#0f1b2e] to-[#112235]",
    text: "text-[#EDE9E3]",
    blobs: [
      {
        className:
          "bg-[radial-gradient(60rem_60rem_at_-10%_-10%,rgba(64,176,255,0.12),transparent_60%)]",
      },
      {
        className:
          "bg-[radial-gradient(36rem_36rem_at_120%_120%,rgba(124,58,237,0.10),transparent_60%)]",
      },
    ],
    desc: "00–02",
  },
  dawn: {
    base: "bg-gradient-to-b from-[#1a2542] via-[#344c76] to-[#a7bfe8]",
    text: "text-[#F6F4F0]",
    blobs: [
      {
        className:
          "bg-[radial-gradient(46rem_46rem_at_10%_10%,rgba(255,214,94,0.18),transparent_55%)]",
      },
      {
        className:
          "bg-[radial-gradient(36rem_36rem_at_90%_80%,rgba(99,102,241,0.15),transparent_60%)]",
      },
    ],
    desc: "03–05",
  },
  earlyMorning: {
    base: "bg-gradient-to-b from-[#fef7ea] via-[#fde6c9] to-[#f7d4a6]",
    text: "text-[#2b1f16]",
    blobs: [
      {
        className:
          "bg-[radial-gradient(42rem_42rem_at_0%_100%,rgba(255,161,90,0.15),transparent_60%)]",
      },
      {
        className:
          "bg-[radial-gradient(36rem_36rem_at_100%_0%,rgba(255,241,118,0.18),transparent_55%)]",
      },
    ],
    desc: "06–08",
  },
  lateMorning: {
    base: "bg-gradient-to-b from-[#fff6e8] via-[#ffdcae] to-[#ffc488]",
    text: "text-[#2b1f16]",
    blobs: [
      {
        className:
          "bg-[radial-gradient(40rem_40rem_at_15%_15%,rgba(255,183,77,0.18),transparent_60%)]",
      },
      {
        className:
          "bg-[radial-gradient(36rem_36rem_at_85%_85%,rgba(255,111,97,0.12),transparent_60%)]",
      },
    ],
    desc: "09–11",
  },
  noon: {
    base: "bg-gradient-to-b from-[#e6f8ff] via-[#bfe8ff] to-[#90d8ff]",
    text: "text-[#102034]",
    blobs: [
      {
        className:
          "bg-[radial-gradient(44rem_44rem_at_10%_90%,rgba(56,189,248,0.18),transparent_55%)]",
      },
      {
        className:
          "bg-[radial-gradient(32rem_32rem_at_88%_12%,rgba(0,168,255,0.16),transparent_60%)]",
      },
    ],
    desc: "12–14",
  },
  afternoon: {
    base: "bg-gradient-to-b from-[#fff0e5] via-[#ffd2a6] to-[#ffa974]",
    text: "text-[#2b1f16]",
    blobs: [
      {
        className:
          "bg-[radial-gradient(48rem_48rem_at_0%_60%,rgba(255,138,76,0.18),transparent_60%)]",
      },
      {
        className:
          "bg-[radial-gradient(36rem_36rem_at_100%_40%,rgba(244,114,182,0.12),transparent_60%)]",
      },
    ],
    desc: "15–17",
  },
  sunset: {
    base: "bg-gradient-to-b from-[#ffd8c5] via-[#ff8fa1] to-[#7446a6]",
    text: "text-[#FEF9F6]",
    blobs: [
      {
        className:
          "bg-[radial-gradient(46rem_46rem_at_15%_85%,rgba(255,168,0,0.16),transparent_58%)]",
      },
      {
        className:
          "bg-[radial-gradient(40rem_40rem_at_85%_15%,rgba(168,85,247,0.18),transparent_60%)]",
      },
    ],
    desc: "18–20",
  },
  evening: {
    base: "bg-gradient-to-b from-[#2a204f] via-[#352a6b] to-[#43388a]",
    text: "text-[#ECE9F6]",
    blobs: [
      {
        className:
          "bg-[radial-gradient(42rem_42rem_at_10%_20%,rgba(99,102,241,0.18),transparent_60%)]",
      },
      {
        className:
          "bg-[radial-gradient(36rem_36rem_at_90%_80%,rgba(217,70,239,0.12),transparent_60%)]",
      },
    ],
    desc: "21–23",
  },
};

/** 24시간을 3시간 단위 8버킷으로 정확 매핑 */
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
  const safe = ((h % 24) + 24) % 24;
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

  const routeTitle = overrideTitle ?? titleMap[normalizedPath] ?? title;

  // <title> 동기화
  React.useEffect(() => {
    document.title = routeTitle;
  }, [routeTitle]);

  return (
    <div
      className={[
        "relative min-h-[100svh] max-w-screen-2xl mx-auto overflow-hidden",
        activeTheme.base, // ⬅️ 새 그라데이션
        activeTheme.text, // ⬅️ 시간대별 텍스트 톤
      ].join(" ")}
    >
      {/* 메시 블롭 오버레이 (빛 번짐) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-soft-light"
      >
        {activeTheme.blobs.map((b, i) => (
          <div
            key={i}
            className={`absolute inset-0 ${b.className} opacity-90`}
          />
        ))}
        {/* 가장자리 비네트 살짝 */}
        <div className="absolute inset-0 bg-[radial-gradient(120rem_120rem_at_50%_120%,transparent,rgba(0,0,0,0.12))]" />
      </div>

      {/* 고정 헤더 */}
      <AppHeader routeTitle={routeTitle} />

      <QuickMenu />
      <HomeFabButton tone="daily" position="bottom-right" />

      {/* 본문 */}
      <main
        id="main"
        className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-screen-2xl items-center justify-center px-2 mt-4"
        aria-label={`Theme: ${activeThemeKey}`}
      >
        <Outlet />
      </main>
    </div>
  );
}
