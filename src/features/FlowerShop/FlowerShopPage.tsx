// src/app/flowers/FlowerShopPage.tsx
"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import FlowerShop from "./FlowerShop";
import GardenBackyard from "./GardenBackyard";

type View = "shop" | "garden";

export default function FlowerShopPage() {
  const [view, setView] = useState<View>("shop");

  /** ===== 상단 슬라이드 토글 ===== */
  const tabs = useMemo(
    () =>
      [
        { key: "shop", label: "꽃집", icon: "🌸" },
        { key: "garden", label: "뒤뜰", icon: "🪴" },
      ] as const,
    []
  );
  const activeIndex = view === "shop" ? 0 : 1;

  const handleSwitch = useCallback((next: View) => setView(next), []);

  /** ===== 콘텐츠 전환 애니메이션 ===== */
  const variants = {
    enterFromRight: { x: 40, opacity: 0, scale: 0.98 },
    center: { x: 0, opacity: 1, scale: 1 },
    exitToLeft: { x: -40, opacity: 0, scale: 0.98 },
    enterFromLeft: { x: -40, opacity: 0, scale: 0.98 },
    exitToRight: { x: 40, opacity: 0, scale: 0.98 },
  };
  const transition = { type: "spring", stiffness: 220, damping: 22, mass: 0.9 };

  /** ===== 모바일 스와이프 지원 ===== */
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    // 임계값
    if (Math.abs(dx) > 40) {
      if (dx < 0 && view === "shop")
        handleSwitch("garden"); // 왼쪽으로 스와이프 → 다음
      else if (dx > 0 && view === "garden") handleSwitch("shop"); // 오른쪽 스와이프 → 이전
    }
    touchStartX.current = null;
  };

  /** ===== 키보드 내비게이션(접근성) ===== */
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
      {/* 상단 바 */}
      <div className="mb-5 flex items-center justify-between">
        {/* 좌측 타이틀(아이콘은 활성 탭에 맞춰 변경) */}
        <div className="flex items-center gap-2">
          <span className="text-xl md:text-2xl">{tabs[activeIndex].icon}</span>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">
            {tabs[activeIndex].label}
          </h1>
        </div>

        {/* 우측: 슬라이드 토글(세그먼트) */}
        <div
          role="tablist"
          aria-label="꽃집/뒤뜰 전환"
          onKeyDown={onKeyDownTabs}
          className="relative isolate w-[260px] select-none rounded-2xl border bg-background/60 p-1 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/40"
        >
          {/* 슬라이딩 인디케이터 */}
          <motion.div
            layout
            className="absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-xl bg-primary/10"
            style={{
              left: activeIndex === 0 ? "0.25rem" : "calc(50% + 0.0rem)",
            }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 40,
              mass: 0.6,
            }}
          />
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
                  onClick={() => handleSwitch(t.key)}
                  className={[
                    "relative z-10 flex h-10 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors",
                    active
                      ? "text-primary-foreground"
                      : "text-foreground/80 hover:text-foreground",
                  ].join(" ")}
                >
                  <span aria-hidden>{t.icon}</span>
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 콘텐츠 영역 (애니메이션 + 스와이프) */}
      <div
        className="relative min-h-[60vh] overflow-hidden rounded-2xl border"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="wait" initial={false}>
          {view === "shop" ? (
            <motion.div
              key="shop"
              initial="enterFromRight"
              animate="center"
              exit="exitToLeft"
              variants={variants}
              transition={transition}
              className="absolute inset-0"
              id="panel-shop"
              role="tabpanel"
              aria-labelledby="shop"
            >
              <FlowerShop />
            </motion.div>
          ) : (
            <motion.div
              key="garden"
              initial="enterFromLeft"
              animate="center"
              exit="exitToRight"
              variants={variants}
              transition={transition}
              className="absolute inset-0"
              id="panel-garden"
              role="tabpanel"
              aria-labelledby="garden"
            >
              <GardenBackyard />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 하단 보조 네비(선택): 좌/우 버튼 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between p-2">
          <div className="pointer-events-auto">
            <Button
              size="icon"
              variant="ghost"
              aria-label="꽃집으로"
              className="rounded-full"
              onClick={() => handleSwitch("shop")}
            >
              ←
            </Button>
          </div>
          <div className="pointer-events-auto">
            <Button
              size="icon"
              variant="ghost"
              aria-label="뒤뜰로"
              className="rounded-full"
              onClick={() => handleSwitch("garden")}
            >
              →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
