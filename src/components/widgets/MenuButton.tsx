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
  Menu as MenuIcon,
  ChefHat, // 부엌
  Fish, // 🐟 아쿠아리움 아이콘
} from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/lib/utils";
import LoginButton from "@/components/LoginButton";
import LogoutButton from "@/components/LogoutButton";
import AvatarWidget from "@/components/widgets/AvatarWidget";

type Item = {
  id: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

const NAV_ITEMS: Item[] = [
  { id: "home", label: "메인페이지", icon: Home },
  { id: "info", label: "감자링이란?", icon: Info },
  { id: "settings", label: "마이페이지", icon: Settings },
  { id: "questions", label: "오늘의 질문", icon: MessageSquareText },
  { id: "bundle", label: "답변꾸러미", icon: Package },
  { id: "scheduler", label: "커플 스케쥴러", icon: CalendarClock },

  // 🎮 게임들
  { id: "aquarium", label: "아쿠아리움", icon: Fish }, // ⬅️ 교체
  { id: "kitchen", label: "부엌", icon: ChefHat },
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

  aquarium: {}, // 공개 (로그인 필수로 바꾸려면 { requireLogin: true })
  kitchen: {},
};

const FALLBACK_ROUTE: Record<string, string> = {
  home: "/main",
  info: "/info",
  settings: "/settings",
  notifications: "/notifications",
  questions: "/questions",
  bundle: "/bundle",
  scheduler: "/scheduler",
  aquarium: "/aquarium", // ⬅️ 교체
  kitchen: "/kitchen",
};

export default function MenuButton() {
  const { user, isCoupled } = useUser();
  const { open } = useToast();

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
    if (g.requireLogin && !uid) return open("로그인이 필요해요.");
    if (g.requireCouple && !coupled) return open("커플 연동이 필요해요.");
    const url = FALLBACK_ROUTE[id] ?? `/${id}`;
    if (typeof window !== "undefined") window.location.assign(url);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Sheet>
        <SheetTrigger asChild>
          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-md bg-amber-700 hover:bg-amber-600"
            aria-label="빠른 메뉴 열기"
          >
            <MenuIcon className="h-6 w-6 text-white" />
          </Button>
        </SheetTrigger>

        <SheetContent
          side="right"
          className="w-64 sm:max-w-sm p-0"
          showClose={false}
        >
          {/* Avatar + 로그인/로그아웃 */}
          <div className="pt-4 flex flex-col items-center">
            <AvatarWidget size="md" />
          </div>
          <div className="flex justify-end mb-2 px-3">
            {user ? <LogoutButton /> : <LoginButton />}
          </div>
          <Separator />

          {/* 메뉴 목록 */}
          <div className="px-3 pb-3">
            <nav className="mt-2 flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
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
        </SheetContent>
      </Sheet>
    </div>
  );
}
