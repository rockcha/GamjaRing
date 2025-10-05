// src/pages/FishingPage.tsx
"use client";

/**
 * FishingPage
 * - 배경이 전체를 채움
 * - 중앙 고정 카드: "일괄 낚시 설정" (Dialog → Card로 전환)
 * - 우하단: 미니 재료통 위젯(퀵-낚시)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import supabase from "@/lib/supabase";
import MarineDexModal from "@/features/aquarium/MarineDexModal";
import NewSpeciesBanner from "@/components/widgets/Cards/NewSpeciesBanner";
import IngredientFishingSection from "@/features/fishing/IngredientFishingSection";

import { useCoupleContext } from "@/contexts/CoupleContext";
import { useUser } from "@/contexts/UserContext";
import BaitHeader from "@/features/fishing/BaitHeader";
import BulkFishingPanel from "@/features/fishing/BulkFishingPanel";
import BulkResultsModal from "@/features/fishing/BulkResultsModal";
import WaitFishingDialog from "@/features/fishing/WaitFishingDialog";
import { useBaitAndTanks } from "@/features/fishing/useBaitAndTanks";
import { useBulkFishing } from "@/features/fishing/useBulkFishing";
import { Card } from "@/components/ui/card";

export default function FishingPage() {
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

  /* ───────── 중앙 고정 카드용 상태/로직 (Dialog → Card) ───────── */
  const { couple, fetchCoupleData } = useCoupleContext();
  const { user } = useUser();
  const coupleId = couple?.id ?? null;

  const {
    loading,
    baitCount,
    unitPrice,
    tanks,
    tanksErr,
    reload,
    setBaitCount,
    buyBait,
  } = useBaitAndTanks(coupleId, fetchCoupleData);

  const bulk = useBulkFishing({
    coupleId,
    userId: user?.id,
    partnerId: user?.partner_id,
    baitCount,
    setBaitCount,
    tanks,
    fetchCoupleData,
  });

  // defaultTank 보정
  const lastTankNo = useMemo(
    () => (tanks.length ? tanks[tanks.length - 1].tank_no : 1),
    [tanks]
  );

  // 5초 대기 → 실행
  const [waitOpen, setWaitOpen] = useState(false);
  const [waitPhase, setWaitPhase] = useState<"waiting" | "finishing">(
    "waiting"
  );
  const lockRef = useRef(false);

  async function handleRunWithDelay(countSnapshot: number) {
    if (lockRef.current) return;
    if (!baitCount || baitCount <= 0) return;

    lockRef.current = true;
    setWaitPhase("waiting");
    setWaitOpen(true);

    await new Promise((r) => setTimeout(r, 5000));

    setWaitPhase("finishing");
    try {
      await bulk.run({ count: countSnapshot });
    } finally {
      setWaitOpen(false);
      lockRef.current = false;
    }
  }

  return (
    <div
      className={cn(
        "relative w-full h-[calc(100vh-64px)] max-h-[100svh] overflow-hidden"
      )}
    >
      {/* 배경: 플레이스홀더 → 이전 테마 → 현재 테마 */}
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

      {/* 신규 어종 배너 / 도감 버튼 */}
      <NewSpeciesBanner />
      <div className="absolute top-2 right-2 z-20 pointer-events-auto">
        <MarineDexModal />
      </div>

      {/* 비네트 */}
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_60%_at_50%_40%,rgba(0,0,0,0)_0%,rgba(0,0,0,.25)_100%)] md:[background:radial-gradient(55%_65%_at_50%_35%,rgba(0,0,0,0)_0%,rgba(0,0,0,.18)_100%)]" />

      {/* ✅ 중앙 고정 카드 (Dialog 대체) */}
      <div
        className={cn(
          "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30",
          "w-[min(92vw,560px)]"
        )}
      >
        <Card className="rounded-3xl border bg-white/90 backdrop-blur-md shadow-[0_24px_80px_-24px_rgba(0,0,0,0.45)] p-4 md:p-6">
          <div className="mb-3 md:mb-4">
            <h2 className="text-xs md:text-sm text-muted-foreground mt-1">
              미끼 구매 · 일괄 낚시 실행 · 탱크 배정
            </h2>
          </div>

          <div className="space-y-4">
            {/* 상단: 미끼 잔량/구매 */}
            <BaitHeader
              loading={loading}
              baitCount={baitCount}
              unitPrice={unitPrice}
              coupleId={coupleId}
              onBuy={async (count) => {
                if (!coupleId) return null;
                const row = await buyBait(coupleId, count);
                const left = row?.bait_count ?? 0;
                setBaitCount(left);
                await reload();
                return row;
              }}
            />

            {/* 본문: 일괄 낚시 패널 */}
            <BulkFishingPanel
              baitCount={baitCount}
              bulkCount={bulk.bulkCount}
              setBulkCount={bulk.setBulkCount}
              busy={bulk.busy || waitOpen}
              onRun={async (c) => {
                await handleRunWithDelay(c);
              }}
              tanksErr={tanksErr}
            />
          </div>
        </Card>
      </div>

      {/* 결과 모달 (중앙 카드에서 실행한 결과) */}
      <BulkResultsModal
        open={bulk.open}
        setOpen={bulk.setOpen}
        results={bulk.results}
        placements={bulk.placements}
        setPlacements={(u) =>
          bulk.setPlacements(typeof u === "function" ? u : () => u)
        }
        tanks={tanks}
        defaultTank={lastTankNo}
        totalCaught={bulk.totalCaught}
        failCount={bulk.failCount}
        busy={bulk.busy}
        onSave={bulk.savePlacements}
      />

      {/* 대기 다이얼로그 */}
      <WaitFishingDialog open={waitOpen} phase={waitPhase} />
    </div>
  );
}
