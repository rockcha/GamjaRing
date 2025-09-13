// src/app/games/fishing/FishingPage.tsx
"use client";

/**
 * FishingPage — readability‑focused refactor
 * ------------------------------------------------------------
 * 1) 섹션/주석으로 구조를 명확히 분리
 * 2) 유틸/상수/타입 정리, 네이밍 일관화
 * 3) 빠른 조기 반환(early return)과 예외 처리 정리
 * 4) 모바일 시인성/터치 고려한 마크업(기존 DnD 유지)
 * 5) React 훅/의존성 배열 정리, setTimeout/Interval 정리
 */

/* ────────────────────────────────────────────────────────────
 * Imports
 * ──────────────────────────────────────────────────────────── */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { consumeIngredients } from "@/features/kitchen/kitchenApi";
import type { IngredientTitle } from "@/features/kitchen/type";

import { Fish as FishIcon } from "lucide-react";
import ResultDialog, {
  type FishResult as DialogFishResult,
  type Rarity,
} from "@/features/fishing/ResultDialog";

/* ────────────────────────────────────────────────────────────
 * Constants & Types
 * ──────────────────────────────────────────────────────────── */
const DND_MIME = "application/x-ingredient" as const;

// 시간대(배경) 구간
export type TimeSlot = "morning" | "noon" | "evening" | "night";

// 희귀도별 대기시간(ms)
const RARITY_DELAY_MS: Record<Rarity | "DEFAULT", number> = {
  전설: 10_000,
  에픽: 8_000,
  희귀: 6_000,
  일반: 4_000,
  DEFAULT: 4_000,
};

// (개그 전용) 낚시 중 멘트
const FUNNY_LINES = [
  "문어는 비밀번호를 여덟 자리로 고집합니다. 팔이 책임져요.",
  "게는 직진하라 했더니 옆으로 직진했습니다.",
  "돌고래는 웃는 얼굴로 시험지 내고, 선생님도 웃게 만듭니다.",
  "상어는 이 닦는 시간만 하루 두 번, 나머진 자유시간.",
  "해마 아빠는 출산 인증샷 대신 조용히 허리 펴요.",
  "고래는 점프 한 번에 캘린더의 ‘운동 완료’ 체크합니다.",
  "오징어는 잉크 떨어지면 퇴근합니다. 글감이 없거든요.",
  "가오리는 모래 속에서 눈치게임 하다가 자기만 몰랐다는 걸 압니다.",
  "성게는 ‘가시 돋쳤다’는 말을 칭찬으로 받아요.",
  "복어는 스트레스 받아도 부풀고, 칭찬받아도 부풉니다.",
  "해파리는 방향키 없이도 어디든 갑니다. 물길이 내 길.",
  "멸치 떼 단톡은 빠릅니다. ‘고?’ ‘고!’ 끝.",
  "참치가 달리기하면 바다 마라톤이 됩니다.",
  "문어가 타자 치면 키보드가 떨립니다. 동시 입력의 신.",
  "바닷바람은 헤어스타일을 통일합니다. ‘젖음컷’.",
  "산호는 평생 집순이—한 자리에서 도시를 지어요.",
  "바다거북 네비는 지구 자기장입니다. 배터리 무제한.",
  "새우는 뒤로 달리지만 인생은 앞으로 나아갑니다. 아마도요.",
  "고등어는 이름부터 고등학생 느낌이라 숙제를 회피합니다.",
  "꽁치는 늘 꽁치지 않으려 노력합니다. 실패가 잦아요.",
  "바다 달력은 조수간만으로 넘깁니다. 새벽 알람은 달.",
  "도미는 회의 때도 도미토리처럼 눕고 싶어 해요.",
  "불가사리는 팔이 떨어져도 ‘리스폰’ 합니다. 쿨타임만 기다리면 돼요.",
  "문어가 셀카 찍으면 항상 손가락이 두세 개 들어옵니다.",
  "해마 커플 사진은 늘 꼬리가 하트 모양입니다.",
  "상어는 다이어트 앱에 ‘단백질 위주’만 기록합니다.",
  "거북선은 전설, 거북이는 현실. 속도만 다릅니다.",
  "해루질하러 갔다가 해루지 못하고 밤바다 구경만 했습니다.",
  "고래상어는 거대한데 식단은 다이어트—플랑크톤 샐러드.",
  "바다는 비밀을 잘 지킵니다. 대신 소금도 같이 보관합니다.",
  "광어는 왼눈으로 미래를, 오른눈으로 초밥집을 봅니다.",
  "대왕오징어는 와이파이 안 잡히면 촉수로 핫스팟을 찾습니다.",
  "해달 주머니는 1GB 돌 저장공간—가끔 포맷을 잊어요.",
  "전복이 전복돼도 껍데기가 에어백입니다.",
  "물개는 공연이 없어도 박수 담당입니다. 분위기는 자급자족.",
  "게의 방향키는 ←→만 작동합니다. 설정에서 바꿀 수 없습니다.",
  "해삼은 스트레스 받으면 내부 캐시 비우고 재부팅합니다.",
  "망둥어는 점프하지만 체육 점수는 수영으로 받습니다.",
  "바다의 우체통은 조류, 답장은 다음 밀물에 도착합니다.",
  "소라의 집은 전세 아니고 평생 월세—대신 관리비는 파도입니다.",
] as const;

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

// 희귀도 → 디렉토리
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
 * Sub‑components
 * ──────────────────────────────────────────────────────────── */
function FishingOverlay({ visible }: { visible: boolean }) {
  const [text, setText] = useState<string>("바다의 농담을 건지는 중…");
  const [gifIndex, setGifIndex] = useState<number>(1);

  useEffect(() => {
    if (!visible) return;
    const pickLine = () =>
      setText(FUNNY_LINES[Math.floor(Math.random() * FUNNY_LINES.length)]!);
    const pickGif = () => setGifIndex(1 + Math.floor(Math.random() * 16));

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

  /* 3) UI State */
  const [overlay, setOverlay] = useState(false);
  const [result, setResult] = useState<DialogFishResult | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false); // 드롭 하이라이트

  /* 4) Helpers */
  const getDelayByRarity = (rar: Rarity | null) =>
    RARITY_DELAY_MS[rar ?? "DEFAULT"];

  const clearOverlayAfter = async (ms: number) => {
    await new Promise((r) => setTimeout(r, ms));
    setOverlay(false);
  };

  /* 5) DnD Handlers */
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

      // 1) 페이로드 안전 파싱
      let payload: { title: IngredientTitle; emoji: string } | null = null;
      try {
        payload = JSON.parse(raw);
      } catch {
        return;
      }
      if (!payload) return;

      // 2) 오버레이 시작
      setOverlay(true);

      try {
        // 2-1) 재료 차감
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

        // 2-2) 결과 계산
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

        // 2-3) 연출 대기
        await clearOverlayAfter(
          getDelayByRarity(computed.type === "SUCCESS" ? computed.rarity : null)
        );

        // 2-4) 결과 노출
        setResult(computed);
        setResultOpen(true);

        // 2-5) 성공 시 인벤토리 저장 + 알림
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

  /* 6) Render */
  return (
    <div
      className={cn(
        "w-full h:[calc(100vh-64px)] h-[calc(100vh-64px)] max-h-[100svh]",
        "grid grid-cols-1 grid-rows-1",
        "md:grid-cols-12 md:grid-rows-1 gap-3"
      )}
    >
      {/* 좌측 재료 패널 (데스크톱에만 표시) */}
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
        {/* 배경 이미지 */}
        <img
          src={bg}
          alt={`fishing background: ${slotLabel(slot)}`}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* 비네트(가독성 보조) */}
        <div className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_60%_at_50%_40%,rgba(0,0,0,0)_0%,rgba(0,0,0,.25)_100%)] md:[background:radial-gradient(55%_65%_at_50%_35%,rgba(0,0,0,0)_0%,rgba(0,0,0,.18)_100%)]" />

        {/* 상단 중앙 시간대 배지 */}
        <div className="relative z-10 h-full pointer-events-none">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 rounded-full bg-black/35 text-white text-[10px] sm:text-xs px-2.5 py-1 backdrop-blur-sm">
            현재 시간대: {slotLabel(slot)}
          </div>
        </div>

        {/* 우상단: 도감 */}
        <div className="absolute top-2 right-2 z-20 pointer-events-auto">
          <MarineDexModal />
        </div>

        {/* 드롭 가이드(센터) */}
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
      </main>
    </div>
  );
}
