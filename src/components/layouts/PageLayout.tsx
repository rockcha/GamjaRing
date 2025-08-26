// src/layouts/PageLayout.tsx
import * as React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import NavDock from "../NavDock";
import DaysTogetherBadge from "../DaysTogetherBadge";
import UserGreetingSection from "../UserGreetingSection";

type PageLayoutProps = {
  title?: string;
};

export default function PageLayout({ title = "감자 커플" }: PageLayoutProps) {
  const navigate = useNavigate();

  const go = (id: string) => {
    const map: Record<string, string> = {
      home: "/main",
      info: "/info",
      settings: "/settings",
      alerts: "/alerts",
      answers: "/answerdetailpage",
      bundle: "/bundle",
      scheduler: "/scheduler",
    };
    navigate(map[id] ?? `/${id}`);
  };

  return (
    <div className="min-h-[dvh] bg-gradient-to-b from-[#FAF5EB] via-[#EFE5D7] to-[#E6D5C3] text-[#3d2b1f]">
      <header>
        <div
          className={`
            w-full px-4 py-2
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
            {title}
          </h1>

          {/* md 이상에서는 중앙 칸 / 모바일에서는 아래 줄에 따로 렌더 */}
          <div className="hidden md:block justify-self-center">
            <DaysTogetherBadge />
          </div>

          {/* 오른쪽: 유저 섹션 */}
          <div className="min-w-0 justify-self-end">
            <UserGreetingSection />
          </div>

          {/* 모바일 전용: 배지를 두 번째 줄 정중앙에 */}
          <div className="col-span-2 mt-1 flex justify-center md:hidden">
            <DaysTogetherBadge />
          </div>
        </div>
      </header>

      <main
        id="main"
        className="mx-auto  w-full  max-w-screen-xl    px-4 py-6 pb-[calc(120px+env(safe-area-inset-bottom))]"
      >
        <Outlet />
      </main>

      <NavDock onNavigate={go} />
    </div>
  );
}
