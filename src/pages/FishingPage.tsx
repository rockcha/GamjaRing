// src/features/fishing/FishingPage.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";

import IngredientFishingSection from "@/features/fishing/IngredientFishingSection";
import MarineDexModal from "@/features/aquarium/MarineDexModal";
import { rollFishByIngredient } from "@/features/fishing/rollfish";
import { FISHES } from "@/features/aquarium/fishes";
import { consumeIngredients } from "@/features/kitchen/kitchenApi";
import type { IngredientTitle } from "@/features/kitchen/type";

import {
  Sparkles,
  Fish as FishIcon,
  Share2,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";

/* =======================
   DnD MIME
   ======================= */
const DND_MIME = "application/x-ingredient";

/* =======================
   시간대별 배경
   ======================= */
type TimeSlot = "morning" | "noon" | "evening" | "night";
function getTimeSlot(d: Date): TimeSlot {
  const hh = d.getHours();
  const mm = d.getMinutes();
  if ((hh > 5 && hh < 11) || (hh === 5 && mm >= 0) || (hh === 11 && mm === 0))
    return "morning";
  if ((hh > 11 && hh < 17) || (hh === 11 && mm >= 1) || (hh === 17 && mm === 0))
    return "noon";
  if ((hh > 17 && hh < 20) || (hh === 17 && mm >= 1) || (hh === 20 && mm <= 30))
    return "evening";
  return "night";
}
function bgSrcBySlot(slot: TimeSlot) {
  switch (slot) {
    case "morning":
      return "/aquarium/fishing_morning.png";
    case "noon":
      return "/aquarium/fishing_noon.png";
    case "evening":
      return "/aquarium/fishing_evening.png";
    case "night":
    default:
      return "/aquarium/fishing_night.png";
  }
}
function slotLabel(slot: TimeSlot) {
  return slot === "morning"
    ? "아침"
    : slot === "noon"
    ? "낮"
    : slot === "evening"
    ? "저녁"
    : "밤";
}

/* =======================
   낚시중 오버레이 (프로그레스바 포함)
   ======================= */
const FISHING_TIPS = [
  "바람 방향 파악 중…",
  "낚시대 높이 조절 중…",
  "갈매기 새우깡 주는 중…",
  "하염없이 기다리는 중…",
  "파도소리 듣는 중…",
];

function msToSec(ms: number) {
  return Math.max(0, Math.ceil(ms / 1000));
}

function FishingOverlay({
  visible,
  progress, // 0 ~ 1
  remainMs,
}: {
  visible: boolean;
  progress: number;
  remainMs: number;
}) {
  const tipRef = useRef<string>("");

  useEffect(() => {
    if (visible) {
      const idx = Math.floor(Math.random() * FISHING_TIPS.length);
      tipRef.current = FISHING_TIPS[idx] ?? "상황 파악 중…";
    }
  }, [visible]);

  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[1000] grid place-items-center bg-black/25 backdrop-blur-[2px]">
      <div className="w-[min(92vw,520px)] max-h-[80vh] overflow-auto rounded-2xl bg-white backdrop-blur border p-6 text-center shadow-xl">
        <div className="flex items-center justify-center gap-2 text-amber-700 mb-3">
          <FishIcon className="w-5 h-5" />
          <span className="text-sm font-semibold">
            {tipRef.current || "상황 파악 중…"}
          </span>
        </div>

        <img
          src="/aquarium/fishing.gif"
          alt="낚시 중 애니메이션"
          className="mx-auto w-40 h-40 object-contain rounded-md mb-4"
          draggable={false}
        />

        {/* 진행도 */}
        <div className="text-xs text-gray-600 mb-1">
          오래 걸릴수록 희귀한 물고기를 잡기도 해요 ✨
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          className="w-full h-3 bg-gray-100 rounded-full border relative overflow-hidden"
        >
          <div
            className="h-full bg-emerald-500 transition-[width] duration-150 ease-linear"
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-gray-700">
          남은 시간: <span className="font-semibold">{msToSec(remainMs)}</span>
          초
        </div>
      </div>
    </div>
  );
}

/* =======================
   실패 랜덤 멘트
   ======================= */
const FAIL_REASONS = [
  "🪝 낚시바늘이 빠져버렸어요!",
  "🐟 큰 녀석이 줄을 끊고 도망쳤어요!",
  "🫧 미끼만 홀라당 사라졌어요!",
  "🌊 갑작스런 파도에 라인이 휙—",
  "😵 한눈판 사이에 놓쳤어요!",
  "💤 깜빡 졸아버렸어요 ㅠ",
  "🧊 손이 미끄러졌어요… 아쉽!",
  "🎏 새끼들은 돌려보냈어요",
];

/* =======================
   에픽/전설 버스트
   ======================= */
function RarityBurst({ rarity }: { rarity: string }) {
  const isEpic = rarity === "에픽";
  const isLegend = rarity === "전설";
  if (!isEpic && !isLegend) return null;

  const icons = isLegend
    ? ["✨", "🌟", "💎", "🎉", "🐠", "👑"]
    : ["✨", "🌟", "🎉", "🐠"];
  const count = isLegend ? 36 : 24;

  const parts = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const dist =
          (isLegend ? 120 : 90) + Math.random() * (isLegend ? 60 : 40);
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        const scale = 0.8 + Math.random() * 1.4;
        const rot = (Math.random() * 360).toFixed(0);
        const delay = Math.random() * 120;
        const char = icons[Math.floor(Math.random() * icons.length)];
        return { id: i, dx, dy, scale, rot, delay, char };
      }),
    [count, icons, isLegend]
  );

  return (
    <div className="pointer-events-none absolute inset-0">
      <style>{`
        @keyframes rarity-burst {
          0%   { opacity: 0; transform: translate(-50%,-50%) scale(0.6) rotate(0deg); }
          10%  { opacity: 1; }
          100% { opacity: 0; transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(var(--scale)) rotate(var(--rot)); }
        }
      `}</style>
      {parts.map((p) => (
        <span
          key={p.id}
          className="absolute left-1/2 top-1/2 text-2xl"
          style={
            {
              transform: "translate(-50%,-50%)",
              animation: `rarity-burst ${isLegend ? 1100 : 900}ms ease-out ${
                p.delay
              }ms forwards`,
              ["--dx" as any]: `${p.dx}px`,
              ["--dy" as any]: `${p.dy}px`,
              ["--scale" as any]: p.scale.toString(),
              ["--rot" as any]: `${p.rot}deg`,
            } as React.CSSProperties
          }
        >
          {p.char}
        </span>
      ))}
    </div>
  );
}

/* =======================
   결과 패널
   ======================= */
type FishResult =
  | { type: "FAIL" }
  | {
      type: "SUCCESS";
      id: string;
      labelKo: string;
      image: string;
      rarity: string;
      ingredient?: string | null;
    };

function ResultPanel({
  open,
  result,
  onClose,
}: {
  open: boolean;
  result: FishResult | null;
  onClose: () => void;
}) {
  const [failMsg, setFailMsg] = useState<string>("");

  useEffect(() => {
    if (open && result?.type === "FAIL") {
      const i = Math.floor(Math.random() * FAIL_REASONS.length);
      setFailMsg(FAIL_REASONS[i] ?? "아쉽! 다음엔 꼭 잡자 🎣");
    }
  }, [open, result?.type]);

  if (!open) return null;

  const isSuccess = result?.type === "SUCCESS";
  const chipCls = isSuccess
    ? "bg-emerald-100 text-emerald-900 border-emerald-200"
    : "bg-rose-100 text-rose-900 border-rose-200";

  return (
    <div className="fixed inset-0 z-[1000] grid place-items-center bg-black/25 backdrop-blur-[2px]">
      <div className="relative w-[min(92vw,520px)] max-h-[80vh] overflow-auto rounded-2xl bg-white border shadow-xl p-4">
        <button
          onClick={onClose}
          className="absolute right-2 top-2 p-1 rounded-md hover:bg-gray-100 text-gray-600"
          aria-label="닫기"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-4 flex items-center justify-center">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-sm font-semibold",
              chipCls
            )}
          >
            {isSuccess ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <XCircle className="w-4 h-4" />
            )}
            <span>{isSuccess ? "낚시 성공" : "낚시 실패"}</span>
          </span>
        </div>

        <div className="relative">
          {isSuccess && <RarityBurst rarity={(result as any).rarity} />}

          {isSuccess ? (
            <div className="space-y-3 relative z-10">
              <div className="flex items-center gap-3">
                <img
                  src={
                    (result as any).image || "/aquarium/fish_placeholder.png"
                  }
                  alt={(result as any).labelKo}
                  className="w-20 h-20 object-contain"
                  draggable={false}
                />
                <div>
                  <div className="text-lg font-bold flex items-center gap-2">
                    {(result as any).labelKo}
                    <span className="inline-flex items-center rounded-lg border bg-amber-50 px-2 py-0.5 text-[11px] font-semibold">
                      {(result as any).rarity}
                    </span>
                  </div>
                  {(result as any).ingredient && (
                    <p className="text-sm text-gray-600 mt-0.5">
                      사용 재료: {(result as any).ingredient}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-700">
                <Sparkles className="inline-block w-4 h-4 mr-1 text-emerald-600" />
                축하해요! 새로운 해양 생물을 획득했어요.
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-base text-gray-700">
              {failMsg}
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2 justify-end">
          <button
            onClick={() => toast.info("공유하기는 곧 제공될 예정이에요!")}
            className="rounded-md bg-sky-600 text-white px-3 py-1.5 text-sm hover:bg-sky-700 inline-flex items-center"
          >
            <Share2 className="w-4 h-4 mr-1" />
            공유하기
          </button>
          <button
            onClick={onClose}
            className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

/* =======================
   메인 페이지
   ======================= */
export default function FishingPage() {
  const [slot, setSlot] = useState<TimeSlot>(() => getTimeSlot(new Date()));
  useEffect(() => {
    const id = window.setInterval(
      () => setSlot(getTimeSlot(new Date())),
      30_000
    );
    return () => window.clearInterval(id);
  }, []);
  const bg = bgSrcBySlot(slot);

  const { user } = useUser();
  const { couple, fetchCoupleData } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  const [overlay, setOverlay] = useState(false);
  const [result, setResult] = useState<FishResult | null>(null);
  const [resultOpen, setResultOpen] = useState(false);

  // 진행 상태
  const [overlayProgress, setOverlayProgress] = useState(0); // 0~1
  const [overlayRemainMs, setOverlayRemainMs] = useState(0);
  const progressTimerRef = useRef<number | null>(null);
  const overlayStartRef = useRef<number>(0);
  const overlayDurationRef = useRef<number>(0);

  // 드롭 하이라이트
  const [dragOver, setDragOver] = useState(false);

  // 배경 드롭 핸들러들
  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      if (overlay) return;
      if (e.dataTransfer.types.includes(DND_MIME)) {
        e.preventDefault();
        setDragOver(true);
      }
    },
    [overlay]
  );
  const onDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (overlay) return;
      if (e.dataTransfer.types.includes(DND_MIME)) setDragOver(true);
    },
    [overlay]
  );
  const onDragLeave = useCallback(() => setDragOver(false), []);

  // ⏱️ 희귀도별 대기시간
  function durationByRarity(rarity: string | null): number {
    if (rarity === "전설") return 30_000;
    if (rarity === "에픽") return 15_000;
    if (rarity === "레어") return 8_000;
    return 5_000; // 그 외/실패 최소 5초
    // 필요 시 "언커먼/커먼" 등도 5초로 흡수
  }

  // 진행 타이머 시작/정지
  const startProgressTimer = useCallback((durationMs: number) => {
    overlayStartRef.current = performance.now();
    overlayDurationRef.current = durationMs;

    const tick = () => {
      const now = performance.now();
      const elapsed = now - overlayStartRef.current;
      const remain = Math.max(0, durationMs - elapsed);
      const p = Math.min(1, elapsed / durationMs);
      setOverlayProgress(p);
      setOverlayRemainMs(remain);
      if (p < 1) {
        progressTimerRef.current = window.requestAnimationFrame(tick);
      }
    };
    // 초기화
    setOverlayProgress(0);
    setOverlayRemainMs(durationMs);
    if (progressTimerRef.current) {
      window.cancelAnimationFrame(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    progressTimerRef.current = window.requestAnimationFrame(tick);
  }, []);

  const stopProgressTimer = useCallback(() => {
    if (progressTimerRef.current) {
      window.cancelAnimationFrame(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      setDragOver(false);
      if (overlay) return;

      const raw = e.dataTransfer.getData(DND_MIME);
      if (!raw) return;

      e.preventDefault();
      let payload: { title: IngredientTitle; emoji: string } | null = null;
      try {
        payload = JSON.parse(raw);
      } catch {
        return;
      }
      if (!payload) return;

      // 오버레이 시작 (우선 열어두고 실제 duration은 결과 계산 후 결정)
      setOverlay(true);

      try {
        // 재료 차감
        if (coupleId) {
          await consumeIngredients(coupleId, { [payload.title]: 1 } as Record<
            IngredientTitle,
            number
          >);
          window.dispatchEvent(
            new CustomEvent("ingredient-consumed", {
              detail: { title: payload.title },
            })
          );
        }

        // 결과 계산
        const res = rollFishByIngredient(payload.title);
        let computed: FishResult;
        let fishObj: (typeof FISHES)[number] | null = null;

        if (!res.ok) {
          computed = { type: "FAIL" };
        } else {
          fishObj = FISHES.find((f) => f.id === res.fishId) || null;
          if (!fishObj) {
            computed = { type: "FAIL" };
          } else {
            computed = {
              type: "SUCCESS",
              id: fishObj.id,
              labelKo: fishObj.labelKo,
              image: fishObj.image,
              rarity: fishObj.rarity,
              ingredient: `${payload.emoji} ${payload.title}`,
            };
          }
        }

        // 희귀도에 따른 대기시간 확정 후 진행바 가동
        const rarity = computed.type === "SUCCESS" ? computed.rarity : null;
        const durationMs = durationByRarity(rarity ?? null);
        startProgressTimer(durationMs);

        // duration 만큼 대기
        await new Promise((r) => setTimeout(r, durationMs));
        stopProgressTimer();

        // 오버레이 종료 + 결과 표시
        setOverlay(false);
        setResult(computed);
        setResultOpen(true);

        // 저장/알림은 성공시에만 처리
        if (computed.type === "SUCCESS" && fishObj && coupleId) {
          try {
            const { data: row, error: selErr } = await supabase
              .from("couple_aquarium")
              .select("aquarium_fishes")
              .eq("couple_id", coupleId)
              .maybeSingle();
            if (selErr) throw selErr;

            const prevList: string[] = Array.isArray(row?.aquarium_fishes)
              ? (row!.aquarium_fishes as string[])
              : [];
            const nextFishIds = [...prevList, fishObj.id];

            const { error: upErr } = await supabase
              .from("couple_aquarium")
              .upsert(
                { couple_id: coupleId, aquarium_fishes: nextFishIds },
                { onConflict: "couple_id" }
              );

            if (upErr) {
              toast.warning(`결과 저장 실패: ${upErr.message}`);
            } else {
              try {
                const itemName = fishObj.labelKo.toString();
                if (user?.id && user?.partner_id) {
                  await sendUserNotification({
                    senderId: user.id,
                    receiverId: user.partner_id,
                    type: "낚시성공",
                    itemName,
                  } as any);
                }
              } catch (e) {
                console.warn("알림 전송 실패(무시 가능):", e);
              }
              await fetchCoupleData?.();
            }
          } catch (e: any) {
            console.warn("낚시 결과 저장 중 오류:", e?.message ?? e);
            toast.warning("결과 저장 중 오류가 발생했어요.");
          }
        }
      } catch (err: any) {
        stopProgressTimer();
        setOverlay(false);
        toast.error(err?.message ?? "낚시 처리 중 오류가 발생했어요.");
      }
    },
    [
      overlay,
      coupleId,
      fetchCoupleData,
      user?.id,
      user?.partner_id,
      startProgressTimer,
      stopProgressTimer,
    ]
  );

  useEffect(() => {
    return () => {
      // 언마운트 시 타이머 정리
      if (progressTimerRef.current)
        cancelAnimationFrame(progressTimerRef.current);
    };
  }, []);

  return (
    <div className="w-full h-[calc(100vh-64px)] max-h-[100svh] grid grid-cols-12 gap-3">
      {/* 좌측: 재료 (낚시 중에는 드래그 비활성) */}
      <aside className="col-span-12 md:col-span-3 xl:col-span-3 rounded-2xl border bg-white p-3 flex flex-col gap-3">
        <IngredientFishingSection dragDisabled={overlay} />
      </aside>

      {/* 중앙: 배경 & 드롭존 & 도감 버튼 */}
      <main
        className={cn(
          "relative col-span-12 md:col-span-9 xl:col-span-9 rounded-2xl border overflow-hidden"
        )}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <img
          src={bg}
          alt="fishing background"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* 상단 중앙 시간대 배지 */}
        <div className="relative z-10 h-full pointer-events-none">
          <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-black/35 text-white text-xs px-3 py-1 backdrop-blur-sm">
            현재 시간대: {slotLabel(slot)}
          </div>
        </div>

        {/* 우상단: 도감 아이콘 */}
        <div className="absolute top-3 right-3 z-20 pointer-events-auto">
          <MarineDexModal isOcean />
        </div>

        {/* 드롭 가이드 */}
        {!overlay && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <div className="text-xs px-3 py-1 rounded-full border shadow backdrop-blur-sm text-center bg-white/70 border-white/80 text-gray-700">
              {dragOver ? (
                <>놓으면 바로 낚시 시작! 🎣</>
              ) : (
                <>
                  재료를 이곳에 드래그해서 <br />
                  낚시를 시작하세요 🎣
                </>
              )}
            </div>
          </div>
        )}

        {/* 낚시중 오버레이 (프로그레스바) */}
        <FishingOverlay
          visible={overlay}
          progress={overlayProgress}
          remainMs={overlayRemainMs}
        />

        {/* 결과 패널 */}
        <ResultPanel
          open={resultOpen}
          result={result}
          onClose={() => setResultOpen(false)}
        />
      </main>
    </div>
  );
}
