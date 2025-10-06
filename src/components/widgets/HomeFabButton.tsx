"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** 아이콘 */
import { Home, Clock, ArrowUp, Sparkles, Navigation } from "lucide-react";

/* ---------------------------------------------
   설정
---------------------------------------------- */
const NAV_HISTORY_KEY = "app_nav_history"; // sessionStorage
const LONG_PRESS_MS = 520; // 롱프레스 기준
const DOUBLE_TAP_MS = 300; // 더블탭 기준
const SCROLL_TOP_MODE_THRESHOLD = 120; // 이 값 이상 스크롤되면 위로가기 모드

/** 테마 톤 */
type Tone = "daily" | "world";

/** 옵션 props */
type HomeFabButtonProps = {
  /** 감정 톤 (QuickMenu와 색상 동기화용) */
  tone?: Tone;
  /** 버튼 위치 (기본: 우하단) */
  position?: "bottom-right" | "bottom-left" | "bottom-center";
  /** (옵션) 위/아래 스크롤에 반응해 모드만 전환 */
  autoHideOnScroll?: boolean;
  /** className 오버라이드 */
  className?: string;
};

/* ---------------------------------------------
   유틸: sessionStorage 기반 최근 방문 경로
---------------------------------------------- */
function loadHistory(): string[] {
  try {
    const raw = sessionStorage.getItem(NAV_HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function saveHistory(paths: string[]) {
  try {
    sessionStorage.setItem(NAV_HISTORY_KEY, JSON.stringify(paths.slice(0, 25)));
  } catch {}
}

/* ---------------------------------------------
   컴포넌트
---------------------------------------------- */
export default function HomeFabButton({
  tone = "daily",
  position = "bottom-right",
  autoHideOnScroll = true,
  className,
}: HomeFabButtonProps) {
  const nav = useNavigate();
  const { pathname } = useLocation();

  // 최근 방문 기록 저장
  useEffect(() => {
    const hist = loadHistory();
    // 같은 항목 중복 제거 + 맨 앞에 추가
    const next = [pathname, ...hist.filter((p) => p !== pathname)];
    saveHistory(next);
  }, [pathname]);

  // 최근 방문 경로 3개 (현재 페이지 제외)
  const recent = useMemo(() => {
    return loadHistory()
      .filter((p) => p !== pathname)
      .slice(0, 3);
  }, [pathname]);

  /* --------- 더블탭 & 롱프레스 --------- */
  const lastTapRef = useRef<number>(0);
  const longPressTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false); // Popover open state

  const goHome = React.useCallback(() => {
    if (pathname === "/main") {
      // 이미 메인: 상단으로 스크롤
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {}
      return;
    }
    nav("/main");
  }, [nav, pathname]);

  /* --------- 스크롤 시 '위로가기 모드' 전환 --------- */
  const [scrollTopMode, setScrollTopMode] = useState(false);

  useEffect(() => {
    if (!autoHideOnScroll) return;
    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      setScrollTopMode(y > SCROLL_TOP_MODE_THRESHOLD);
    };
    onScroll(); // 초기 모드 반영
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [autoHideOnScroll]);

  /* --------- 탭/클릭 동작 --------- */
  const onTap = () => {
    // 스크롤탑 모드일 땐 즉시 현재 페이지 맨 위로
    if (scrollTopMode) {
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {}
      return;
    }
    // 기본은 더블탭 감지 → 홈
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      goHome();
    }
    lastTapRef.current = now;
  };

  const onPointerDown = () => {
    // 롱프레스 시 팝오버 열기
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressTimerRef.current = window.setTimeout(() => {
      setOpen(true);
    }, LONG_PRESS_MS);
  };

  const onPointerUpOrLeave = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  /* --------- 스타일 토큰 --------- */
  const toneClasses =
    tone === "world"
      ? {
          // 보라/인디고
          ring: "ring-violet-300/60",
          grad: "from-violet-600 to-indigo-600",
          hover: "hover:from-violet-700 hover:to-indigo-700",
          text: "text-white",
          grain:
            "after:bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.12),transparent_35%)]",
        }
      : {
          // 에메랄드/티얼
          ring: "ring-emerald-300/60",
          grad: "from-emerald-500 to-teal-500",
          hover: "hover:from-emerald-600 hover:to-teal-600",
          text: "text-white",
          grain:
            "after:bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.12),transparent_35%)]",
        };

  /* --------- 위치 --------- */
  const positionClass = {
    "bottom-right":
      "right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))]",
    "bottom-left":
      "left-[max(1rem,env(safe-area-inset-left))] bottom-[max(1rem,env(safe-area-inset-bottom))]",
    "bottom-center":
      "left-1/2 -translate-x-1/2 bottom-[max(1rem,env(safe-area-inset-bottom))]",
  }[position];

  /* --------- 접근성 --------- */
  const ariaLabel = scrollTopMode
    ? "현재 페이지 맨 위로 이동"
    : pathname === "/main"
    ? "메인 상단으로 이동"
    : "메인으로 이동";

  return (
    <div
      className={cn(
        "fixed z-[120] select-none",
        positionClass,
        "transition-all duration-200 ease-out"
      )}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            aria-label={ariaLabel}
            title={ariaLabel}
            onClick={onTap}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUpOrLeave}
            onPointerLeave={onPointerUpOrLeave}
            className={cn(
              "relative h-14 w-14 rounded-full shadow-2xl",
              "bg-gradient-to-br",
              toneClasses.grad,
              toneClasses.hover,
              toneClasses.text,
              "ring-2",
              toneClasses.ring,
              // 유리알 질감 + 그레인
              "backdrop-blur supports-[backdrop-filter]:bg-white/8",
              "after:content-[''] after:absolute after:inset-0 after:pointer-events-none after:opacity-60",
              toneClasses.grain,
              "transition-transform active:scale-[0.98]",
              // 아이콘 전환 애니메이션을 위한 overflow
              "overflow-hidden",
              className
            )}
          >
            {/* 아이콘 레이어 */}
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-opacity duration-150",
                scrollTopMode ? "opacity-0" : "opacity-100"
              )}
            >
              <Home className="h-[26px] w-[26px] drop-shadow-[0_3px_8px_rgba(0,0,0,0.25)]" />
            </div>
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-opacity duration-150",
                scrollTopMode ? "opacity-100" : "opacity-0"
              )}
            >
              <ArrowUp className="h-[26px] w-[26px] drop-shadow-[0_3px_8px_rgba(0,0,0,0.25)]" />
            </div>

            {/* 작은 스파클 장식 (항상 표시) */}
            <Sparkles
              aria-hidden
              className="pointer-events-none absolute -top-1 -right-1 h-3.5 w-3.5 opacity-80"
            />
          </Button>
        </PopoverTrigger>

        {/* 롱프레스 팝오버 */}
        <PopoverContent
          side={
            position === "bottom-left"
              ? "top-start"
              : position === "bottom-right"
              ? "top-end"
              : "top"
          }
          align={position === "bottom-center" ? "center" : "end"}
          className={cn(
            "w-[220px] rounded-2xl p-2",
            "bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80"
          )}
        >
          <div className="mt-2 grid gap-1">
            {/* 메인으로 이동 / 메인 상단으로 */}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                goHome();
              }}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-left",
                "hover:bg-muted/60 transition-colors"
              )}
            >
              <Home className="h-4 w-4 text-foreground/80" />
              <span className="text-sm font-medium">
                {pathname === "/main" ? "메인 상단으로" : "홈으로"}
              </span>
            </button>

            <Separator className="my-1" />

            {/* 최근 방문 3곳 */}
            {recent.length > 0 ? (
              recent.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    nav(p);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-left",
                    "hover:bg-muted/60 transition-colors"
                  )}
                >
                  {/* ✅ 시계 대신 이동 느낌의 아이콘 */}
                  <Navigation className="h-4 w-4 text-foreground/70" />
                  <span className="text-sm">{prettyPath(p)}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                최근 방문 기록이 없어요
              </div>
            )}

            <Separator className="my-1" />

            {/* 맨 위로 (현재 페이지) */}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                try {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } catch {}
              }}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-left",
                "hover:bg-muted/60 transition-colors"
              )}
            >
              <ArrowUp className="h-4 w-4 text-foreground/70" />
              <span className="text-sm">현재 페이지 맨 위로</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ---------------------------------------------
   경로 표시를 감성 있게 줄여주는 헬퍼
---------------------------------------------- */
function prettyPath(path: string) {
  if (path === "/") return "홈";
  if (path === "/main") return "메인";
  const seg = path.split("?")[0].split("#")[0].split("/").filter(Boolean);
  if (seg.length === 0) return "홈";
  const head = seg[0];
  const map: Record<string, string> = {
    memories: "추억조각",
    questions: "답변하기",
    bundle: "답변꾸러미",
    scheduler: "스케쥴러",
    timeCapsule: "타임캡슐",
    gloomy: "음침한 방",
    potatoField: "농장",
    farm: "농장",
    kitchen: "조리실",
    exchange: "교환소",
    aquarium: "아쿠아리움",
    fishing: "낚시터",
    stickerBoard: "스티커보드",
    miniGame: "미니게임",
    info: "감자링이란?",
  };
  return map[head] ?? `/${head}`;
}
