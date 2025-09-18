// src/components/layouts/AppHeader.tsx
"use client";

import React, { memo } from "react";
import {
  HeartHandshake,
  Home,
  Info,
  MessageCircleQuestionMark,
  MessagesSquare,
  CalendarDays,
  Tractor,
  CookingPot,
  Waves,
  Fish,
  Dice3,
  Gamepad2,
  Sticker,
  Hourglass, // ✅ 타임캡슐 아이콘 추가
  type LucideIcon,
} from "lucide-react";
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
import AvatarWidget from "../widgets/AvatarWidget";

// ------------------------------ 네비 정의/가드 ------------------------------
type SimpleNavDef = {
  id:
    | "home"
    | "info"
    | "questions"
    | "bundle"
    | "scheduler"
    | "timeCapsule" // ✅ 추가
    | "farm"
    | "kitchen"
    | "aquarium"
    | "fishing"
    | "stickerBoard"
    | "oddEven"
    | "miniGame";
  label: string;
  icon: LucideIcon;
};

const NAV_GROUPS: readonly (readonly SimpleNavDef[])[] = [
  // 2개
  [
    { id: "home", label: "메인페이지", icon: Home },
    { id: "info", label: "감자링이란?", icon: Info },
  ],
  // 3개 → 4개 (타임캡슐 추가)
  [
    { id: "questions", label: "답변하기", icon: MessageCircleQuestionMark },
    { id: "bundle", label: "답변꾸러미", icon: MessagesSquare },
    { id: "scheduler", label: "스케쥴러", icon: CalendarDays },
    { id: "timeCapsule", label: "타임캡슐", icon: Hourglass }, // ✅ 스케줄러 오른쪽
  ],
  // 2개
  [
    { id: "farm", label: "농장", icon: Tractor },
    { id: "kitchen", label: "조리실", icon: CookingPot },
  ],
  // 2개
  [
    { id: "aquarium", label: "아쿠아리움", icon: Fish },
    { id: "fishing", label: "낚시터", icon: Waves },
  ],
  // ✅ 미니게임 섹션
  [
    { id: "stickerBoard", label: "스티커보드", icon: Sticker },
    { id: "oddEven", label: "홀짝게임", icon: Dice3 },
    { id: "miniGame", label: "미니게임", icon: Gamepad2 },
  ],
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
  timeCapsule: { requireLogin: true, requireCouple: true }, // ✅ 가드

  farm: { requireLogin: true, requireCouple: true },
  kitchen: { requireLogin: true, requireCouple: true },
  aquarium: { requireLogin: true, requireCouple: true },
  fishing: { requireLogin: true, requireCouple: true },

  stickerBoard: { requireLogin: true, requireCouple: true },
  oddEven: { requireLogin: true, requireCouple: true },
  miniGame: { requireLogin: true, requireCouple: true },
};

const FALLBACK_ROUTE: Record<string, string> = {
  home: "/main",
  info: "/info",
  questions: "/questions",
  bundle: "/bundle",
  scheduler: "/scheduler",
  timeCapsule: "/timeCapsule", // ✅ 라우팅 추가

  farm: "/potatoField",
  kitchen: "/kitchen",
  aquarium: "/aquarium",
  fishing: "/fishing",

  stickerBoard: "/stickerBoard",
  oddEven: "/oddEven",
  miniGame: "/miniGame",
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
          우리의 기록이 자라나는 공간,{" "}
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
      {/* <WeatherCard /> */}
      <NotificationDropdown />
      <CoupleBalanceCard showDelta dense />
      <AvatarWidget />
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

  const disabledByState = React.useCallback(
    (id: string) => {
      const g = GUARDS[id] || {};
      if (g.requireLogin && !uid) return true;
      if (g.requireCouple && !coupled) return true;
      return false;
    },
    [uid, coupled]
  );

  const go = React.useCallback(
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
            "grid items-stretch gap-3 py-2",
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

      {/* ✅ 하단: 좌우 반반 레이아웃 */}
      <div className="border-t bg-white/65 backdrop-blur-md supports-[backdrop-filter]:bg-white/55">
        <div className="mx-auto w-full max-w-screen-2xl py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 px-1 items-start">
            {/* 좌측: 네비 (아이콘 크기만큼 자동 줄바꿈) */}
            <nav aria-label="주 네비게이션" className="min-w-0">
              <div
                className={cn(
                  "grid grid-flow-col auto-cols-max",
                  "gap-x-2 gap-y-1 justify-start content-start"
                )}
              >
                {NAV_GROUPS.map((group, gi) => (
                  <React.Fragment key={gi}>
                    {group.map(({ id, label, icon }) => (
                      <div key={id}>
                        <NavItem
                          icon={icon}
                          label={label}
                          disabled={disabledByState(id)}
                          onClick={() => go(id)}
                        />
                      </div>
                    ))}
                    {gi < NAV_GROUPS.length - 1 && (
                      <Separator
                        orientation="vertical"
                        decorative
                        aria-hidden
                        className="h-8 w-px shrink-0 self-center bg-slate-200"
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </nav>

            {/* 우측: TodayQuestion 카드 */}
            <div className="min-w-0">
              <TodayQuestionInline />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
