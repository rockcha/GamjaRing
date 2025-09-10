// src/components/layouts/AppHeader.tsx
"use client";

import React, { memo, useCallback, useRef } from "react";
import {
  HeartHandshake,
  Home,
  Info,
  Settings,
  MessageSquareText,
  Package,
  CalendarClock,
  Fish,
  Waves,
  Sprout,
  ChefHat,
  Gamepad2,
  Joystick,
  Dices,
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

import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
} from "@/components/ui/navigation-menu";

/* ----------------------------------------------------------------
   1) 네비/가드/라우팅 — 상수
----------------------------------------------------------------- */
type NavItemDef = {
  id: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const BASIC: readonly NavItemDef[] = [
  { id: "home", label: "메인페이지", icon: Home },
  { id: "info", label: "감자링이란?", icon: Info },
  { id: "settings", label: "마이페이지", icon: Settings },
] as const;

const DAILY: readonly NavItemDef[] = [
  { id: "questions", label: "오늘의 질문", icon: MessageSquareText },
  { id: "bundle", label: "답변꾸러미", icon: Package },
  { id: "scheduler", label: "커플 스케쥴러", icon: CalendarClock },
] as const;

// 🧺 생활공방(땅/요리)
const LAND_WORKSHOP: readonly NavItemDef[] = [
  { id: "potatoField", label: "농장", icon: Sprout },
  { id: "kitchen", label: "조리실", icon: ChefHat },
] as const;

// ⚓ 바다공방(물/낚시)
const SEA_WORKSHOP: readonly NavItemDef[] = [
  { id: "aquarium", label: "아쿠아리움", icon: Fish },
  { id: "fishing", label: "바다낚시", icon: Waves },
] as const;

// 🎮 미니게임
const MINI_GAMES: readonly NavItemDef[] = [
  { id: "oddEven", label: "홀짝", icon: Dices },
  { id: "game2", label: "미니게임 2", icon: Joystick },
] as const;

const GUARDS: Record<
  string,
  { requireLogin?: boolean; requireCouple?: boolean }
> = {
  home: {},
  info: {},
  settings: { requireLogin: true },

  questions: { requireLogin: true, requireCouple: true },
  bundle: { requireLogin: true, requireCouple: true },
  scheduler: { requireLogin: true, requireCouple: true },

  aquarium: { requireLogin: true, requireCouple: true },
  fishing: { requireLogin: true, requireCouple: true },
  potatoField: { requireLogin: true, requireCouple: true },
  kitchen: { requireLogin: true, requireCouple: true },
  shop: { requireLogin: true, requireCouple: true },

  // 게임: 제한 없음(원하면 나중에 가드 추가)
  oddEven: { requireLogin: true, requireCouple: true },
  game2: { requireLogin: true, requireCouple: true },
};

const FALLBACK_ROUTE: Record<string, string> = {
  home: "/main",
  info: "/info",
  settings: "/settings",
  questions: "/questions",
  bundle: "/bundle",
  scheduler: "/scheduler",
  aquarium: "/aquarium",
  fishing: "/fishing",
  potatoField: "/potatoField",
  kitchen: "/kitchen",

  // 게임 라우트
  oddEven: "/oddEven",
  game2: "/game2",
};

/* ----------------------------------------------------------------
   2) 상단 클러스터들 (memo)
----------------------------------------------------------------- */
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

/* ----------------------------------------------------------------
   2-1) 드롭다운용 “가로형” NavItem (아이콘+텍스트 한 줄 고정)
----------------------------------------------------------------- */
function InlineNavItem({
  icon: Icon,
  label,
  disabled,
  onClick,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-disabled={disabled}
      className={cn(
        "w-full min-w-0 inline-flex items-center gap-2 rounded-md px-2.5 py-2 text-sm",
        "bg-white/0 hover:bg-amber-200 transition-colors",
        "data-[disabled=true]:opacity-50 data-[disabled=true]:pointer-events-none"
      )}
      data-disabled={disabled ? "true" : "false"}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="block truncate whitespace-nowrap">{label}</span>
    </button>
  );
}

/* ----------------------------------------------------------------
   3) AppHeader
----------------------------------------------------------------- */
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

  // 호버로 열리도록: 트리거 ref에 hover 시 click() 호출
  const triggerRefs = useRef<
    Record<
      "basic" | "daily" | "land" | "sea" | "games",
      HTMLButtonElement | null
    >
  >({
    basic: null,
    daily: null,
    land: null,
    sea: null,
    games: null,
  });

  const renderGroup = (
    key: "basic" | "daily" | "land" | "sea" | "games",
    title: string,
    items: readonly NavItemDef[]
  ) => {
    return (
      <NavigationMenuItem key={key} className="relative">
        <NavigationMenuTrigger
          ref={(el) => {
            triggerRefs.current[key] = el;
          }}
          onMouseEnter={() => triggerRefs.current[key]?.click()}
          className="rounded-lg bg-white/70 hover:bg-amber-50 data-[state=open]:bg-amber-50"
        >
          {title}
        </NavigationMenuTrigger>

        {/* ✅ viewport=false 상태에서 각 트리거 바로 아래 고정 */}
        <NavigationMenuContent className="p-2 md:absolute md:left-0 md:top-[calc(100%+6px)]">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 min-w-[250px] sm:min-w-[420px] border rounded-lg bg-white p-2">
            {items.map((it) => {
              const Disabled = disabledByState(it.id);
              const Icon = it.icon;
              return (
                <div key={it.id} className="min-w-0">
                  <InlineNavItem
                    icon={Icon}
                    label={it.label}
                    disabled={Disabled}
                    onClick={() => !Disabled && go(it.id)}
                  />
                </div>
              );
            })}
          </div>
        </NavigationMenuContent>
      </NavigationMenuItem>
    );
  };

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

      {/* 하단 네비 (NavigationMenu) */}
      <div className="border-t bg-white/65 backdrop-blur-md supports-[backdrop-filter]:bg-white/55">
        <div className="mx-auto w-full max-w-screen-2xl py-3 px-3 sm:px-4">
          <div className="flex items-center gap-4">
            {/* ✅ Viewport 끄기: 각 그룹 컨텐츠는 트리거 기준으로 절대 위치 */}
            <NavigationMenu viewport={false}>
              <NavigationMenuList className="gap-2 justify-start">
                {renderGroup("basic", "🏠 기본", BASIC)}
                {renderGroup("daily", "📖 우리의 일상", DAILY)}
                {renderGroup("land", "🌱 생활공방", LAND_WORKSHOP)}
                {renderGroup("sea", "⚓ 바다공방", SEA_WORKSHOP)}
                {renderGroup("games", "🎮 미니게임", MINI_GAMES)}
              </NavigationMenuList>
            </NavigationMenu>

            {/* 기존 인라인 카드 그대로 유지 */}
            <TodayQuestionInline />
          </div>
        </div>
      </div>
    </header>
  );
}
