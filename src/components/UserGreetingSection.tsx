"use client";

import { useEffect, useMemo, useState } from "react";
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
import { avatarSrc } from "@/features/localAvatar";

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

// 폴백 라우트
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
  const coupled = !!isCoupled;
  const uid = user?.id ?? null;

  // ✅ 아바타 URL 상태
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  // 아바타 불러오기
  useEffect(() => {
    const run = async () => {
      if (!uid) {
        setAvatarUrl(null);
        return;
      }
      setAvatarLoading(true);
      try {
        const url = await LocalAvatarSrc(uid);
        setAvatarUrl(url);
      } catch {
        setAvatarUrl(null);
      } finally {
        setAvatarLoading(false);
      }
    };
    run();
  }, [uid]);

  const initial = useMemo(() => {
    const nk = user?.nickname?.trim() ?? "";
    return nk ? nk[0] : "🙂";
  }, [user?.nickname]);

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

    if (onNavigate) {
      const url = FALLBACK_ROUTE[id] ?? `/${id}`;
      onNavigate(id, { url, header });
      return;
    }

    const url = FALLBACK_ROUTE[id] ?? `/${id}`;
    if (typeof window !== "undefined") window.location.assign(url);
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
              {/* ✅ 프로필: 이미지가 있으면 이미지, 없으면 이니셜 */}
              <button
                aria-label={`${user.nickname ?? "사용자"} 메뉴 열기`}
                className={cn(
                  "h-9 w-9 rounded-full border bg-white text-sm font-semibold",
                  "flex items-center justify-center overflow-hidden",
                  "hover:bg-amber-50 active:scale-95 transition"
                )}
                title={user.nickname ?? "사용자"}
              >
                {avatarUrl && !avatarLoading ? (
                  // 아바타 이미지
                  <img
                    src={avatarUrl}
                    alt="프로필 이미지"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  // 이니셜
                  <span>{initial}</span>
                )}
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
