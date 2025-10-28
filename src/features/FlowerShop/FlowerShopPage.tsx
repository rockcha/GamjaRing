// src/app/flowers/FlowerShopPage.tsx
"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import FlowerShop from "./FlowerShop";
import GardenBackyard from "./GardenBackyard";

type View = "shop" | "garden";

export default function FlowerShopPage() {
  const [view, setView] = useState<View>("shop");

  /** ===== 상단 슬라이드 토글 (이모지 + 컬러 업) ===== */
  const tabs = useMemo(
    () =>
      [
        { key: "shop", label: "꽃집", icon: "🌼" },
        { key: "garden", label: "뒤뜰", icon: "🪴" },
      ] as const,
    []
  );
  const activeIndex = view === "shop" ? 0 : 1;

  const handleSwitch = useCallback((next: View) => setView(next), []);

  /** ===== 콘텐츠 전환 애니메이션 ===== */
  const variants = {
    initial: { opacity: 0, y: 8, scale: 0.995 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -8, scale: 0.995 },
  };
  const transition = { type: "spring", stiffness: 220, damping: 22, mass: 0.9 };

  /** ===== 모바일 스와이프 ===== */
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) {
      if (dx < 0 && view === "shop") handleSwitch("garden");
      else if (dx > 0 && view === "garden") handleSwitch("shop");
    }
    touchStartX.current = null;
  };

  /** ===== 키보드 내비게이션 ===== */
  const onKeyDownTabs = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight" || e.key === "End") {
      e.preventDefault();
      handleSwitch("garden");
    } else if (e.key === "ArrowLeft" || e.key === "Home") {
      e.preventDefault();
      handleSwitch("shop");
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      {/* 상단 바: 이모지 타이틀 + 세그먼트 */}
      <div className="sticky top-0 z-20 mb-5 flex items-center justify-between rounded-2xl border bg-background/70 p-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/50">
        {/* 좌측 타이틀 (활성 탭 이모지/텍스트) */}
        <div className="flex items-center gap-3 px-1">
          <div
            className="inline-flex size-10 items-center justify-center rounded-xl border
                       bg-gradient-to-b from-pink-100/70 to-transparent dark:from-pink-900/20"
          >
            <span className="text-lg md:text-xl">{tabs[activeIndex].icon}</span>
          </div>
          <div className="leading-tight">
            <h1 className="text-lg md:text-2xl font-extrabold tracking-tight">
              {tabs[activeIndex].label}
            </h1>
            <p className="text-[11px] md:text-xs text-muted-foreground">
              {activeIndex === 0
                ? "꽃 인벤토리와 주문을 관리해요"
                : "씨앗을 심고 가꿔요"}
            </p>
          </div>
        </div>

        {/* 우측: 이모지 세그먼트 토글 */}
        <div
          role="tablist"
          aria-label="꽃집/뒤뜰 전환"
          onKeyDown={onKeyDownTabs}
          className="relative isolate w-[276px] select-none rounded-2xl border bg-background/60 p-1 shadow-inner backdrop-blur supports-[backdrop-filter]:bg-background/40"
        >
          {/* 슬라이딩 인디케이터에 파스텔 색 */}
          <motion.div
            layout
            className="absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-xl "
            style={{
              left: activeIndex === 0 ? "0.25rem" : "calc(50% + 0.0rem)",
            }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 38,
              mass: 0.6,
            }}
          >
            <div className="h-full w-full rounded-xl bg-gradient-to-r from-pink-200/40 to-violet-200/40 dark:from-pink-900/30 dark:to-violet-900/30 ring-inset ring-pink-300/40" />
          </motion.div>

          <div className="grid grid-cols-2 gap-1">
            {tabs.map((t, idx) => {
              const active = idx === activeIndex;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  aria-controls={`panel-${t.key}`}
                  tabIndex={active ? 0 : -1}
                  onClick={() => setView(t.key as View)}
                  className={[
                    "relative z-10 flex h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors",
                    active
                      ? "text-foreground"
                      : "text-foreground/80 hover:text-foreground",
                  ].join(" ")}
                >
                  <span aria-hidden className="text-base">
                    {t.icon}
                  </span>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <AnimatePresence mode="wait" initial={false}>
          {view === "shop" ? (
            <motion.div
              key="shop"
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transition}
              id="panel-shop"
              role="tabpanel"
              aria-labelledby="shop"
            >
              <FlowerShop />
            </motion.div>
          ) : (
            <motion.div
              key="garden"
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transition}
              id="panel-garden"
              role="tabpanel"
              aria-labelledby="garden"
            >
              <GardenBackyard />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
