"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  PanelBottomOpen,
  Eraser,
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
   알고 계셨나요?
   ======================= */
const OCEAN_TRIVIA = [
  "옛사람들은 깊은 바다 어딘가에 용왕이 살며 바다의 날씨를 주관한다고 믿었대요.",
  "용궁 전설 속에는 물고기와 인간이 서로 말을 주고받는 장면이 자주 등장하죠.",
  "해초 숲은 작은 생물들의 ‘유치원’—수많은 어린 물고기들이 이곳에서 자라요.",
  "고래의 노래는 아주 먼 거리까지 퍼져 같은 무리끼리 소식을 전한다고 전해요.",
  "산호는 바위가 아니라 살아있는 동물 군체—폴립들이 모여 거대한 도시를 만들죠.",
  "옛 항해사들은 별자리뿐 아니라 파도 결을 읽어 항로를 찾기도 했대요.",
  "바닷속 동굴에는 스스로 빛을 내는 생물들이 있어, 별빛 같은 풍경을 만든대요.",
  "전설에 따르면 해마는 바다의 전령—사람들의 소원을 용궁까지 전했다고 해요.",
  "밤의 바다에서는 미세한 플랑크톤이 빛을 내 파도가 반짝이는 듯 보이죠.",
  "거대한 해류는 바다의 고속도로—생명과 영양분을 전 지구에 실어 나릅니다.",
  "해달은 조개를 먹을 때 늘 들고 다니는 ‘단골 돌멩이’가 있다고 전해져요.",
  "용궁의 보물 상자에는 바다의 색을 닮은 진주가 가득했다는 이야기가 있죠.",
  "고대 어민들은 바다거북이 나타나면 날씨가 바뀐다고 점쳤다고 해요.",
  "난파선 주변은 작은 생물들의 쉼터—시간이 지나면 새로운 ‘인공 암초’가 돼요.",
  "깊은 심해에는 태양 대신 지열이 비추는 세계—열수구의 신비가 숨겨져요.",
];

/* =======================
   낚시중 오버레이
   ======================= */
function FishingOverlay({ visible }: { visible: boolean }) {
  const [text, setText] = useState<string>("바다의 숨결을 듣는 중…");

  useEffect(() => {
    if (!visible) return;
    const pick = () =>
      setText(OCEAN_TRIVIA[Math.floor(Math.random() * OCEAN_TRIVIA.length)]!);
    pick();
    const id = window.setInterval(pick, 3000);
    return () => window.clearInterval(id);
  }, [visible]);

  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-[1000] grid place-items-center bg-black/25 backdrop-blur-[2px]">
      <div className="w-[min(92vw,520px)] max-h-[80vh] overflow-auto rounded-2xl bg-white backdrop-blur border p-6 text-center shadow-xl">
        <div className="flex items-center justify-center gap-2 text-amber-700 mb-3">
          <FishIcon className="w-5 h-5" />
          <span className="text-sm font-semibold">낚시 중…</span>
        </div>

        <img
          src="/aquarium/fishing.gif"
          alt="낚시 중 애니메이션"
          className="mx-auto w-40 h-40 object-contain rounded-md mb-4"
          draggable={false}
        />

        <div className="mt-1 text-sm text-gray-900 text-center">
          <div className="font-semibold mb-1">알고 계셨나요?</div>
          <div className="text-gray-800">{text}</div>
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
            <div className="space-y-3 relative z-10 text-center flex flex-col items-center">
              <img
                src={(result as any).image || "/aquarium/fish_placeholder.png"}
                alt={(result as any).labelKo}
                className="w-24 h-24 object-contain"
                draggable={false}
              />
              <div className="text-lg font-bold inline-flex items-center gap-2 justify-center">
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

  // 드롭 하이라이트
  const [dragOver, setDragOver] = useState(false);

  // ✅ 모바일: 재료 하단 시트 열기/닫기
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // ✅ 모바일: 선택된 재료 (이 칩에서 드래그 가능)
  const [selectedIngredient, setSelectedIngredient] = useState<{
    title: IngredientTitle;
    emoji: string;
  } | null>(null);

  // IngredientFishingSection → (선택) → 모바일 시트 닫고 칩에 세팅
  const handlePickIngredient = useCallback(
    (payload: { title: IngredientTitle; emoji: string }) => {
      setSelectedIngredient(payload);
      setMobileSheetOpen(false);
      toast.success(`재료 선택: ${payload.emoji} ${payload.title}`);
    },
    []
  );

  // 🔁 Fallback: 섹션에서 커스텀 이벤트로 알려줄 수도 있음
  useEffect(() => {
    const onPicked = (e: Event) => {
      const detail = (e as CustomEvent)?.detail as
        | { title: IngredientTitle; emoji: string }
        | undefined;
      if (!detail) return;
      handlePickIngredient(detail);
    };
    window.addEventListener("ingredient-picked", onPicked as EventListener);
    return () =>
      window.removeEventListener(
        "ingredient-picked",
        onPicked as EventListener
      );
  }, [handlePickIngredient]);

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
  }

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

      // 오버레이 시작
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

        // 희귀도에 따른 대기시간만 유지
        const rarity = computed.type === "SUCCESS" ? computed.rarity : null;
        const durationMs = durationByRarity(rarity ?? null);

        // 대기
        await new Promise((r) => setTimeout(r, durationMs));

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
        setOverlay(false);
        toast.error(err?.message ?? "낚시 처리 중 오류가 발생했어요.");
      }
    },
    [overlay, coupleId, fetchCoupleData, user?.id, user?.partner_id]
  );

  /* =======================
     레이아웃
     ======================= */
  return (
    <div
      className={cn(
        "w-full h:[calc(100vh-64px)] h-[calc(100vh-64px)] max-h-[100svh]",
        "grid grid-cols-1 grid-rows-1",
        "md:grid-cols-12 md:grid-rows-1 gap-3"
      )}
    >
      {/* 데스크탑 전용: 좌측 재료 패널 */}
      <aside
        className={cn(
          "hidden md:flex",
          "col-span-3 rounded-2xl border bg-white p-3 flex-col gap-3",
          "overflow-y-auto overscroll-contain min-h-0"
        )}
      >
        {/* 데스크탑에서는 기존 드래그 UX 유지 */}
        <IngredientFishingSection dragDisabled={overlay} />
      </aside>

      {/* 메인 낚시터 */}
      <main
        className={cn(
          "col-span-1 md:col-span-9 relative rounded-2xl border overflow-hidden min-w-0 min-h-0"
        )}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* 배경 이미지 */}
        <img
          src={bg}
          alt="fishing background"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* 비네트 */}
        <div className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_60%_at_50%_40%,rgba(0,0,0,0)_0%,rgba(0,0,0,.25)_100%)] md:[background:radial-gradient(55%_65%_at_50%_35%,rgba(0,0,0,0)_0%,rgba(0,0,0,.18)_100%)]" />

        {/* 상단 중앙 시간대 배지 */}
        <div className="relative z-10 h-full pointer-events-none">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 rounded-full bg-black/35 text-white text-[10px] sm:text-xs px-2.5 py-1 backdrop-blur-sm">
            현재 시간대: {slotLabel(slot)}
          </div>
        </div>

        {/* 우상단: 도감 */}
        <div className="absolute top-2 right-2 z-20 pointer-events-auto">
          <MarineDexModal isOcean />
        </div>

        {/* 좌상단: 모바일 하단 시트 열기 */}
        <button
          type="button"
          onClick={() => setMobileSheetOpen(true)}
          className="md:hidden absolute left-2 top-2 z-20 inline-flex items-center gap-1
                     rounded-full bg-white/80 border border-white/90 px-2.5 py-1 text-[11px]
                     shadow-sm backdrop-blur hover:bg-white"
          aria-label="재료 패널 열기"
        >
          <PanelBottomOpen className="w-3.5 h-3.5" />
          재료 열기
        </button>

        {/* 드롭 가이드 */}
        {!overlay && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <div
              className={cn(
                "text-[11px] sm:text-xs px-3 py-1 rounded-full border shadow",
                "backdrop-blur-sm text-center bg-white/70 border-white/80 text-gray-700",
                dragOver && "ring-2 ring-sky-300 bg-white/85"
              )}
            >
              재료를 이곳에 드래그해서 <br />
              낚시를 시작하세요 🎣
            </div>
          </div>
        )}

        {/* 오버레이 / 결과 패널 */}
        <FishingOverlay visible={overlay} />
        <ResultPanel
          open={resultOpen}
          result={result}
          onClose={() => setResultOpen(false)}
        />

        {/* ✅ 모바일 전용: 선택된 재료 드래그 칩 */}
        <MobileSelectedIngredientChip selected={selectedIngredient} />
      </main>

      {/* ✅ 모바일 하단 시트: 재료 패널 (선택 시 칩으로 이동) */}
      <MobileIngredientSheet
        open={mobileSheetOpen}
        onClose={() => setMobileSheetOpen(false)}
        onPick={handlePickIngredient}
        overlay={overlay}
      />
    </div>
  );
}

/* =======================
   하위 컴포넌트: 모바일 하단 시트
   ======================= */
function MobileIngredientSheet({
  open,
  onClose,
  onPick,
  overlay,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (payload: { title: IngredientTitle; emoji: string }) => void;
  overlay: boolean;
}) {
  return (
    <div
      className={cn(
        "md:hidden fixed left-0 right-0 z-[60]",
        open ? "bottom-0" : "-bottom-[70vh]",
        "transition-all duration-300 ease-out"
      )}
      style={{ height: "68vh" }}
      aria-hidden={!open}
    >
      {/* 암막 클릭 → 닫기 */}
      <button
        className={cn(
          "absolute inset-0 -top-[32vh] bg-black/30 backdrop-blur-[1px] transition-opacity",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-label="재료 패널 닫기"
      />
      <div className="relative h-full rounded-t-2xl border-t border-x bg-white shadow-xl overflow-hidden">
        {/* 핸들바 */}
        <div className="py-2 grid place-items-center border-b bg-white/90 sticky top-0 z-10">
          <div className="h-1.5 w-10 rounded-full bg-gray-300" />
        </div>

        <div className="h-[calc(100%-40px)] overflow-y-auto p-3">
          {/* ✅ onPick을 내려서 '클릭 선택' → 칩 세팅 */}
          <IngredientFishingSection
            dragDisabled={overlay}
            // @ts-expect-error: 섹션에 onPick을 추가 구현하면 타입 맞음. (미구현이어도 무시됨)
            onPick={(p: { title: IngredientTitle; emoji: string }) => onPick(p)}
          />
          {/* Fallback 설명 */}
          <p className="mt-2 text-[11px] text-gray-500">
            항목을 탭하면 선택됩니다. 선택 후 화면에 떠있는 “재료선택” 칩에서
            드래그하세요.
          </p>
        </div>

        <button
          onClick={onClose}
          className="absolute right-3 top-2 p-2 rounded-md hover:bg-gray-100 text-gray-600"
          aria-label="닫기"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* =======================
   하위 컴포넌트: 모바일 드래그 칩
   ======================= */
function MobileSelectedIngredientChip({
  selected,
}: {
  selected: { title: IngredientTitle; emoji: string } | null;
}) {
  // 드래그 시작 시 MIME에 실어 보내기
  const onDragStart = (e: React.DragEvent) => {
    if (!selected) return;
    e.dataTransfer.setData(DND_MIME, JSON.stringify(selected));
    // iOS 대응: 프리뷰 이미지가 없으면 드래그가 잘 안 보이는 경우가 있어 투명 캔버스로 대체
    const img = new Image();
    img.src =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGP4BwQACfsD/aiJli0AAAAASUVORK5CYII=";
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  return (
    <div className="md:hidden pointer-events-none">
      <div className="absolute left-2 bottom-2 z-20">
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full border bg-white/85 backdrop-blur px-3 py-1.5 shadow",
            "pointer-events-auto"
          )}
          draggable={!!selected}
          onDragStart={onDragStart}
          aria-label="선택된 재료"
          title={
            selected
              ? `드래그해서 낚시 시작: ${selected.emoji} ${selected.title}`
              : "재료를 선택하세요"
          }
          role="button"
        >
          <span className="text-[11px] text-gray-600">재료선택</span>
          <span className="text-base leading-none">
            {selected ? `${selected.emoji} ${selected.title}` : "—"}
          </span>
          {selected && (
            <span
              role="button"
              aria-label="선택 취소"
              className="ml-1 inline-flex items-center justify-center rounded-md p-1 hover:bg-gray-100 text-gray-600"
              onClick={(e) => {
                e.stopPropagation();
                // 간단히 페이지 레벨 state를 비우기 위해 커스텀 이벤트 송출
                window.dispatchEvent(
                  new CustomEvent("ingredient-picked", { detail: null } as any)
                );
              }}
            >
              <Eraser className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
