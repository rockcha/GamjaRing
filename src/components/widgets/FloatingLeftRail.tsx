// src/components/FloatingLeftRail.tsx
"use client";

import NoticeCenterFloatingButton from "@/features/dev-note/NoticeFloatingButton";
import DailyFortuneCard from "@/features/fortune/DailyFortuneCard";
import WeatherCard from "./WeatherCard";
import KoreanQuoteButton from "./KoreanQuoteButton";
import TimeCapsuleButton from "@/features/time-capsule/TimeCapsuleButton";
import SlotSpinButton from "./SlotSpinButton";

import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import * as React from "react";

/* ───────────── 미니 섹션 타일(비인터랙티브 프레임) ───────────── */
function Tile({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "w-16 h-16 md:w-[72px] md:h-[72px]",
        "rounded-2xl bg-white/70 dark:bg-zinc-900/50 backdrop-blur-md",
        "ring-1 ring-black/5 dark:ring-white/10 shadow-sm",
        "pointer-events-none flex items-center justify-center p-1 overflow-hidden"
      )}
    >
      <div className="pointer-events-auto w-full h-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

/* ───────────── 섹션 컨테이너용 애니메이션(진입만) ───────────── */
const sectionVariants = {
  hidden: { opacity: 0, scale: 0.98, y: 4 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.18, ease: "easeOut" },
  },
};

export default function FloatingLeftRail() {
  const [collapsed, setCollapsed] = React.useState<boolean>(false);

  React.useEffect(() => {
    const v = localStorage.getItem("leftRailCollapsed");
    if (v === "1") setCollapsed(true);
  }, []);
  const toggle = () => {
    setCollapsed((v) => {
      const nv = !v;
      localStorage.setItem("leftRailCollapsed", nv ? "1" : "0");
      return nv;
    });
  };

  return (
    <div
      className={cn(
        "fixed left-2 top-1/2 -translate-y-1/2 z-[50]",
        "flex flex-col items-center"
      )}
    >
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.aside
            key="left-rail-section"
            initial="hidden"
            animate="show"
            exit={{
              opacity: 0,
              scale: 0.98,
              y: 4,
              transition: { duration: 0.16 },
            }}
            variants={sectionVariants}
            className={cn(
              // 섹션 프레임
              "w-[270px] md:w-[280px]",
              "rounded-3xl overflow-hidden shadow-[0_20px_60px_-28px_rgba(0,0,0,0.35)]",
              "ring-1 ring-black/10 dark:ring-white/10",
              // 유리+종이 질감 베이스
              "bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,255,255,0.75))] dark:bg-[linear-gradient(180deg,rgba(20,20,20,0.85),rgba(20,20,20,0.7))]",
              "backdrop-blur-xl",
              // 은은한 그레인(선택)
              "[mask-image:radial-gradient(closest-side,rgba(0,0,0,0.98),black)]"
            )}
          >
            {/* 섹션 헤더 */}
            <div
              className={cn(
                "flex items-center justify-between",
                "px-3.5 py-2.5",
                // 헤더 배경 살짝 강조
                "bg-white/55 dark:bg-zinc-900/50 backdrop-blur-xl",
                "border-b border-black/8 dark:border-white/10"
              )}
            >
              <div className="flex items-center gap-2">
                {/* 작은 인디케이터 바(장식) */}

                <h2 className="text-xs font-semibold tracking-wide text-zinc-700 dark:text-zinc-200">
                  빠른 패널
                </h2>
              </div>

              {/* 접기 버튼: 섹션 우상단 */}
              <button
                type="button"
                onClick={toggle}
                aria-label="접기"
                title="접기"
                className={cn(
                  "grid place-items-center h-7 w-7 rounded-full",
                  "border border-black/10 dark:border-white/10",
                  "bg-white/70 dark:bg-zinc-800/70"
                )}
              >
                <FontAwesomeIcon
                  icon={faChevronLeft}
                  className="h-3.5 w-3.5 text-zinc-700 dark:text-zinc-200"
                />
              </button>
            </div>

            {/* 섹션 바디: 3×2 그리드 */}
            <div className="p-3">
              <div
                className={cn(
                  "grid grid-cols-3 grid-rows-2 gap-1 ",
                  "max-h-[70vh] overflow-y-auto "
                )}
              >
                <TimeCapsuleButton />

                <WeatherCard />

                <DailyFortuneCard />

                <NoticeCenterFloatingButton />

                <KoreanQuoteButton />

                <SlotSpinButton />
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* 펼치기 버튼: 섹션이 접혔을 때만 단독 노출 */}
      {collapsed && (
        <button
          type="button"
          onClick={toggle}
          aria-label="패널 펼치기"
          title="패널 펼치기"
          className={cn(
            "mt-0 grid place-items-center h-9 w-9 rounded-full border bg-white/85 dark:bg-zinc-900/70 shadow-sm"
          )}
        >
          <FontAwesomeIcon
            icon={faChevronRight}
            className="h-4 w-4 text-zinc-700 dark:text-zinc-200"
          />
        </button>
      )}
    </div>
  );
}
