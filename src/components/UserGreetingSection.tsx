// UserGreetingSection.tsx
"use client";

import { useMemo } from "react";
import { useToast } from "@/contexts/ToastContext";
import { useUser } from "@/contexts/UserContext";

import NotificationDropdown from "./widgets/Notification/NotificationDropdown";
import LoginButton from "./LoginButton";
import LogoutButton from "./LogoutButton";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetDescription,
} from "@/components/ui/sheet";

import {
  Home,
  Info,
  Settings,
  MessageSquareText,
  Package,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "./ui/separator";

// ✅ shadcn/ui Avatar
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// 🔸 로컬 아바타 유틸 (네가 제공한 것)
import { avatarSrc } from "@/features/localAvatar"; // export function avatarSrc(id?: number|null) { ... }

type Item = {
  id: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

type Props = {
  onNavigate?: (id: string, meta: { url: string; header?: string }) => void;
  headerById?: Record<string, string>;
  sessionHeaderKey?: string;
};

const NAV_ITEMS: Item[] = [
  { id: "home", label: "메인페이지", icon: Home },
  { id: "info", label: "감자링이란?", icon: Info },
  { id: "settings", label: "마이페이지", icon: Settings },
  { id: "questions", label: "오늘의 질문", icon: MessageSquareText },
  { id: "bundle", label: "답변꾸러미", icon: Package },
  { id: "scheduler", label: "커플 스케쥴러", icon: CalendarClock },
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
};

const FALLBACK_ROUTE: Record<string, string> = {
  home: "/main",
  info: "/info",
  settings: "/settings",
  notifications: "/notifications",
  questions: "/questions",
  bundle: "/bundle",
  scheduler: "/scheduler",
};

export default function UserGreetingSection({
  onNavigate,
  headerById,
  sessionHeaderKey = "app:nextHeader",
}: Props) {
  const { open } = useToast();
  const { user, isCoupled } = useUser();

  const uid = user?.id ?? null;
  const coupled = !!isCoupled;

  // ✅ 닉네임 이니셜
  const initial = useMemo(() => {
    const nk = user?.nickname?.trim() ?? "";
    return nk ? nk[0] : "🙂";
  }, [user?.nickname]);

  // ✅ avatar_id → 정수 변환(스키마가 string일 수도 있으니 대비)
  const avatarId: number | null =
    user?.avatar_id == null
      ? null
      : typeof user.avatar_id === "number"
      ? user.avatar_id
      : Number.isFinite(Number(user.avatar_id))
      ? Number(user.avatar_id)
      : null;

  // ✅ 로컬 아바타 경로
  const imgUrl = avatarSrc(avatarId); // null이면 이미지 미사용

  const disabledByState = (id: string) => {
    const guard = GUARDS[id] || {};
    if (guard.requireLogin && !uid) return true;
    if (guard.requireCouple && !coupled) return true;
    return false;
  };

  const go = (id: string) => {
    const guard = GUARDS[id] || {};
    if (guard.requireLogin && !uid) {
      open("로그인이 필요해요.");
      return;
    }
    if (guard.requireCouple && !coupled) {
      open("커플 연동이 필요해요.");
      return;
    }
    const item = NAV_ITEMS.find((x) => x.id === id);
    const header = headerById?.[id] ?? item?.label ?? "";

    try {
      sessionStorage.setItem(
        sessionHeaderKey,
        JSON.stringify({ header, ts: Date.now() })
      );
    } catch {}

    const url = FALLBACK_ROUTE[id] ?? `/${id}`;
    if (onNavigate) {
      onNavigate(id, { url, header });
    } else if (typeof window !== "undefined") {
      window.location.assign(url);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      {!user ? (
        <LoginButton />
      ) : (
        <>
          <NotificationDropdown onUnreadChange={() => {}} />

          <Sheet>
            <SheetTrigger asChild>
              {/* 버튼 접근성 + Avatar 외형 */}
              <button
                type="button"
                aria-label={`${user.nickname ?? "사용자"} 메뉴 열기`}
                title={user.nickname ?? "사용자"}
                className={cn(
                  "relative inline-flex items-center justify-center",
                  "h-11 w-11 rounded-full outline-none",
                  "transition active:scale-95",
                  "ring-offset-background hover:ring-2 hover:ring-amber-300 hover:ring-offset-2 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
                )}
              >
                <Avatar className="h-11 w-11">
                  {/* src가 없거나 로드 실패하면 Fallback */}
                  <AvatarImage src={imgUrl ?? undefined} alt="프로필 이미지" />
                  <AvatarFallback className="text-sm font-semibold">
                    {initial}
                  </AvatarFallback>
                </Avatar>

                {/* 🔸 필요하면 상태 배지 (예: 온라인/알림 등)
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                */}
              </button>
            </SheetTrigger>

            <SheetContent
              side="right"
              className="w-60 sm:max-w-sm"
              showClose={false}
            >
              <SheetHeader className="p-2 mb-2">
                <SheetDescription>빠른 메뉴</SheetDescription>
              </SheetHeader>
              <Separator />

              <nav className="flex flex-col items-center jutify-center mt-4 gap-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const disabled = disabledByState(item.id);
                  return (
                    <Button
                      key={item.id}
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-2 h-10",
                        disabled && "opacity-50 cursor-not-allowed"
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

              <div className="mt-6 border-t pt-4">
                <LogoutButton />
              </div>
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
}
