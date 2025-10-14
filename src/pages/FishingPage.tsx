// src/pages/FishingPage.tsx
"use client";

/**
 * FishingPage
 * - 배경이 전체를 채움
 * - 시간대별 배경: /fishing/{morning|noon|evening|night}.png
 * - 중앙 고정 카드: "일괄 낚시 설정" (기본 접힘 → 버튼으로 열림, 카드 내부에서 접기 가능)
 * - 우하단: 미니 재료통 위젯 자리 (별도 파일)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import MarineDexModal from "@/features/aquarium/MarineDexModal";
import NewSpeciesBanner from "@/components/widgets/Cards/NewSpeciesBanner";

import { useCoupleContext } from "@/contexts/CoupleContext";
import { useUser } from "@/contexts/UserContext";
import BaitHeader from "@/features/fishing/BaitHeader";
import BulkFishingPanel from "@/features/fishing/BulkFishingPanel";
import BulkResultsModal from "@/features/fishing/BulkResultsModal";
import WaitFishingDialog from "@/features/fishing/WaitFishingDialog";
import { useBaitAndTanks } from "@/features/fishing/useBaitAndTanks";
import { useBulkFishing } from "@/features/fishing/useBulkFishing";
import { Card } from "@/components/ui/card";
import { X } from "lucide-react";

/* ───────────────── 시간대 판별 ─────────────────
   - morning: 05:00 ~ 11:59
   - noon:    12:00 ~ 17:59
   - evening: 18:00 ~ 20:30
   - night:   그 외
------------------------------------------------ */
function getTimeSegment(
  d: Date = new Date()
): "morning" | "noon" | "evening" | "night" {
  const m = d.getHours() * 60 + d.getMinutes();

  const MORNING_START = 5 * 60; // 05:00 => 300
  const MORNING_END = 11 * 60 + 59; // 11:59 => 719
  const NOON_START = 12 * 60; // 12:00 => 720
  const NOON_END = 17 * 60 + 59; // 17:59 => 1079
  const EVENING_START = 18 * 60; // 18:00 => 1080
  const EVENING_END = 20 * 60 + 30; // 20:30 => 1230

  if (m >= MORNING_START && m <= MORNING_END) return "morning";
  if (m >= NOON_START && m <= NOON_END) return "noon";
  if (m >= EVENING_START && m <= EVENING_END) return "evening";
  return "night";
}

export default function FishingPage() {
  /* ───────── 배경 이미지 (시간대별) ───────── */
  const [segment, setSegment] = useState<
    "morning" | "noon" | "evening" | "night"
  >(getTimeSegment());

  // 분 단위로 시간대 감지 → 변경 시 크로스페이드
  useEffect(() => {
    const id = window.setInterval(() => {
      const next = getTimeSegment();
      setSegment((prev) => (prev === next ? prev : next));
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const src = useMemo(() => `/fishing/${segment}.png`, [segment]);

  // 크로스페이드 상태
  const FADE_MS = 2000;
  const [currentSrc, setCurrentSrc] = useState<string>(src);
  const [prevSrc, setPrevSrc] = useState<string | null>(null);
  const [curLoaded, setCurLoaded] = useState(false);

  // segment(src) 변경 시 페이드 준비
  useEffect(() => {
    if (src === currentSrc) return;
    setPrevSrc(currentSrc || null);
    setCurrentSrc(src);
    setCurLoaded(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // 새 이미지가 로딩되면 이전 레이어 제거 타이머
  useEffect(() => {
    if (!curLoaded || !prevSrc) return;
    const t = window.setTimeout(() => setPrevSrc(null), FADE_MS);
    return () => window.clearTimeout(t);
  }, [curLoaded, prevSrc]);

  /* ───────── 중앙 고정 카드용 상태/로직 ───────── */
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

  /* ───────── 중앙 카드 접힘/펼침 ───────── */
  const [panelOpen, setPanelOpen] = useState(false);

  // ESC로 접기
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPanelOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className={cn(
        "relative w-full h-[calc(100vh-64px)] max-h-[100svh] overflow-hidden"
      )}
    >
      {/* 배경: 플레이스홀더 → 이전 → 현재 */}
      <img
        src="/aquarium/fishing-placeholder.png"
        alt="fishing placeholder background"
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      {prevSrc && (
        <img
          src={prevSrc}
          alt="previous time-based background"
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
        alt={`fishing background: ${segment}`}
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

      {/* ✅ 중앙 카드 토글 버튼 (기본 접힘) */}
      {!panelOpen && (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className={cn(
            "fixed left-1/2 top-[78%] -translate-x-1/2 -translate-y-1/2 z-30",
            "rounded-full px-4 py-2 text-sm font-medium",
            "bg-white/90 backdrop-blur-md shadow-[0_18px_60px_-20px_rgba(0,0,0,.45)]",
            "hover:bg-white transition active:scale-[0.98]"
          )}
          aria-expanded={panelOpen}
          aria-controls="bulk-fishing-card"
        >
          🎣 미끼통 꺼내기
        </button>
      )}

      {/* ✅ 중앙 고정 카드 (펼침 시) */}
      <div
        id="bulk-fishing-card"
        className={cn(
          "fixed left-1/2 top-[78%] -translate-x-1/2 -translate-y-1/2 z-30",
          "w-[76vw] max-w-[400px] sm:w-[72vw] sm:max-w-[460px] md:w-[62vw] md:max-w-[520px] lg:w-[46vw] lg:max-w-[560px]",
          // 슬라이드/페이드 애니메이션
          "transition-all duration-300",
          panelOpen
            ? "opacity-100 translate-y-[-50%] pointer-events-auto"
            : "opacity-0 translate-y-[10%] pointer-events-none"
        )}
        // role은 굳이 dialog가 아니므로 Card 컨테이너로 충분
      >
        <Card className="relative rounded-3xl border bg-white/90 backdrop-blur-md shadow-[0_24px_80px_-24px_rgba(0,0,0,0.45)] p-3 md:p-5">
          {/* 접기 버튼 */}
          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/70 hover:bg-white text-slate-600 shadow-sm transition"
            aria-label="패널 접기"
            title="접기"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="space-y-4 pt-4">
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

      {/* 결과 모달 */}
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
