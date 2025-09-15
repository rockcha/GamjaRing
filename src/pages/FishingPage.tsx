// src/app/games/fishing/FishingPage.tsx
"use client";

/**
 * FishingPage — readability-focused refactor (+ Bulk Fishing)
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
import {
  rollFishByIngredient,
  type RollResult,
} from "@/features/fishing/rollfish";
import {
  consumeIngredients,
  fetchKitchen,
} from "@/features/kitchen/kitchenApi";
import {
  INGREDIENT_TITLES,
  type IngredientTitle,
} from "@/features/kitchen/type";

import { Fish as FishIcon } from "lucide-react";
import ResultDialog, {
  type FishResult as DialogFishResult,
  type Rarity,
} from "@/features/fishing/ResultDialog";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/* ────────────────────────────────────────────────────────────
 * Constants & Types
 * ──────────────────────────────────────────────────────────── */
const DND_MIME = "application/x-ingredient" as const;

export type TimeSlot = "morning" | "noon" | "evening" | "night";

const RARITY_DELAY_MS: Record<Rarity | "DEFAULT", number> = {
  전설: 10_000,
  에픽: 8_000,
  희귀: 6_000,
  일반: 4_000,
  DEFAULT: 4_000,
};

const FUNNY_LINES = [
  // 기존 6개
  "문어는 비밀번호를 여덟 자리로 고집합니다. 팔이 책임져요.",
  "게는 직진하라 했더니 옆으로 직진했습니다.",
  "돌고래는 웃는 얼굴로 시험지 내고, 선생님도 웃게 만듭니다.",
  "상어는 이 닦는 시간만 하루 두 번, 나머진 자유시간.",
  "해마 아빠는 출산 인증샷 대신 조용히 허리 펴요.",
  "고래는 점프 한 번에 캘린더의 ‘운동 완료’ 체크합니다.",

  // 제가 만든 첫 20개
  "해파리는 계획이 없지만, 흐름 타는 실력은 세계급입니다.",
  "바다거북은 늦을 수 있지만, 도착은 정확합니다. 내비가 파도거든요.",
  "문어는 멀티태스킹의 원조, 팔이 회의·요리·코딩을 나눠 맡아요.",
  "고등어는 이름부터 이미 상급자라 초급반 수강이 안 됩니다.",
  "가재는 뒤로 가지만, 회의는 앞으로 나갑니다. 회의실이 뒤에 있거든요.",
  "해초는 회의록 대신 물결로 ‘알아서 느껴라’ 합니다.",
  "복어는 스트레스 받으면 부풀지만, 마감 전엔 팀도 함께 부풉니다.",
  "말미잘은 말은 없지만, 존재감으로 모든 걸 설득합니다.",
  "바다사자는 박수를 잘 치지만, 공연은 즉흥입니다. 바다는 늘 라이브니까요.",
  "청새치는 와이파이보다 빠르지만, 바다는 비번을 안 걸어요.",
  "장어는 길게 이야기하지만, 결론은 미끄럽게 빠져나갑니다.",
  "고래상어는 상어 회의에서 회장으로 오해받지만, 사실 착한 큰형님.",
  "새우는 줄 서는 재능이 뛰어나서, 꼬리부터 예의 바릅니다.",
  "해마는 스스로 기사(騎士)라 생각해요. 갑옷은 물결, 말은 본체.",
  "바닷가재는 포멀한 옷차림이 기본값, 늘 턱시도 각 잡았습니다.",
  "성게는 가시 돋아도 마음은 둥글어요. 대신 앉을 곳은 둥글지 않습니다.",
  "문어는 프린터가 없어도 도장 여덟 개로 결재 끝!",
  "넙치는 눈치가 빠릅니다. 양쪽 다 봐서 회의 분위기 실시간 체크.",
  "상어는 월요일을 무서워하지 않아요. 월요일이 상어를 무서워하죠.",
  "돌고래는 코드 리뷰에 이모지로만 답해도 이해가 됩니다. 소리로 디버깅하거든요.",

  // 새로 추가한 센스 버전 20개
  "해파리는 시계가 없어도, 물결의 템포로 출근합니다.",
  "조개는 입을 다물지만, 열릴 땐 보너스가 들어 있습니다.",
  "문어는 프리랜서 계약도 팔로 도장 찍다 보니 속도가 빠릅니다.",
  "고래는 회의 중 졸면, 코 고는 소리가 파도처럼 웅장합니다.",
  "가오리는 프레젠테이션할 때 슬라이드 넘기는 게 날개짓입니다.",
  "오징어는 잉크젯 프린터를 몸에 탑재했지만, 잉크는 무제한 흘립니다.",
  "불가사리는 다리를 잃어도 재택근무로 금방 복귀합니다.",
  "문어는 칸반 보드를 여덟 손으로 동시에 업데이트합니다.",
  "해삼은 스트레스 받으면 스스로 로그아웃합니다.",
  "상어는 퇴근을 ‘칼같이’ 한다는 말의 상징입니다.",
  "돌고래는 밈을 잘 이해합니다. 웃음이 곧 언어거든요.",
  "성게는 인사성이 밝지만, 악수 대신 거리두기를 고집합니다.",
  "고등어는 통조림 속에서도 네트워킹을 놓치지 않습니다.",
  "바다거북은 패션에 둔감하지만, 셸(껍질)은 명품 원오프 에디션입니다.",
  "해파리는 짧은 회의에 강합니다. 길어지면 그냥 흘러가 버려요.",
  "문어는 팔이 많아도 손해 보지 않아요. 대신 장갑값이 문제죠.",
  "가재는 채팅창에서 늘 뒤로가기 키를 누릅니다.",
  "복어는 발표 전에 항상 숨을 크게 들이마십니다.",
  "돌고래는 스포일러를 해도 다들 웃으면서 넘어갑니다.",
  "상어는 야근 수당 대신 공포 분위기를 챙깁니다.",
] as const;

type BulkCatch = {
  id: string;
  label: string;
  rarity: Rarity;
  image: string;
  count: number;
};

/* ────────────────────────────────────────────────────────────
 * Utilities
 * ──────────────────────────────────────────────────────────── */
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

/* ────────────────────────────────────────────────────────────
 * Overlay (기존)
 * ──────────────────────────────────────────────────────────── */
function FishingOverlay({ visible }: { visible: boolean }) {
  const [text, setText] = useState<string>("바다의 농담을 건지는 중…");
  const [gifIndex, setGifIndex] = useState<number>(1);

  useEffect(() => {
    if (!visible) return;
    const pickLine = () =>
      setText(FUNNY_LINES[Math.floor(Math.random() * FUNNY_LINES.length)]!);
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

/* ────────────────────────────────────────────────────────────
 * Main Component
 * ──────────────────────────────────────────────────────────── */
export default function FishingPage() {
  /* 1) Context & Auth */
  const { user } = useUser();
  const { couple, fetchCoupleData } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  /* 2) TimeSlot & Background */
  const [slot, setSlot] = useState<TimeSlot>(() => getTimeSlot(new Date()));
  const bg = useMemo(() => bgSrcBySlot(slot), [slot]);
  useEffect(() => {
    const id = window.setInterval(
      () => setSlot(getTimeSlot(new Date())),
      30_000
    );
    return () => window.clearInterval(id);
  }, []);

  /* 3) UI State (개별 낚시) */
  const [overlay, setOverlay] = useState(false);
  const [result, setResult] = useState<DialogFishResult | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  /* 4) Bulk Fishing UI State */
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkTitle, setBulkTitle] = useState<IngredientTitle | "">("");
  const [bulkCount, setBulkCount] = useState<number>(1);
  const [invMap, setInvMap] = useState<Record<IngredientTitle, number>>(
    {} as any
  );
  const [bulkResults, setBulkResults] = useState<BulkCatch[] | null>(null);
  const [bulkFailCount, setBulkFailCount] = useState<number>(0);

  // Bulk 다이얼로그 열릴 때 재고 조회
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!bulkOpen || !coupleId) return;
      try {
        const k = await fetchKitchen(coupleId);
        const next: Record<IngredientTitle, number> = {} as any;
        for (const t of INGREDIENT_TITLES) next[t] = 0;
        for (const row of k.ingredients ?? []) {
          const t = row.title as IngredientTitle;
          next[t] = row.num ?? 0;
        }
        if (alive) setInvMap(next);
      } catch (e) {
        console.warn("재고 조회 실패:", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [bulkOpen, coupleId]);

  const availableTitles = useMemo(
    () => INGREDIENT_TITLES.filter((t) => (invMap[t] ?? 0) > 0),
    [invMap]
  );

  /* 5) Helpers */
  const getDelayByRarity = (rar: Rarity | null) =>
    RARITY_DELAY_MS[rar ?? "DEFAULT"];
  const clearOverlayAfter = async (ms: number) => {
    await new Promise((r) => setTimeout(r, ms));
    setOverlay(false);
  };

  /* 6) DnD Handlers (개별 낚시) */
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

      let payload: { title: IngredientTitle; emoji: string } | null = null;
      try {
        payload = JSON.parse(raw);
      } catch {
        return;
      }
      if (!payload) return;

      setOverlay(true);

      try {
        if (coupleId) {
          await consumeIngredients(coupleId, { [payload.title]: 1 } as Record<
            IngredientTitle,
            number
          >);
          // 재고 반영 이벤트 (기존 리스너는 1개씩 처리)
          window.dispatchEvent(
            new CustomEvent("ingredient-consumed", {
              detail: { title: payload.title },
            })
          );
        }

        const res: RollResult = await rollFishByIngredient(payload.title);

        let computed: DialogFishResult;
        let fishRow: {
          id: string;
          name_ko: string;
          rarity: Rarity;
          image: string;
        } | null = null;

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
            const rar: Rarity = rarityMap[row.rarity as string] ?? "일반";
            const img = buildImageSrc(row.id, rar);
            fishRow = {
              id: row.id,
              name_ko: row.name_ko ?? row.id,
              rarity: rar,
              image: img,
            };
            computed = {
              type: "SUCCESS",
              id: fishRow.id,
              labelKo: fishRow.name_ko,
              image: fishRow.image || "/aquarium/fish_placeholder.png",
              rarity: fishRow.rarity,
              ingredient: `${payload.emoji} ${payload.title}`,
            };
          }
        }

        await clearOverlayAfter(
          getDelayByRarity(computed.type === "SUCCESS" ? computed.rarity : null)
        );

        setResult(computed);
        setResultOpen(true);

        // 성공 시 인벤토리 저장 + 알림
        if (computed.type === "SUCCESS" && fishRow && coupleId) {
          try {
            const { error: insErr } = await supabase
              .from("couple_aquarium_inventory")
              .insert({
                couple_id: coupleId,
                entity_id: fishRow.id,
                tank_no: 1,
              })
              .select("id")
              .single();

            if (insErr) {
              toast.warning(`인벤토리 반영 실패: ${insErr.message}`);
            } else {
              try {
                const itemName = fishRow.name_ko.toString();
                if (user?.id && user?.partner_id) {
                  await sendUserNotification({
                    senderId: user.id,
                    receiverId: user.partner_id,
                    type: "낚시성공",
                    itemName,
                  } as any);
                }
              } catch (notifyErr) {
                console.warn("알림 전송 실패(무시 가능):", notifyErr);
              }
              await fetchCoupleData?.();
            }
          } catch (saveErr: any) {
            console.warn("인벤토리 저장 중 오류:", saveErr?.message ?? saveErr);
            toast.warning("인벤토리 저장 중 오류가 발생했어요.");
          }
        }
      } catch (err: any) {
        setOverlay(false);
        toast.error(err?.message ?? "낚시 처리 중 오류가 발생했어요.");
      }
    },
    [overlay, coupleId, fetchCoupleData, user?.id, user?.partner_id]
  );

  /* 7) Bulk Fishing 실행 */
  async function runBulkFishing() {
    if (!coupleId) return toast.error("커플 정보를 찾을 수 없어요.");
    if (!bulkTitle) return toast.error("재료를 선택해 주세요.");
    const have = invMap[bulkTitle] ?? 0;
    if (have <= 0) return toast.error("해당 재료가 없습니다.");
    if (bulkCount < 1) return toast.error("1개 이상 입력해 주세요.");
    if (bulkCount > have)
      return toast.warning(`보유량보다 많아요. 최대 ${have}개까지 가능합니다.`);

    try {
      setBulkBusy(true);
      setBulkResults(null);
      setBulkFailCount(0);

      // 1) 재료 일괄 차감
      await consumeIngredients(coupleId, { [bulkTitle]: bulkCount } as Record<
        IngredientTitle,
        number
      >);

      // 재고 반영 이벤트: 리스너가 1개씩 줄이므로 count번 디스패치
      for (let i = 0; i < bulkCount; i++) {
        window.dispatchEvent(
          new CustomEvent("ingredient-consumed", {
            detail: { title: bulkTitle },
          })
        );
      }

      // 2) N회 롤
      const rolls = await Promise.all(
        Array.from({ length: bulkCount }).map(() =>
          rollFishByIngredient(bulkTitle)
        )
      );

      const successIds = rolls
        .filter((r) => r.ok)
        .map((r) => (r as any).fishId as string);
      const failCnt = rolls.length - successIds.length;
      setBulkFailCount(failCnt);

      let catches: BulkCatch[] = [];
      if (successIds.length > 0) {
        // 3) 성공 어종 정보 일괄 조회
        const uniq = Array.from(new Set(successIds));
        const { data: rows, error } = await supabase
          .from("aquarium_entities")
          .select("id,name_ko,rarity")
          .in("id", uniq);

        if (error) throw error;

        const infoMap = new Map<string, { label: string; rarity: Rarity }>();
        rows?.forEach((r) => {
          const rar: Rarity = rarityMap[r.rarity as string] ?? "일반";
          infoMap.set(r.id, { label: r.name_ko ?? r.id, rarity: rar });
        });

        // 4) 집계
        const countMap = new Map<string, number>();
        successIds.forEach((id) =>
          countMap.set(id, (countMap.get(id) || 0) + 1)
        );

        catches = Array.from(countMap.entries())
          .map(([id, count]) => {
            const info = infoMap.get(id)!;
            return {
              id,
              label: info.label,
              rarity: info.rarity,
              image: buildImageSrc(id, info.rarity),
              count,
            };
          })
          .sort((a, b) =>
            a.rarity === b.rarity
              ? b.count - a.count
              : rarityWeight(b.rarity) - rarityWeight(a.rarity)
          );

        // 5) 인벤토리에 일괄 추가
        const rowsToInsert = successIds.map((id) => ({
          couple_id: coupleId,
          entity_id: id,
          tank_no: 1,
        }));
        const { error: insErr } = await supabase
          .from("couple_aquarium_inventory")
          .insert(rowsToInsert);

        if (insErr) {
          toast.warning(`인벤토리 일부 반영 실패: ${insErr.message}`);
        } else {
          await fetchCoupleData?.();
        }

        // 6) 알림(요약 1회)
        try {
          if (user?.id && user?.partner_id) {
            const kinds = catches.length;
            const total = successIds.length;
            await sendUserNotification({
              senderId: user.id,
              receiverId: user.partner_id,
              type: "낚시성공",
              itemName: `일괄 낚시: ${kinds}종 ${total}마리`,
            } as any);
          }
        } catch (e) {
          console.warn("알림 전송 실패(무시 가능):", e);
        }
      }

      setBulkResults(catches);
      toast.success(
        `일괄 낚시 완료! 성공 ${successIds.length} / 실패 ${failCnt}`
      );
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "일괄 낚시 중 오류가 발생했어요.");
    } finally {
      setBulkBusy(false);
    }
  }

  function rarityWeight(r: Rarity) {
    return r === "전설" ? 4 : r === "에픽" ? 3 : r === "희귀" ? 2 : 1;
  }

  /* 8) Render */
  return (
    <div
      className={cn(
        "w-full h:[calc(100vh-64px)] h-[calc(100vh-64px)] max-h-[100svh]",
        "grid grid-cols-1 grid-rows-1",
        "md:grid-cols-12 md:grid-rows-1 gap-3"
      )}
    >
      {/* 좌측 재료 패널 (데스크톱만) */}
      <aside
        className={cn(
          "hidden md:flex col-span-3 rounded-2xl border bg-white p-3 flex-col gap-3",
          "overflow-y-auto overscroll-contain min-h-0"
        )}
      >
        <IngredientFishingSection dragDisabled={overlay || bulkBusy} />
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

        {/* 상단 중앙 시간대 배지 */}
        <div className="relative z-10 h-full pointer-events-none">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 rounded-full bg-black/35 text-white text-[10px] sm:text-xs px-2.5 py-1 backdrop-blur-sm">
            현재 시간대: {slotLabel(slot)}
          </div>
        </div>

        {/* 좌상단: 일괄 낚시 버튼 */}
        <div className="absolute top-2 left-2 z-20 pointer-events-auto">
          <Button
            size="sm"
            variant="secondary"
            className="backdrop-blur-sm bg-white/80 hover:bg-white text-gray-900 border shadow-sm"
            onClick={() => setBulkOpen(true)}
            disabled={overlay || bulkBusy}
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
              재료를 이곳에 드래그해서 <br />
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
        />

        {/* 일괄 낚시 다이얼로그 */}
        <Dialog
          open={bulkOpen}
          onOpenChange={(v) => !bulkBusy && setBulkOpen(v)}
        >
          <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl">
            <DialogHeader className="p-6 pb-3">
              <DialogTitle>일괄 낚시</DialogTitle>
              <DialogDescription>
                재료와 개수를 입력해 한 번에 낚시하고, 결과를 모아서
                보여드립니다.
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 pb-6 space-y-4">
              {/* 입력 폼 */}
              <Card className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                  <div className="sm:col-span-3">
                    <label className="text-xs text-muted-foreground">
                      재료
                    </label>
                    <select
                      className="mt-1 w-full rounded-md border px-3 py-2 text-sm bg-white"
                      value={bulkTitle}
                      onChange={(e) => {
                        const t = e.target.value as IngredientTitle | "";
                        setBulkTitle(t);
                        const max = t ? invMap[t] ?? 0 : 0;
                        if (max > 0 && bulkCount > max) setBulkCount(max);
                      }}
                      disabled={bulkBusy}
                    >
                      <option value="" disabled>
                        선택하세요
                      </option>
                      {availableTitles.map((t) => (
                        <option key={t} value={t}>
                          {t} (보유 {invMap[t] ?? 0}개)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs text-muted-foreground">
                      개수
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={bulkTitle ? invMap[bulkTitle] ?? 0 : 1}
                      className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                      value={bulkCount}
                      onChange={(e) =>
                        setBulkCount(Math.max(1, Number(e.target.value || 1)))
                      }
                      disabled={bulkBusy || !bulkTitle}
                    />
                  </div>

                  <div className="sm:col-span-5 flex justify-end">
                    <Button
                      onClick={runBulkFishing}
                      disabled={bulkBusy || !bulkTitle}
                      className={cn(
                        "min-w-[120px]",
                        bulkBusy ? "opacity-80 cursor-not-allowed" : ""
                      )}
                    >
                      {bulkBusy ? "진행 중…" : "일괄 낚시 시작"}
                    </Button>
                  </div>
                </div>
              </Card>

              {/* 결과 영역 */}
              {bulkResults && (
                <div className="space-y-3">
                  <div className="text-sm">
                    <b>요약:</b> {bulkResults.reduce((a, b) => a + b.count, 0)}
                    마리 잡음 / 실패 {bulkFailCount}회{" · "}종류{" "}
                    {bulkResults.length}종
                  </div>

                  {bulkResults.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {bulkResults.map((f) => (
                        <div
                          key={f.id}
                          className="rounded-xl border p-2 bg-white"
                        >
                          <div className="w-full aspect-square rounded-lg border bg-white grid place-items-center overflow-hidden">
                            <img
                              src={f.image}
                              alt={f.label}
                              className="w-full h-full object-contain"
                              draggable={false}
                              loading="lazy"
                              onError={(ev) => {
                                ev.currentTarget.onerror = null;
                                ev.currentTarget.src =
                                  "/aquarium/fish_placeholder.png";
                              }}
                            />
                          </div>
                          <div className="mt-2 text-sm font-semibold truncate">
                            {f.label}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {f.rarity} · {f.count}마리
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      잡힌 물고기가 없어요.
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setBulkResults(null);
                        setBulkOpen(false);
                      }}
                    >
                      닫기
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
