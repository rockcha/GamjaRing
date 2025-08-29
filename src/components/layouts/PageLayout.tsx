// src/layouts/PageLayout.tsx
import * as React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import DaysTogetherBadge from "../DaysTogetherBadge";
import UserGreetingSection from "../UserGreetingSection";
import FloatingHomeButton from "../widgets/FloatingHomeButton";

type PageLayoutProps = {
  /** 명시적으로 넘기면 이 값이 최우선. 없으면 현재 경로로 타이틀 계산 */
  title?: string;
  /** UserGreetingSection에서 저장하는 세션 키 (필요 시 커스터마이즈) */
  sessionHeaderKey?: string;
};

export default function PageLayout({
  title = "감자링",
  sessionHeaderKey = "app:nextHeader",
}: PageLayoutProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // 경로 → 타이틀 매핑
  const titleMap: Record<string, string> = {
    "/main": "감자링",
    "/info": "감자링이란?",
    "/settings": "마이페이지",
    "/notifications": "알림페이지",
    "/bundle": "답변꾸러미",
    "/scheduler": "커플 스케쥴러",
    "/questions": "오늘의 질문",
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
      // url이 들어온 경우 현재 경로와 일치할 때만 적용
      if (parsed?.url) {
        const pathFromUrl = new URL(
          parsed.url,
          window.location.origin
        ).pathname.replace(/\/+$/, "");
        if (pathFromUrl === normalizedPath) {
          setOverrideTitle(parsed.header ?? null);
        } else {
          setOverrideTitle(null);
        }
      } else {
        // url이 없다면 그냥 헤더만 사용
        setOverrideTitle(parsed?.header ?? null);
      }
      // 1회성으로 사용하고 제거
      sessionStorage.removeItem(sessionHeaderKey);
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

  // id → 라우트 매핑 (UserGreetingSection에 전달)
  const idToRoute: Record<string, string> = {
    home: "/main",
    info: "/info",
    settings: "/settings",
    notifications: "/notifications",
    questions: "/questions",
    bundle: "/bundle",
    scheduler: "/scheduler",
  };

  const handleNavigate = (id: string) => {
    navigate(idToRoute[id] ?? `/${id}`);
  };

  return (
    <div className="min-h-[100svh] bg-gradient-to-b from-[#FAF5EB] via-[#EFE5D7] to-[#E6D5C3] text-[#3d2b1f]">
      {/* 고정 헤더 */}
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto max-w-screen-xl px-4 py-2">
          {/* 상단 바: 좌-중-우 */}
          <div className="flex h-14 items-center gap-3 ">
            {/* 좌: 타이틀 */}

            <h1 className="min-w-0 flex-1 truncate pl-5 text-2xl font-extrabold tracking-tight">
              {routeTitle}
            </h1>

            {/* 중: md 이상에서만 표시 */}
            <div className="hidden md:block">
              <DaysTogetherBadge />
            </div>

            {/* 우: 유저 섹션 */}
            <div className="flex flex-1 justify-end">
              <UserGreetingSection
                onNavigate={handleNavigate}
                headerById={{
                  home: "감자링",
                  info: "감자링이란?",
                  settings: "마이페이지",
                  notifications: "알림페이지",
                  questions: "오늘의 질문",
                  bundle: "답변꾸러미",
                  scheduler: "커플 스케쥴러",
                }}
              />
            </div>
          </div>

          {/* 모바일 전용 배지 (헤더 아래 한 줄) */}
          <div className="block py-2 md:hidden">
            <div className="flex justify-center">
              <DaysTogetherBadge />
            </div>
          </div>
        </div>
      </header>

      {/* 본문 */}
      <main
        id="main"
        className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-screen-xl items-center justify-center px-2"
      >
        <FloatingHomeButton />
        <Outlet />
      </main>
    </div>
  );
}
