// src/components/layouts/AppHeader.tsx
"use client";

import React, { memo, useCallback, useRef } from "react";
import { HeartHandshake } from "lucide-react"; // 상단 타이틀 아이콘만 유지
import { cn } from "@/lib/utils";

import WeatherCard from "../widgets/WeatherCard";
import { Separator } from "../ui/separator";
import DailyFortuneCard from "@/features/fortune/DailyFortuneCard";
import NotificationDropdown from "../widgets/Notification/NotificationDropdown";

import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import CoupleBalanceCard from "../widgets/Cards/CoupleBalanceCard";
import DaysTogetherBadge from "../DaysTogetherBadge";
import TodayQuestionInline from "../widgets/Cards/TodayQuestionCard";

import { NavItem } from "../widgets/NavIconButton";

// ------------------------------ 네비 정의/가드 ------------------------------
type SimpleNavDef = {
  id: "home" | "info" | "questions" | "bundle" | "scheduler";
  label: string;
  emoji: string; // ✅ 이모지
};

const SIMPLE_NAV: readonly SimpleNavDef[] = [
  { id: "home", label: "메인페이지", emoji: "🏠" },
  { id: "info", label: "감자링이란?", emoji: "ℹ️" },
  { id: "questions", label: "답변하기", emoji: "💬" },
  { id: "bundle", label: "답변꾸러미", emoji: "📦" },
  { id: "scheduler", label: "스케쥴러", emoji: "📅" },
] as const;

const GUARDS: Record<
  string,
  { requireLogin?: boolean; requireCouple?: boolean }
> = {
  home: {},
  info: {},
  questions: { requireLogin: true, requireCouple: true },
  bundle: { requireLogin: true, requireCouple: true },
  scheduler: { requireLogin: true, requireCouple: true },
};

const FALLBACK_ROUTE: Record<string, string> = {
  home: "/main",
  info: "/info",
  questions: "/questions",
  bundle: "/bundle",
  scheduler: "/scheduler",
};

// ------------------------------ 상단 클러스터 ------------------------------
const TitleCluster = memo(function TitleCluster({
  routeTitle,
}: {
  routeTitle: string;
}) {
  return (
    <div className="pl-2 flex flex-col md:grid md:grid-rows-[auto_auto]">
      <div className="flex items-center">
        <HeartHandshake className="h-7 w-7 mr-2 shrink-0 text-amber-600" />
        <h1 className="truncate text-2xl font-extrabold tracking-tight">
          {routeTitle}
        </h1>
      </div>
      <div className="min-h-[38px] flex items-center">
        <p className="text-[15px] font-medium text-neutral-700 truncate">
          우리를 잇는 따뜻한 고리,{" "}
          <span className="font-semibold text-amber-600">감자링</span>
        </p>
      </div>
    </div>
  );
});

const CenterCluster = memo(function CenterCluster() {
  return (
    <div className="relative self-center order-last md:order-none">
      <div className="flex items-center gap-3 md:justify-center overflow-x-auto overscroll-x-contain">
        <DaysTogetherBadge />
        <div className="md:hidden h-px w-3 shrink-0 border-b border-dashed border-slate-200/70" />
      </div>
    </div>
  );
});

const RightCluster = memo(function RightCluster() {
  return (
    <div className="flex items-center justify-end gap-2">
      <NotificationDropdown />
      <Separator
        orientation="vertical"
        className="h-6 my-auto hidden md:block"
      />
      <DailyFortuneCard />
      <Separator
        orientation="vertical"
        className="h-6 my-auto hidden md:block"
      />
      <WeatherCard />
      <CoupleBalanceCard showDelta dense />
    </div>
  );
});

// ------------------------------ 헤더 컴포넌트 ------------------------------
export default function AppHeader({
  routeTitle,
  className,
}: {
  routeTitle: string;
  className?: string;
}) {
  const { user } = useUser();
  const uid = user?.id ?? null;
  const coupled = !!user?.couple_id;

  const disabledByState = useCallback(
    (id: string) => {
      const g = GUARDS[id] || {};
      if (g.requireLogin && !uid) return true;
      if (g.requireCouple && !coupled) return true;
      return false;
    },
    [uid, coupled]
  );

  const go = useCallback(
    (id: string) => {
      const g = GUARDS[id] || {};
      if (g.requireLogin && !uid) {
        toast.warning("로그인이 필요해요.");
        return;
      }
      if (g.requireCouple && !coupled) {
        toast.warning("커플 연동이 필요해요.");
        return;
      }
      const url = FALLBACK_ROUTE[id] ?? `/${id}`;
      if (typeof window !== "undefined") window.location.assign(url);
    },
    [uid, coupled]
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-white/65 backdrop-blur-md supports-[backdrop-filter]:bg-white/55",
        "pt-[env(safe-area-inset-top)]",
        className
      )}
    >
      {/* 상단 헤더 */}
      <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-4">
        <div
          className={cn(
            "grid items-stretch gap-3 py-3",
            "grid-cols-1",
            "md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_minmax(220px,0.7fr)]"
          )}
        >
          <TitleCluster routeTitle={routeTitle} />
          <div className="hidden md:block" />
          <CenterCluster />
          <RightCluster />
        </div>
      </div>

      {/* ✅ 하단: 좌우 반반 레이아웃 (가로 스크롤 없음) */}
      <div className="border-t bg-white/65 backdrop-blur-md supports-[backdrop-filter]:bg-white/55">
        <div className="mx-auto w-full max-w-screen-2xl py-3 px-3 sm:px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
            {/* 좌측: 네비(랩핑 그리드, 가로 스크롤 없음) */}
            <nav aria-label="주 네비게이션" className="min-w-0">
              <div
                className={cn(
                  "grid gap-2",
                  // 화면 폭에 따라 자동 줄바꿈. 가로 스크롤 X
                  "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5"
                )}
              >
                {SIMPLE_NAV.map(({ id, label, emoji }) => (
                  <NavItem
                    key={id}
                    emoji={emoji}
                    label={label}
                    disabled={disabledByState(id)}
                    onClick={() => go(id)}
                    className="w-full"
                  />
                ))}
              </div>
            </nav>

            {/* 우측: TodayQuestion 카드 그대로 */}
            <div className="min-w-0">
              <TodayQuestionInline />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
