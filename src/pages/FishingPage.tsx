// src/features/fishing/FishingPage.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";

import IngredientFishingSection from "@/features/fishing/IngredientFishingSection";
import MarineDexModal from "@/features/aquarium/MarineDexModal";
import { rollFishByIngredient } from "@/features/fishing/rollfish";
import { FISHES } from "@/features/aquarium/fishes";
import type { IngredientTitle } from "@/features/kitchen/type";

import {
  Sparkles,
  Fish as FishIcon,
  Share2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

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
   오버레이 문구 유틸
   ======================= */
const OVERLAY_POOL = [
  "🎣 미끼를 가볍게 던졌어요…",
  "🌊 물결이 잔잔해요…",
  "👀 찌를 뚫어져라 보는 중…",
  "🐟 작은 물고기들이 모여들어요…",
  "🫧 거품이 살짝 일었어요…",
  "✨ 운이 좋을지도…?",
  "🪝 훅 텐션 유지!",
  "🤫 숨 고르기… 조용히…",
  "⚓ 라인을 살짝 감아볼까…",
  "💨 바람 방향 체크 중…",
];

function pick3Random<T>(arr: readonly T[]): T[] {
  const pool = arr.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const ai = pool[i]!;
    const aj = pool[j]!;
    pool[i] = aj;
    pool[j] = ai;
  }
  return pool.slice(0, 3) as T[];
}
function pickOne<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/* =======================
   오버레이(랜덤 문구 3개, 1초 간격)
   ======================= */
function FishingOverlay({
  visible,
  onDone,
}: {
  visible: boolean;
  onDone: () => void;
}) {
  const [msgs, setMsgs] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;
    setMsgs(pick3Random<string>(OVERLAY_POOL));
    setIdx(0);
    setFadeKey((k) => k + 1);

    function schedule(i: number) {
      if (i < 2) {
        timerRef.current = setTimeout(() => {
          setIdx(i + 1);
          setFadeKey((k) => k + 1);
          schedule(i + 1);
        }, 1000);
      } else {
        timerRef.current = setTimeout(() => onDone(), 1000);
      }
    }
    schedule(0);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, onDone]);

  if (!visible) return null;
  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-black/30 backdrop-blur-[1px]">
      <div className="w-[min(92vw,520px)] rounded-2xl bg-white/95 shadow-xl border p-6 text-center">
        <div className="flex items-center justify-center gap-2 text-amber-700 mb-2">
          <FishIcon className="w-5 h-5" />
          <span className="text-sm font-semibold">낚시 중…</span>
        </div>
        <div
          key={fadeKey}
          className={cn(
            "text-base font-semibold transition-opacity duration-300 ease-out",
            "opacity-100 animate-in fade-in-0"
          )}
        >
          {msgs[idx]}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          잠시만 기다리면 결과가 나와요.
        </p>
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
  "💤 졸았더니 찌가… 이미 내려갔네요!",
  "🧊 손이 미끄러졌어요… 아쉽!",
  "🎏 작은 물고기만 몰려왔어요…",
];

/* =======================
   에픽/전설 전용 버스트 이펙트
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
      {/* 키프레임 등록 */}
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
              // CSS 변수로 전달
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
   결과 모달 (성공/실패 명확 강조 + 에픽/전설 이펙트)
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

function ResultModal({
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
    if (open && result?.type === "FAIL") setFailMsg(pickOne(FAIL_REASONS));
  }, [open, result?.type]);

  const share = useCallback(() => {
    toast.info("공유하기는 곧 제공될 예정이에요!");
  }, []);

  const isSuccess = result?.type === "SUCCESS";
  const bannerCls = isSuccess
    ? "bg-emerald-50 text-emerald-900 border-emerald-200"
    : "bg-rose-50 text-rose-900 border-rose-200";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">낚시 결과</DialogTitle>
        </DialogHeader>

        {/* 상태 배너 (성공/실패를 큰 아이콘과 색으로 또렷하게) */}
        <div
          className={cn(
            "mb-3 rounded-xl border px-3 py-2 font-bold flex items-center gap-2",
            bannerCls
          )}
        >
          {isSuccess ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <XCircle className="w-5 h-5" />
          )}
          {isSuccess ? "낚시 성공!" : "낚시 실패…"}
        </div>

        <div className="relative">
          {/* 에픽/전설 이펙트 */}
          {isSuccess && <RarityBurst rarity={(result as any).rarity} />}

          {/* 본문 */}
          {isSuccess ? (
            <div className="space-y-3 relative z-10">
              <div className="flex items-center gap-3">
                <img
                  src={
                    (result as any).image || "/aquarium/fish_placeholder.png"
                  }
                  alt={(result as any).labelKo}
                  className="w-20 h-20 object-contain bg-white rounded-xl border"
                  draggable={false}
                />
                <div>
                  <div className="text-lg font-bold flex items-center gap-2">
                    {(result as any).labelKo}
                    <span className="inline-flex items-center rounded-full border bg-amber-50 px-2 py-0.5 text-[11px] font-semibold">
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
              <div className="rounded-xl border bg-gradient-to-br from-sky-50 to-emerald-50 p-3 text-sm text-gray-700">
                <Sparkles className="inline-block w-4 h-4 mr-1 text-emerald-600" />
                축하해요! 새로운 해양 생물을 획득했어요.
              </div>
            </div>
          ) : (
            <div className="rounded-xl border bg-gray-50 p-4 text-center text-sm text-gray-700">
              {failMsg}
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 justify-end">
          <Button variant="outline" onClick={share}>
            <Share2 className="w-4 h-4 mr-1" />
            공유하기
          </Button>
          <Button onClick={onClose}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

  // onDone 최신화
  const onOverlayDoneRef = useRef<(() => void) | null>(null);
  const onOverlayDone = useCallback(() => {
    onOverlayDoneRef.current?.();
  }, []);

  const handleStart = useCallback(
    ({ title, emoji }: { title: IngredientTitle; emoji: string }) => {
      setResult(null);
      setOverlay(true);

      const finalize = async () => {
        setOverlay(false);

        const res = rollFishByIngredient(title);
        if (!res.ok) {
          setResult({ type: "FAIL" });
          setResultOpen(true);
          return;
        }

        const fish = FISHES.find((f) => f.id === res.fishId);
        if (!fish) {
          setResult({ type: "FAIL" });
          setResultOpen(true);
          return;
        }

        if (!coupleId) {
          toast.warning("커플 정보가 없어서 보관함에 추가하지 못했어요.");
        } else {
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
            const nextFishIds = [...prevList, fish.id];

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
                const itemName = fish.labelKo.toString();
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

        setResult({
          type: "SUCCESS",
          id: fish.id,
          labelKo: fish.labelKo,
          image: fish.image,
          rarity: fish.rarity,
          ingredient: `${emoji} ${title}`,
        });
        setResultOpen(true);
      };

      onOverlayDoneRef.current = () => {
        void finalize();
      };
    },
    [coupleId, fetchCoupleData, user?.id, user?.partner_id]
  );

  return (
    <div className="w-full h-[calc(100vh-64px)] max-h-[100svh] grid grid-cols-12 gap-3">
      {/* 좌측: 재료 선택/시작 */}
      <aside className="col-span-12 md:col-span-3 xl:col-span-3 rounded-2xl border bg-white p-3 flex flex-col gap-3">
        <IngredientFishingSection onStart={handleStart} />
      </aside>

      {/* 중앙: 배경 & 오버레이 */}
      <main className="relative col-span-12 md:col-span-6 xl:col-span-6 rounded-2xl border overflow-hidden">
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

        <FishingOverlay visible={overlay} onDone={onOverlayDone} />
      </main>

      {/* 우측: 해양도감 (Ocean 모드) */}
      <aside className="col-span-12 md:col-span-3 xl:col-span-3 rounded-2xl border bg-white p-3">
        <h3 className="text-sm font-semibold text-zinc-800 mb-2">해양 도감</h3>
        <MarineDexModal isOcean />
      </aside>

      {/* 결과 모달 */}
      <ResultModal
        open={resultOpen}
        result={result}
        onClose={() => setResultOpen(false)}
      />
    </div>
  );
}
