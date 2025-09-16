"use client";

/**
 * FishingPage — bait-based fishing (single only here; bulk moved to component)
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";

import IngredientFishingSection from "@/features/fishing/IngredientFishingSection";
import MarineDexModal from "@/features/aquarium/MarineDexModal";
import { randomFunnyLine } from "@/features/fishing/funnyLines";
import {
  rollFishByIngredient,
  type RollResult,
} from "@/features/fishing/rollfish";

import BulkFishingDialog from "@/features/fishing/BulkFishingDialog";

import { Fish as FishIcon } from "lucide-react";
import ResultDialog, {
  type FishResult as DialogFishResult,
  type Rarity,
} from "@/features/fishing/ResultDialog";
import { Button } from "@/components/ui/button";

/* ──────────────────────────────────────────────────────────── */
const DND_MIME = "application/x-ingredient" as const;

export type TimeSlot = "morning" | "noon" | "evening" | "night";

const RARITY_DELAY_MS: Record<Rarity | "DEFAULT", number> = {
  전설: 10_000,
  에픽: 8_000,
  희귀: 6_000,
  일반: 4_000,
  DEFAULT: 4_000,
};

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
function rarityDir(r: Rarity) {
  return r === "일반"
    ? "common"
    : r === "희귀"
    ? "rare"
    : r === "에픽"
    ? "epic"
    : "legend";
}
function buildImageSrc(id: string, rarity: Rarity) {
  return `/aquarium/${rarityDir(rarity)}/${id}.png`;
}
const rarityMap: Record<string, Rarity> = {
  일반: "일반",
  희귀: "희귀",
  에픽: "에픽",
  전설: "전설",
  레어: "희귀",
};
// rpc rows/row 안전 언랩
function unwrapRpcRow<T>(data: T | T[] | null): T | null {
  return Array.isArray(data) ? data[0] ?? null : data ?? null;
}

/* ──────────────────────────────────────────────────────────── */
function FishingOverlay({ visible }: { visible: boolean }) {
  const [text, setText] = useState<string>("바다의 농담을 건지는 중…");
  const [gifIndex, setGifIndex] = useState<number>(1);
  useEffect(() => {
    if (!visible) return;
    const pickLine = () => setText(randomFunnyLine());
    const pickGif = () => setGifIndex(1 + Math.floor(Math.random() * 6));
    pickGif();
    pickLine();
    const id = window.setInterval(pickLine, 3000);
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
          src={`/fishing/fishing${gifIndex}.gif`}
          alt="낚시 중 애니메이션"
          className="mx-auto w-40 h-40 object-contain rounded-md mb-4"
          draggable={false}
        />
        <div className="mt-1 text-sm text-gray-900 text-center">
          <div className="font-semibold mb-1">🫧 바닷속 이야기</div>
          <div className="text-gray-800">{text}</div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────── */
export default function FishingPage() {
  const { user } = useUser();
  const { couple, fetchCoupleData } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  /* 시간대 & 배경 */
  const [slot, setSlot] = useState<TimeSlot>(() => getTimeSlot(new Date()));
  const bg = useMemo(() => bgSrcBySlot(slot), [slot]);
  useEffect(() => {
    const id = window.setInterval(
      () => setSlot(getTimeSlot(new Date())),
      30_000
    );
    return () => window.clearInterval(id);
  }, []);

  /* 어항 수 */
  const [tanksCount, setTanksCount] = useState<number>(1);
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!coupleId) return setTanksCount(1);
      const { data, error } = await supabase
        .from("aquarium_tanks")
        .select("tank_no")
        .eq("couple_id", coupleId)
        .order("tank_no", { ascending: true });
      if (!alive) return;
      if (error) {
        console.warn("어항 수 조회 실패:", error.message);
        setTanksCount(1);
        return;
      }
      setTanksCount(Math.max(1, data?.length ?? 1));
    })();
    return () => {
      alive = false;
    };
  }, [coupleId]);

  /* 미끼 수 */
  const [baitCount, setBaitCount] = useState(0);
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!coupleId) return setBaitCount(0);
      const { data, error } = await supabase
        .from("couple_bait_inventory")
        .select("bait_count")
        .eq("couple_id", coupleId)
        .maybeSingle();
      if (!alive) return;
      if (error) {
        console.warn("bait load error:", error.message);
        setBaitCount(0);
      } else {
        setBaitCount(data?.bait_count ?? 0);
      }
    })();
    return () => {
      alive = false;
    };
  }, [coupleId]);

  // bait-consumed(left|count) 프로토콜 동기화
  useEffect(() => {
    function onBait(e: Event) {
      const d =
        (e as CustomEvent<{ left?: number; count?: number }>).detail || {};
      if (typeof d.left === "number") setBaitCount(d.left);
      else
        setBaitCount((c) => Math.max(0, c - Math.max(1, Number(d.count ?? 1))));
    }
    window.addEventListener("bait-consumed", onBait as any);
    return () => window.removeEventListener("bait-consumed", onBait as any);
  }, []);

  /* 단건 낚시 UI */
  const [overlay, setOverlay] = useState(false);
  const [result, setResult] = useState<DialogFishResult | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [savingDialogPut, setSavingDialogPut] = useState(false);

  /* 일괄 낚시 오픈 상태만 보유 (구현은 분리 컴포넌트) */
  const [bulkOpen, setBulkOpen] = useState(false);

  /* 드래그 & 드롭 (단건 낚시) */
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
  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      setDragOver(false);
      if (overlay) return;
      const raw = e.dataTransfer.getData(DND_MIME);
      if (!raw) return;
      e.preventDefault();

      let payload: any = null;
      try {
        payload = JSON.parse(raw);
      } catch {
        return;
      }
      if (!payload) return;

      setOverlay(true);
      try {
        if (payload?.type !== "bait") {
          setOverlay(false);
          return;
        }

        if (coupleId) {
          const { data: cdata, error: cerr } = await supabase.rpc(
            "consume_bait",
            {
              p_couple_id: coupleId,
              p_count: 1,
            }
          );
          if (cerr) throw cerr;
          const crow = unwrapRpcRow<{
            ok: boolean;
            error?: string | null;
            bait_count: number | null;
          }>(cdata);
          if (!crow?.ok) {
            toast.warning(
              crow?.error === "not_enough_bait"
                ? "미끼가 부족합니다!"
                : "미끼 차감 실패"
            );
            setOverlay(false);
            return;
          }
          const newCnt = crow.bait_count ?? 0;
          setBaitCount(newCnt);
          window.dispatchEvent(
            new CustomEvent("bait-consumed", { detail: { left: newCnt } })
          );
        }

        const res: RollResult = await rollFishByIngredient("bait" as any);

        let computed: DialogFishResult;
        if (!res.ok) {
          computed = { type: "FAIL" };
        } else {
          const { data: row, error: qErr } = await supabase
            .from("aquarium_entities")
            .select("id, name_ko, rarity")
            .eq("id", res.fishId)
            .maybeSingle();
          if (qErr || !row) {
            computed = { type: "FAIL" };
          } else {
            const rar: Rarity =
              (["일반", "희귀", "에픽", "전설"] as Rarity[])[
                ["일반", "희귀", "에픽", "전설"].indexOf(row.rarity as Rarity)
              ] ?? "일반";
            const img = `/aquarium/${
              rar === "일반"
                ? "common"
                : rar === "희귀"
                ? "rare"
                : rar === "에픽"
                ? "epic"
                : "legend"
            }/${row.id}.png`;
            computed = {
              type: "SUCCESS",
              id: row.id,
              labelKo: row.name_ko ?? row.id,
              image: img || "/aquarium/fish_placeholder.png",
              rarity: rar,
            };
          }
        }

        const delay =
          RARITY_DELAY_MS[
            computed.type === "SUCCESS" ? computed.rarity : "DEFAULT"
          ];
        await new Promise((r) => setTimeout(r, delay));
        setOverlay(false);
        setResult(computed);
        setResultOpen(true);
      } catch (err: any) {
        setOverlay(false);
        toast.error(err?.message ?? "낚시 처리 중 오류가 발생했어요.");
      }
    },
    [overlay, coupleId]
  );

  /* 단건 결과 저장 */
  const handlePutToTank = useCallback(
    async (tankNo: number) => {
      if (!coupleId) return toast.error("커플 정보를 찾을 수 없어요.");
      if (!result || result.type !== "SUCCESS") return;

      const safeTank = Math.max(1, Math.min(tankNo, tanksCount));
      setSavingDialogPut(true);
      try {
        const { error: insErr } = await supabase
          .from("couple_aquarium_inventory")
          .insert({
            couple_id: coupleId,
            entity_id: result.id,
            tank_no: safeTank,
          })
          .select("id")
          .single();

        if (insErr) {
          toast.warning(`인벤토리 반영 실패: ${insErr.message}`);
        } else {
          try {
            if (user?.id && user?.partner_id) {
              await sendUserNotification({
                senderId: user.id,
                receiverId: user.partner_id,
                type: "낚시성공",
                itemName: result.labelKo.toString(),
              } as any);
            }
          } catch (notifyErr) {
            console.warn("알림 전송 실패(무시 가능):", notifyErr);
          }
          await fetchCoupleData?.();
          toast.success(`"${result.labelKo}"를 ${safeTank}번 어항에 담았어요!`);
          setResultOpen(false);
        }
      } catch (e: any) {
        console.warn("인벤토리 저장 중 오류:", e?.message ?? e);
        toast.warning("인벤토리 저장 중 오류가 발생했어요.");
      } finally {
        setSavingDialogPut(false);
      }
    },
    [coupleId, result, user?.id, user?.partner_id, fetchCoupleData, tanksCount]
  );

  /* Render */
  return (
    <div
      className={cn(
        "w-full h:[calc(100vh-64px)] h-[calc(100vh-64px)] max-h-[100svh]",
        "grid grid-cols-1 grid-rows-1",
        "md:grid-cols-12 md:grid-rows-1 gap-3"
      )}
    >
      {/* 좌측 패널 */}
      <aside
        className={cn(
          "hidden md:flex col-span-3 rounded-2xl border bg-white p-3 flex-col gap-3",
          "overflow-y-auto overscroll-contain min-h-0"
        )}
      >
        <IngredientFishingSection dragDisabled={overlay} />
      </aside>

      {/* 메인 낚시터 */}
      <main
        className={cn(
          "col-span-9 relative rounded-2xl border overflow-hidden min-w-0 min-h-0"
        )}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        aria-label="낚시 배경 영역"
      >
        {/* 배경 */}
        <img
          src={bg}
          alt={`fishing background: ${slotLabel(slot)}`}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
        {/* 비네트 */}
        <div className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_60%_at_50%_40%,rgba(0,0,0,0)_0%,rgba(0,0,0,.25)_100%)] md:[background:radial-gradient(55%_65%_at_50%_35%,rgba(0,0,0,0)_0%,rgba(0,0,0,.18)_100%)]" />
        {/* 시간대 배지 */}
        <div className="relative z-10 h-full pointer-events-none">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 rounded-full bg-black/35 text-white text-[10px] sm:text-xs px-2.5 py-1 backdrop-blur-sm">
            현재 시간대: {slotLabel(slot)}
          </div>
        </div>

        {/* 좌상단: 일괄 낚시 */}
        <div className="absolute top-2 left-2 z-20 pointer-events-auto">
          <Button
            size="sm"
            variant="secondary"
            className="backdrop-blur-sm bg-white/80 hover:bg-white text-gray-900 border shadow-sm"
            onClick={() => setBulkOpen(true)}
            disabled={overlay}
          >
            ✨ 일괄 낚시
          </Button>
        </div>

        {/* 우상단: 도감 */}
        <div className="absolute top-2 right-2 z-20 pointer-events-auto">
          <MarineDexModal />
        </div>

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
              미끼를 이곳에 드래그해서 <br />
              낚시를 시작하세요 🎣
            </div>
          </div>
        )}

        {/* 오버레이 / 결과 */}
        <FishingOverlay visible={overlay} />

        <ResultDialog
          open={resultOpen}
          result={result}
          onClose={() => setResultOpen(false)}
          tanksCount={tanksCount}
          onConfirmPut={handlePutToTank}
          saving={savingDialogPut}
        />

        {/* ⬇️ 분리된 일괄 낚시 다이얼로그 */}
        <BulkFishingDialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          coupleId={coupleId}
          tanksCount={tanksCount}
          baitCount={baitCount}
          setBaitCount={setBaitCount}
          fetchCoupleData={fetchCoupleData}
          userId={user?.id}
          partnerId={user?.partner_id}
        />
      </main>
    </div>
  );
}
