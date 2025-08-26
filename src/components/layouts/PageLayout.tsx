// src/layouts/PageLayout.tsx
import * as React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import NavDock from "../NavDock";
import DaysTogetherBadge from "../DaysTogetherBadge";
import UserGreetingSection from "../UserGreetingSection";
import { Separator } from "../ui/separator";

type PageLayoutProps = {
  /** 명시적으로 넘기면 이 값이 최우선. 없으면 현재 경로로 타이틀 계산 */
  title?: string;
};

export default function PageLayout({ title = "감자링" }: PageLayoutProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // 경로 → 타이틀 매핑 (필요시 계속 추가)
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

  // 경로 기반 타이틀이 있으면 우선 사용, 없으면 prop title 사용
  const routeTitle = titleMap[normalizedPath] ?? title;

  // <title> 동기화
  React.useEffect(() => {
    document.title = routeTitle;
  }, [routeTitle]);

  // NavDock id → 라우트 매핑 (NavDock과 1:1로 맞춤)
  const go = (id: string) => {
    const map: Record<string, string> = {
      home: "/main",
      info: "/info",
      settings: "/settings",
      notifications: "/notifications", // ✅ 오타 수정
      questions: "/questions", // ✅ NavDock과 일치
      bundle: "/bundle",
      scheduler: "/scheduler",
    };
    navigate(map[id] ?? `/${id}`);
  };

  return (
    <div className="min-h-[dvh] bg-gradient-to-b from-[#FAF5EB] via-[#EFE5D7] to-[#E6D5C3] text-[#3d2b1f]">
      <header className="  border-b bg-white/90 ">
        <div
          className={`
            w-full px-4 py-6
            grid items-center
            /* 모바일: 좌/우 2칸 + 아래 배지 1칸 */
            grid-cols-[1fr_auto] gap-x-3
            /* 데스크탑: 좌-중앙-우 3칸 */
            md:grid-cols-[1fr_auto_1fr]
             mx-auto max-w-screen-xl pt-3 
          `}
        >
          {/* 왼쪽: 타이틀 */}
          <h1 className="min-w-0 truncate font-extrabold tracking-tight text-xl pl-4 justify-self-start">
            {routeTitle}
          </h1>

          {/* md 이상 중앙 */}
          <div className="hidden md:block justify-self-center">
            <DaysTogetherBadge />
          </div>

          {/* 오른쪽: 유저 섹션 */}
          <div className="min-w-0 justify-self-end">
            <UserGreetingSection />
          </div>

          {/* 모바일 전용: 중앙 배지 */}
          <div className="col-span-2 mt-1 flex justify-center md:hidden">
            <DaysTogetherBadge />
          </div>
        </div>
      </header>
      <main
        id="main"
        className="mx-auto w-full max-w-screen-xl px-4 py-6 pb-[calc(120px+env(safe-area-inset-bottom))] "
      >
        <Outlet />
      </main>
      <NavDock onNavigate={go} />
    </div>
  );
}
