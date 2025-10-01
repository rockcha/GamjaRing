// src/pages/FishingPage.tsx
"use client";

/**
 * FishingPage — bulk-only
 * - 모바일에서도 좌측(일괄낚시) 섹션이 보이도록 레이아웃 개선
 * - 모바일: 상단 패널 / 하단 배경 (2행)
 * - 데스크톱: 좌측 패널 / 우측 배경 (2열)
 */

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";

import IngredientFishingSection from "@/features/fishing/IngredientFishingSection";
import MarineDexModal from "@/features/aquarium/MarineDexModal";
import NewSpeciesBanner from "@/components/widgets/Cards/NewSpeciesBanner";

export default function FishingPage() {
  const { couple } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  /* 🔁 테마 */
  const [themeTitle, setThemeTitle] = useState<string>("바다");
  const nextSrc = useMemo(
    () => `/aquarium/themes/${encodeURIComponent(themeTitle)}.png`,
    [themeTitle]
  );

  const FADE_MS = 2500;
  const [currentSrc, setCurrentSrc] = useState<string>(nextSrc);
  const [prevSrc, setPrevSrc] = useState<string | null>(null);
  const [curLoaded, setCurLoaded] = useState(false);

  useEffect(() => {
    setPrevSrc(currentSrc || null);
    setCurrentSrc(nextSrc);
    setCurLoaded(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextSrc]);

  useEffect(() => {
    if (!curLoaded || !prevSrc) return;
    const t = window.setTimeout(() => setPrevSrc(null), FADE_MS);
    return () => window.clearTimeout(t);
  }, [curLoaded, prevSrc]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("aquarium_themes")
          .select("title");
        if (error) throw error;
        const titles = (data ?? [])
          .map((r: any) => r?.title)
          .filter((t: any) => typeof t === "string" && t.length > 0);
        if (!alive) return;
        setThemeTitle(
          titles.length
            ? titles[Math.floor(Math.random() * titles.length)]
            : "바다"
        );
      } catch {
        if (alive) setThemeTitle("바다");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div
      className={cn(
        // ✅ 모바일: 2행(패널, 배경) / 데스크톱: 1행 2열
        "w-full h:[calc(100vh-64px)] h-[calc(100vh-64px)] max-h-[100svh]",
        "grid grid-cols-1 grid-rows-[auto_1fr]",
        "md:grid-cols-12 md:grid-rows-1 gap-3"
      )}
    >
      {/* ✅ 모바일에서도 보이는 패널 (행 1) / 데스크톱에선 좌측 열 */}
      <aside
        className={cn(
          "flex rounded-2xl border bg-white p-3 my-2 flex-col gap-3",
          "overflow-y-auto overscroll-contain min-h-0",
          // 데스크톱에선 좌측 3칸, 모바일은 전체 폭
          "md:col-span-3"
        )}
      >
        <IngredientFishingSection />
      </aside>

      {/* 메인: 배경 (행 2) / 데스크톱에선 우측 9칸 */}
      <main
        className={cn(
          "relative rounded-2xl border overflow-hidden min-w-0 min-h-0 my-2",
          "md:col-span-9"
        )}
        aria-label="낚시 배경 영역"
      >
        {/* 플레이스홀더 → 이전 테마 → 현재 테마 */}
        <img
          src="/aquarium/fishing-placeholder.png"
          alt="fishing placeholder background"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
        {prevSrc && (
          <img
            src={prevSrc}
            alt="previous theme background"
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-opacity",
              curLoaded ? "opacity-0" : "opacity-100"
            )}
            style={{ transitionDuration: `${FADE_MS}ms` }}
            draggable={false}
          />
        )}
        <img
          key={currentSrc}
          src={currentSrc}
          alt={`theme background: ${themeTitle}`}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity",
            curLoaded ? "opacity-100" : "opacity-0"
          )}
          style={{ transitionDuration: `${FADE_MS}ms` }}
          draggable={false}
          onLoad={() => setCurLoaded(true)}
          onError={() => {
            setCurLoaded(false);
            setPrevSrc(null);
          }}
        />

        <NewSpeciesBanner />

        {/* 비네트 */}
        <div className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_60%_at_50%_40%,rgba(0,0,0,0)_0%,rgba(0,0,0,.25)_100%)] md:[background:radial-gradient(55%_65%_at_50%_35%,rgba(0,0,0,0)_0%,rgba(0,0,0,.18)_100%)]" />

        {/* 중앙 가이드 (모바일에도 그대로 노출) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[240%] z-10 pointer-events-none">
          <div className="rounded-full bg-black/40 text-white text-[11px] sm:text-xs px-3 py-1 backdrop-blur-sm">
            <b>일괄 낚시</b>를 시작하세요 🎣
          </div>
        </div>

        {/* 우상단: 도감 */}
        <div className="absolute top-2 right-2 z-20 pointer-events-auto">
          <MarineDexModal />
        </div>
      </main>
    </div>
  );
}
