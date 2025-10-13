// src/components/widgets/HomeFabButton.tsx
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
import { Home, ArrowUp, Navigation } from "lucide-react";

/* ---------------------------------------------
   설정
---------------------------------------------- */
const NAV_HISTORY_KEY = "app_nav_history"; // sessionStorage
const LONG_PRESS_MS = 520; // 롱프레스 기준 (터치 대응)
const HOVER_OPEN_DELAY_MS = 420; // 일정 시간 호버 시 팝오버 열기
const SCROLL_TOP_MODE_THRESHOLD = 120; // 이 값 이상 스크롤되면 위로가기 모드

/** 테마 톤 (간결화했지만 prop은 유지) */
type Tone = "daily" | "world";

/** 옵션 props */
type HomeFabButtonProps = {
  tone?: Tone;
  position?: "bottom-right" | "bottom-left" | "bottom-center";
  autoHideOnScroll?: boolean; // 모드 전환만; 버튼 숨김은 안 함
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

function getScrollY() {
  return (
    window.scrollY ||
    (document.documentElement && document.documentElement.scrollTop) ||
    0
  );
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
    const next = [pathname, ...hist.filter((p) => p !== pathname)];
    saveHistory(next);
  }, [pathname]);

  // 최근 방문 경로 3개 (현재 페이지 제외)
  const recent = useMemo(
    () =>
      loadHistory()
        .filter((p) => p !== pathname)
        .slice(0, 3),
    [pathname]
  );

  /* --------- Popover 제어 --------- */
  const [open, setOpen] = useState(false);
  const hoverTimerRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);

  /* --------- 스크롤 상태 추적 --------- */
  const [scrollTopMode, setScrollTopMode] = useState(false); // 아이콘 전환용(임계치 기반)
  const [atTop, setAtTop] = useState(true); // 실제 최상단 여부(정확한 클릭 규칙용)
  useEffect(() => {
    const onScroll = () => {
      const y = getScrollY();
      setAtTop(y <= 0);
      if (autoHideOnScroll) setScrollTopMode(y > SCROLL_TOP_MODE_THRESHOLD);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [autoHideOnScroll]);

  /* --------- 클릭/호버/롱프레스 동작 --------- */
  // Popover의 "메인 이동/상단" 버튼은 기존 의미 유지
  const goHomeOrTop = React.useCallback(() => {
    if (pathname === "/main") {
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {}
      return;
    }
    nav("/main");
  }, [nav, pathname]);

  // ✅ 메인 FAB의 클릭 규칙(요청사항)
  // - 메인페이지:
  //    · 이미 상단이면 아무 것도 하지 않음
  //    · 상단이 아니면 메인 상단으로 스크롤
  // - 다른 페이지:
  //    · 상단이 아니면 현재 페이지 상단으로 스크롤
  //    · 이미 상단이면 메인으로 이동
  const onButtonClick = () => {
    const y = getScrollY();
    const isTop = y <= 0;

    if (pathname === "/main") {
      if (!isTop) {
        try {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } catch {}
      }
      return; // 상단이면 아무 동작 없음
    }

    // 다른 페이지인 경우
    if (!isTop) {
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {}
      return;
    }

    // 다른 페이지 + 이미 상단 → 메인으로 이동
    nav("/main");
  };

  const onButtonPointerDown = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressTimerRef.current = window.setTimeout(() => {
      setOpen(true);
    }, LONG_PRESS_MS);
  };
  const onButtonPointerUpOrLeave = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const onButtonMouseEnter = () => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    hoverTimerRef.current = window.setTimeout(() => {
      setOpen(true);
    }, HOVER_OPEN_DELAY_MS);
  };
  const onButtonMouseLeave = () => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  /* --------- 간결한 스타일 --------- */
  const baseColor =
    tone === "world"
      ? "bg-indigo-600 hover:bg-indigo-700 ring-indigo-300/50"
      : "bg-emerald-600 hover:bg-emerald-700 ring-emerald-300/50";

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
  const ariaLabel = atTop
    ? pathname === "/main"
      ? "메인(이미 상단)"
      : "메인으로 이동"
    : "현재 페이지 상단으로 이동";

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
            onClick={onButtonClick}
            onPointerDown={onButtonPointerDown}
            onPointerUp={onButtonPointerUpOrLeave}
            onPointerLeave={onButtonPointerUpOrLeave}
            onMouseEnter={onButtonMouseEnter}
            onMouseLeave={onButtonMouseLeave}
            className={cn(
              "relative h-14 w-14 rounded-full shadow-xl",
              "text-white ring-1",
              baseColor,
              "transition-transform active:scale-[0.98]",
              "overflow-hidden",
              // 유리/그레인 제거 → 더 깔끔
              className
            )}
          >
            {/* 아이콘: 스크롤 상태에 따라 전환 (간결하게) */}
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-opacity duration-150",
                scrollTopMode ? "opacity-0" : "opacity-100"
              )}
            >
              <Home className="h-[26px] w-[26px]" />
            </div>
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-opacity duration-150",
                scrollTopMode ? "opacity-100" : "opacity-0"
              )}
            >
              <ArrowUp className="h-[26px] w-[26px]" />
            </div>
            {/* ✅ 우상단 반짝이(스파클) 제거 */}
          </Button>
        </PopoverTrigger>

        {/* 롱프레스/호버 지연으로 여는 팝오버 */}
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
            // 더 담백한 배경
            "bg-white shadow-md border"
          )}
        >
          <div className="mt-1 grid gap-1">
            {/* 메인 이동/상단 */}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                goHomeOrTop();
              }}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-left",
                "hover:bg-muted/50 transition-colors"
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
                    "hover:bg-muted/50 transition-colors"
                  )}
                >
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

            {/* 현재 페이지 맨 위로 */}
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
                "hover:bg-muted/50 transition-colors"
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
