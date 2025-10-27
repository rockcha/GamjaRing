// src/components/widgets/HomeFabButton.tsx
"use client";

import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
const HOVER_OPEN_DELAY_MS = 420; // 일정 시간 호버 시 팝오버 열기

/** 테마 톤 (간결화했지만 prop은 유지) */
type Tone = "daily" | "world";

/** 옵션 props */
type HomeFabButtonProps = {
  tone?: Tone;
  position?: "bottom-right" | "bottom-left" | "bottom-center";
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

  /* --------- Popover 제어 (호버로만 오픈) --------- */
  const [open, setOpen] = useState(false);
  const hoverTimerRef = useRef<number | null>(null);

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

  /* --------- 스크롤 상태 --------- */
  const [atTop, setAtTop] = useState(true); // 실제 최상단 여부
  useEffect(() => {
    const onScroll = () => setAtTop(getScrollY() <= 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* --------- 메인 FAB 클릭 동작 (요청된 규칙) --------- */
  // - 상단인 경우: 홈 아이콘, 동작은
  //    · 메인 페이지면 아무 것도 안 함
  //    · 다른 페이지면 메인으로 이동
  // - 상단이 아닌 경우: 위로가기 아이콘, 동작은 현재 페이지 최상단 스크롤
  const onButtonClick = () => {
    const isTop = getScrollY() <= 0;

    if (!isTop) {
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {}
      return;
    }

    // 이미 상단
    if (pathname === "/main") return;
    nav("/main");
  };

  /* --------- 스타일 --------- */
  const baseColor =
    tone === "world"
      ? "bg-indigo-600 hover:bg-indigo-700 ring-indigo-300/50"
      : "bg-emerald-600 hover:bg-emerald-700 ring-emerald-300/50";

  const positionClass = {
    "bottom-right":
      "right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))]",
    "bottom-left":
      "left-[max(1rem,env(safe-area-inset-left))] bottom-[max(1rem,env(safe-area-inset-bottom))]",
    "bottom-center":
      "left-1/2 -translate-x-1/2 bottom-[max(1rem,env(safe-area-inset-bottom))]",
  }[position];

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
            onMouseEnter={onButtonMouseEnter}
            onMouseLeave={onButtonMouseLeave}
            className={cn(
              "relative h-14 w-14 rounded-full shadow-xl",
              "text-white ring-1",
              baseColor,
              "transition-transform active:scale-[0.98]",
              "overflow-hidden",
              className
            )}
          >
            {/* 아이콘: 상단 여부에 따라 표시 */}
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-opacity duration-150",
                atTop ? "opacity-100" : "opacity-0"
              )}
            >
              <Home className="h-[26px] w-[26px]" />
            </div>
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-opacity duration-150",
                atTop ? "opacity-0" : "opacity-100"
              )}
            >
              <ArrowUp className="h-[26px] w-[26px]" />
            </div>
          </Button>
        </PopoverTrigger>

        {/* ✅ 호버 시: '최근 페이지 목록'만 노출 (나머지 기능 제거) */}
        <PopoverContent
          side={
            position === "bottom-left"
              ? "top-start"
              : position === "bottom-right"
              ? "top-end"
              : "top"
          }
          align={position === "bottom-center" ? "center" : "end"}
          className={cn("w-[220px] rounded-2xl p-2 bg-white shadow-md border")}
        >
          <div className="mt-1 grid gap-1">
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
