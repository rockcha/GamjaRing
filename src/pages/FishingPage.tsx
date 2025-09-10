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
export const OCEAN_TRIVIA = [
  // 신화 & 전설
  "용왕의 사자(메신저)는 때로 돌고래였다고 전해요.",
  "해마는 바다의 우편배달부—소원을 품어 전했다는 옛이야기가 있어요.",
  "바다의 요정 네레이드가 폭풍을 달래줬다는 그리스 신화가 전해집니다.",
  "달의 가늘고 굽은 빛을 따라 어부가 길을 찾았다는 전설이 있어요.",
  "용궁의 시간은 느리게 간다—물결이 시계를 늦춘다는 설화가 있죠.",

  // 생태 & 과학
  "해초 숲은 바다의 유치원—새끼 물고기의 은신처예요.",
  "산호는 동물! 작은 폴립이 모여 거대한 도시를 만들죠.",
  "문어는 세 번의 심장을 갖고, 피가 푸른 색을 띱니다.",
  "고래상어는 지구에서 가장 큰 물고기지만 플랑크톤을 먹는 온순한 대형 종이에요.",
  "거북은 지구 자기장을 ‘지도’처럼 기억해 고향 해변으로 돌아옵니다.",

  // 지형 & 환경
  "심해 열수구는 태양 대신 지열로 삶이 이어지는 독특한 생태계를 이룹니다.",
  "난파선은 시간이 지나 인공 암초가 되어 생물의 집이 됩니다.",
  "빙산의 대부분은 수면 아래—보이는 건 꼭대기뿐이에요.",

  // 항해 & 문화
  "옛 항해사들은 별자리뿐 아니라 파도의 결을 읽어 길을 찾았어요.",
  "폴리네시아 항해술은 바람 냄새와 새의 이동까지 기억했습니다.",

  // 소리 & 커뮤니케이션
  "고래의 노래는 바다를 가로질러 같은 무리에 소식을 전합니다.",
  "돌고래는 서로의 이름 같은 휘파람 소리를 구분해요.",

  // 진짜 + 말도 안 되는 TMI
  "해삼은 위협받으면 장기를 내던지고… ‘리셋 버튼’을 누르듯 다시 자랍니다.",
  "불가사리는 팔이 끊겨도 다시 자라요. 가끔은 ‘팔이 본체’를 만들어버리기도!",
  "바닷물의 맛은 지역마다 달라요—어디는 미소국, 어디는 짬뽕 맛 같다는 농담도 있죠.",
  "문어는 잠들 때 꿈을 꾸는데, 아마 ‘오늘 먹은 게장 맛있었지’ 같은 꿈일지도 몰라요.",
  "고래는 방귀를 뀌면 거품이 버블티 사이즈예요.",
  "새우 눈알을 지켜보다 보면… ‘나보다 집중력 좋다’는 생각이 들어요.",
  "가끔 물고기는 물방울을 쫓다가 자기 꼬리를 따라 돕니다. (해봤자 끝은 뱅글뱅글)",
  "오징어는 먹잇감 잡을 때 양손잡이처럼 촉수를 씁니다. 혹시 글씨도 쓸 수 있을까요?",
  "상어도 뒤집히면 멘붕 상태가 돼요—‘잠깐 뭐 하던 중이었지?’",
  "해달은 조개를 까다가 자기가 애지중지하는 돌을 놓치면 멘탈이 무너진다고 해요.",
  "게는 가끔 옆으로 걷는 자신을 부끄러워하며 ‘정면으로 가야지…’ 하다가 금방 포기해요.",
  "플랑크톤이 반짝이는 밤바다는 사실 바다의 디스코 파티라는 썰이 있어요.",
  "산호는 너무 조용해서, 누군가는 ‘바다의 고독한 건축가’라 부릅니다. 근데 사실 수다쟁이일지도 몰라요.",
  "돌고래는 장난기가 많아 어부의 그물에 생선을 몰아넣고 ‘깜짝이야!’ 하고 웃는다고 전해요.",
  "해마 아빠는 새끼를 낳을 때 ‘헉헉’거리지만, 사실 속으로 ‘내가 왜 이걸…’ 중얼거릴지도 몰라요.",
  "심해어들은 너무 특이하게 생겨서, 지상에 나오면 분명 ‘코스튬 대회 우승’할 거예요.",
  "가오리는 모래에 숨을 때 ‘안 보이지? 안 보이지?’ 중얼거릴지도 모릅니다.",
  "어부들은 가끔 물고기가 자신보다 낚시를 더 잘한다고 푸념해요.",
  "혹등고래가 점프할 때 사실은 ‘운동 부족 스트레칭’이라는 농담도 있어요.",
  "바다거북은 수백 km를 헤엄치지만, 목적지가 없는 날은 그냥 산책일지도 몰라요.",
] as const;

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
// 실패 사유: 상황/감정/환경/코믹/기술적 이슈를 골고루 섞음
export const FAIL_REASONS = [
  "🪝 바늘이 살짝 벌어져 훅셋이 헐거웠어요!",
  "🐟 큰 녀석이 마지막에 머리를 흔들며 바늘을 털어냈어요!",
  "🫧 미끼만 야금야금—고수의 입질, 빈바늘만 남았네요!",
  "🌊 갑작스런 너울에 라인이 팽팽—각도 잃고 놓쳤어요!",
  "🎣 들어올리는 타이밍이 0.3초 빨랐어요… 아깝!",
  "😵 주변 구경하다가 찰나를 놓쳤어요!",
  "💤 졸음 챌린지 실패… 입질 알림도 못 들었어요 ㅠ",
  "🧊 비늘+물+손=미끄덩! 파이팅 중에 미끄러졌어요!",
  "🎏 체장 미달이라 바다에 돌려보냈어요. 다음에 더 크자!",
  "🪨 바닥 걸림! 암초가 훨씬 강했네요…",
  "🌬️ 돌풍 한 번에 라인이 깃발처럼 흔들렸어요!",
  "🧵 드랙이 너무 꽉—줄이 ‘팅!’ 하고 끊어졌어요!",
  "🪢 매듭이 살짝 풀려 있었네요… 매듭은 사랑과 같다—단단히.",
  "🧭 보트가 살짝 흘러 포인트에서 벗어났어요!",
  "🧲 금속 파츠가 서로 엉켜 캐스팅이 꼬였어요!",
  "🌧️ 빗방울에 부상층이 깨져 입질이 얕았어요.",
  "🌙 달빛이 강해 경계심 MAX—한 입만 베어먹고 도망!",
  "🌫️ 수온 약층을 못 맞췄어요—물고기는 한 층 아래였네요.",
  "🍤 미끼 컬러가 오늘 패턴과 안 맞았대요(물고기 왈).",
  "🧪 향이 너무 강했나봐요—호기심은 있었지만 퉤!",
  "📏 훅셋 방향이 수면과 평행—관통이 덜 됐어요.",
  "🧰 스냅 고리 변형—소소한 하드웨어 이슈!",
  "🧵 라인 마모 누적—오늘 터질 운명이었나 봐요.",
  "🧊 손끝 감각이 둔해진 겨울바다의 역습!",
  "📡 입질 알림을 ‘무음’으로… 인간 사바나 설정 미스.",
  "🧙‍♂️ 물고기 AI: “이건 함정이다.” 완벽히 간파당했어요.",
  "🪼 해파리가 줄에 스치며 텐션이 풀렸어요.",
  "🕳️ 갑자기 ‘바닥 구멍’로 쏙—어디 갔지?",
  "🪁 역풍에 캐스팅이 짧아 포인트에 못 닿았어요.",
  "🧼 바늘 끝이 무뎌져 관통력이 떨어졌어요. 다음엔 샤프너!",
  "🧯 갑작스런 브레이크! 릴이 잠깐 뻗었어요.",
  "🪤 생미끼가 너무 건강해 탈출(?)—바늘에서 도망!",
  "📸 기념사진 찍다가 떨어뜨렸어요… ‘사진병’의 비극.",
  "🎣 라인크립에 살짝 쓸려, 마지막 돌진을 못 버텼어요.",
] as const;

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
