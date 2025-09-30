// src/components/widgets/AvatarWidget.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import supabase from "@/lib/supabase";
import { avatarSrc } from "@/features/localAvatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn, LogOut, Settings, Home, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";

export type AvatarWidgetSize = "sm" | "md" | "lg";
export type AvatarWidgetType = "user" | "partner";

type Props = {
  className?: string;
  size?: AvatarWidgetSize;
  type?: AvatarWidgetType;
  /** 기본 true: 유저 아바타에서 메뉴 사용, 파트너는 항상 비활성 */
  enableMenu?: boolean;
  /** 상태 점 표시 여부(기본 true) */
  showStatusDot?: boolean;
};

const AVATAR_SIZE: Record<AvatarWidgetSize, string> = {
  sm: "h-10 w-10",
  md: "h-12 w-12",
  lg: "h-14 w-14",
};

const NAME_TEXT: Record<AvatarWidgetSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

/* ───────────────────────── helpers ───────────────────────── */

function AvatarRing({
  children,
  size = "md",
}: {
  children: React.ReactNode;
  size: AvatarWidgetSize;
}) {
  const pad = size === "sm" ? "p-[2px]" : "p-[3px]";
  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-tr from-amber-300 via-rose-200 to-amber-200",
        "shadow-[0_0_0_1px_rgba(0,0,0,0.03)]",
        pad
      )}
      aria-hidden
    >
      <div className="rounded-full bg-white">{children}</div>
    </div>
  );
}

function StatusDot({
  type,
  isLoggedIn,
  size = "md",
}: {
  type: AvatarWidgetType;
  isLoggedIn: boolean;
  size: AvatarWidgetSize;
}) {
  const base =
    "absolute rounded-full ring-2 ring-white shadow-[0_0_0_1px_rgba(0,0,0,0.04)]";
  const dim =
    size === "sm" ? "h-2.5 w-2.5" : size === "md" ? "h-3 w-3" : "h-3.5 w-3.5";
  const pos =
    size === "sm"
      ? "bottom-0 right-0 translate-x-0.5 translate-y-0.5"
      : "bottom-0.5 right-0.5";
  const tone =
    type === "partner"
      ? "bg-rose-400"
      : isLoggedIn
      ? "bg-emerald-500"
      : "bg-neutral-300";

  return <span className={cn(base, dim, pos, tone)} aria-hidden />;
}

/* ───────────────────────── component ───────────────────────── */

export default function AvatarWidget({
  className,
  size = "md",
  type = "user",
  enableMenu = true,
  showStatusDot = true,
}: Props) {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  const [nickname, setNickname] = useState<string>("나");
  const [avatarId, setAvatarId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(type === "partner");

  const [menuOpen, setMenuOpen] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const isLoggedIn = !!user;

  useEffect(() => {
    let cancelled = false;

    const setSelf = () => {
      setNickname(user?.nickname ?? "나");
      setAvatarId(
        user?.avatar_id == null
          ? null
          : typeof user.avatar_id === "number"
          ? user.avatar_id
          : Number.isFinite(Number(user.avatar_id))
          ? Number(user.avatar_id)
          : null
      );
      setLoading(false);
    };

    const setPartner = async () => {
      if (!user?.partner_id) {
        setNickname("상대");
        setAvatarId(null);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("users")
        .select("nickname, avatar_id")
        .eq("id", user.partner_id)
        .maybeSingle();

      if (cancelled) return;
      if (!error && data) {
        setNickname(data.nickname ?? "상대");
        setAvatarId(
          typeof data.avatar_id === "number"
            ? data.avatar_id
            : Number.isFinite(Number(data.avatar_id))
            ? Number(data.avatar_id)
            : null
        );
      } else {
        setNickname("상대");
        setAvatarId(null);
      }
      setLoading(false);
    };

    if (type === "user") setSelf();
    else setPartner();

    return () => {
      cancelled = true;
    };
  }, [type, user?.nickname, user?.avatar_id, user?.partner_id]);

  const imgUrl = useMemo(
    () => avatarSrc(avatarId ?? undefined) ?? undefined,
    [avatarId]
  );
  const initial = nickname.trim()?.[0] || "🙂";

  const go = (path: string) => {
    setMenuOpen(false);
    navigate(path);
  };
  const handleLogin = () => go("/login");
  const handleGoSettings = () => go("/settings");
  const handleGoMain = () => go("/main");
  const handleGoInfo = () => go("/info");

  const handleLogout = async () => {
    if (authBusy) return;
    try {
      setAuthBusy(true);
      setMenuOpen(false);
      await logout();
      window.location.replace("/login");
    } catch (e) {
      console.error("로그아웃 실패:", e);
      setAuthBusy(false);
    }
  };

  /* ── 아바타 본체 ── */
  const body = (
    <div className={cn("inline-flex flex-col items-center", className)}>
      <div className="relative">
        <AvatarRing size={size}>
          <Avatar
            className={cn(
              AVATAR_SIZE[size],
              "transition-transform duration-200 data-[open=true]:scale-[1.02]"
            )}
            data-open={menuOpen}
          >
            {loading ? (
              <AvatarFallback className="text-xs text-gray-400">
                …
              </AvatarFallback>
            ) : (
              <>
                <AvatarImage src={imgUrl} alt={`${nickname} 아바타`} />
                <AvatarFallback
                  className={cn(
                    "font-semibold",
                    "bg-[radial-gradient(ellipse_at_top,rgba(255,240,200,0.9),rgba(255,255,255,0.95))]"
                  )}
                >
                  {initial}
                </AvatarFallback>
              </>
            )}
          </Avatar>
        </AvatarRing>

        {showStatusDot && (
          <StatusDot type={type} isLoggedIn={isLoggedIn} size={size} />
        )}
      </div>

      <span
        className={cn(
          "font-medium text-amber-800/90 max-w-[9rem] truncate tracking-tight",
          NAME_TEXT[size]
        )}
        title={nickname}
      >
        {loading ? "로딩중..." : nickname}
      </span>
    </div>
  );

  // 파트너 아바타거나 메뉴 비활성: 바로 렌더
  if (type === "partner" || !enableMenu) {
    return <>{body}</>;
  }

  /* ── 유저 아바타 + Popover 메뉴 ── */
  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 rounded-xl"
            aria-label="사용자 메뉴 열기"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            {body}
          </button>
        </PopoverTrigger>

        <PopoverContent align="center" side="bottom" className="w-56 py-4">
          {/* 미니 헤더 */}
          <div className="mb-2 flex items-center gap-2 justify-center">
            <div className="h-5 w-5 rounded-full overflow-hidden bg-neutral-100">
              {imgUrl ? (
                <img
                  src={imgUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid place-items-center text-[10px] text-neutral-500">
                  {initial}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-neutral-800 truncate">
                {nickname}
              </div>
            </div>
          </div>

          <div className="my-2 h-px bg-neutral-200" />

          {/* 신규 상단 메뉴: 메인페이지, 감자링이란? */}
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 px-2"
            onClick={handleGoMain}
          >
            <Home className="h-4 w-4" />
            <span className="text-sm">메인페이지</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 px-2"
            onClick={handleGoInfo}
          >
            <Info className="h-4 w-4" />
            <span className="text-sm">감자링이란?</span>
          </Button>

          {/* 기존: 마이페이지 */}
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 px-2 mt-1"
            onClick={handleGoSettings}
          >
            <Settings className="h-4 w-4" />
            <span className="text-sm">마이페이지</span>
          </Button>

          <div className="my-2 h-px bg-neutral-200" />

          {/* 로그인/로그아웃 */}
          {isLoggedIn ? (
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 px-2 text-rose-600 hover:text-rose-700"
              onClick={handleLogout}
              disabled={authBusy}
            >
              {authBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              <span className="text-sm">
                {authBusy ? "로그아웃 중…" : "로그아웃"}
              </span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 px-2"
              onClick={handleLogin}
            >
              <LogIn className="h-4 w-4" />
              <span className="text-sm">로그인</span>
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </>
  );
}
