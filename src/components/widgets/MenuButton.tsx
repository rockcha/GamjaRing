// src/components/MenuButton.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Home,
  Info,
  Settings,
  MessageSquareText,
  Package,
  CalendarClock,
  ArrowLeftCircle,
  ChefHat, // 부엌
  Fish, // 아쿠아리움
  Sprout, // 🌱 감자밭
  Waves, // 🌊 바다낚시
} from "lucide-react";
import { useUser } from "@/contexts/UserContext";

import { cn } from "@/lib/utils";
import LoginButton from "@/components/LoginButton";
import LogoutButton from "@/components/LogoutButton";
import AvatarWidget from "@/components/widgets/AvatarWidget";
import * as React from "react";

type Item = {
  id: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

// 그룹별 아이템
const BASIC_ITEMS: Item[] = [
  { id: "info", label: "감자링이란?", icon: Info },
  { id: "settings", label: "마이페이지", icon: Settings },
];

const DAILY_ITEMS: Item[] = [
  { id: "questions", label: "오늘의 질문", icon: MessageSquareText },
  { id: "bundle", label: "답변꾸러미", icon: Package },
  { id: "scheduler", label: "커플 스케쥴러", icon: CalendarClock },
];

const WORLD_ITEMS: Item[] = [
  { id: "aquarium", label: "아쿠아리움", icon: Fish },
  { id: "fishing", label: "바다낚시", icon: Waves },
  { id: "potatoField", label: "농장", icon: Sprout },
  { id: "kitchen", label: "조리실", icon: ChefHat },
];

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
  kitchen: { requireLogin: true, requireCouple: true },
  potatoField: { requireLogin: true, requireCouple: true },
  fishing: { requireLogin: true, requireCouple: true },
};

const FALLBACK_ROUTE: Record<string, string> = {
  home: "/main",
  info: "/info",
  settings: "/settings",
  notifications: "/notifications",
  questions: "/questions",
  bundle: "/bundle",
  scheduler: "/scheduler",
  aquarium: "/aquarium",
  kitchen: "/kitchen",
  potatoField: "/potatoField",
  fishing: "/fishing",
};

export default function MenuButton() {
  const { user, isCoupled } = useUser();

  const uid = user?.id ?? null;
  const coupled = !!isCoupled;

  const disabledByState = (id: string) => {
    const g = GUARDS[id] || {};
    if (g.requireLogin && !uid) return true;
    if (g.requireCouple && !coupled) return true;
    return false;
  };

  const go = (id: string) => {
    const g = GUARDS[id] || {};
    if (g.requireLogin && !uid) return alert("로그인이 필요해요.");
    if (g.requireCouple && !coupled) return alert("커플 연동이 필요해요.");
    const url = FALLBACK_ROUTE[id] ?? `/${id}`;
    if (typeof window !== "undefined") window.location.assign(url);
  };

  const renderGroup = (title: string, items: Item[]) => (
    <div className="mb-4">
      <h3 className="px-3 py-1 text-xs font-semibold text-zinc-500">{title}</h3>
      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const disabled = disabledByState(item.id);
          return (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                "h-10 w-full justify-start gap-2",
                disabled && "opacity-50"
              )}
              onClick={() => !disabled && go(item.id)}
              disabled={disabled}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="fixed top-1/2 right-4 -translate-y-1/2 z-50 group">
      <Sheet>
        <SheetTrigger asChild>
          <div className="flex flex-col items-center gap-1 cursor-pointer">
            <Button
              size="icon"
              className="h-12 w-12 rounded-full shadow-md bg-amber-700 hover:bg-amber-600"
              aria-label="빠른 메뉴 열기"
            >
              <ArrowLeftCircle className="h-6 w-6 text-white" />
            </Button>
            <span className="text-[10px] text-black drop-shadow-sm">
              빠른 메뉴 펼치기
            </span>
          </div>
        </SheetTrigger>

        <SheetContent
          side="right"
          className="w-64 sm:max-w-sm p-0 flex flex-col"
          showClose={false}
        >
          {/* Avatar */}
          <div className="pt-4 flex flex-col items-center">
            <AvatarWidget size="md" />
          </div>
          <Separator className="my-2" />

          {/* 메뉴 그룹 */}
          <div className="px-3 pb-3 flex-1 overflow-y-auto">
            {renderGroup("기본", BASIC_ITEMS)}
            {renderGroup("우리의 일상", DAILY_ITEMS)}
            {renderGroup("감자링만의 세상", WORLD_ITEMS)}
          </div>

          {/* 하단 고정 영역 */}
          <div className="border-t p-3 flex justify-end">
            {user ? <LogoutButton /> : <LoginButton />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
