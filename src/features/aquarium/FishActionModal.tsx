// src/features/aquarium/FishActionModal.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FISH_BY_ID, RARITY_CAPTURE, type FishRarity } from "./fishes";
import supabase from "@/lib/supabase";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import { X, Info, Sparkles, BadgeDollarSign } from "lucide-react";

type SellPayload = {
  index: number;
  fishId: string;
  sellPrice: number;
};

export default function FishActionModal({
  open,
  onClose,
  coupleId,
  fishId,
  index,
  fishCountOfThis,
  breedCount, // 초기 표시용(즉시 렌더), 이후에는 liveBreedCount 사용
  onAfterBreed,
  onSell,
  onAfterSell,
}: {
  open: boolean;
  onClose: () => void;
  coupleId: string | null;
  fishId: string;
  index: number;
  fishCountOfThis: number;
  breedCount: number;
  onAfterBreed?: (payload: { success: boolean; nextBreed: number }) => void;
  onSell?: (payload: SellPayload) => Promise<void> | void;
  onAfterSell?: () => Promise<void> | void;
}) {
  if (!open) return null;

  const { user } = useUser();
  const fish = FISH_BY_ID[fishId]!;
  const sellPrice = Math.floor((fish.cost ?? 0) / 2);
  const captureBasePct = Math.round(
    RARITY_CAPTURE[fish.rarity as FishRarity] * 100
  );

  // ✅ 실제 DB에서 읽은 오늘 교배 횟수 (모달 열릴 때 로드 & 교배 후 갱신)
  const [liveBreedCount, setLiveBreedCount] = useState<number | null>(null);

  // UI 단계: idle → breeding → result
  const [stage, setStage] = useState<"idle" | "breeding" | "result">("idle");
  const [breedResult, setBreedResult] = useState<boolean | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 🔄 모달이 열릴 때 최신 breed_count 가져오기
  useEffect(() => {
    const fetchBreed = async () => {
      if (!open || !coupleId) {
        setLiveBreedCount(null);
        return;
      }
      const { data, error } = await supabase
        .from("couple_aquarium")
        .select("breed_count")
        .eq("couple_id", coupleId)
        .maybeSingle();

      if (error) {
        console.warn("breed_count 조회 실패:", error.message);
        if (mountedRef.current) setLiveBreedCount(breedCount ?? 0);
        return;
      }
      const bc = Number.isFinite(data?.breed_count as number)
        ? (data?.breed_count as number)
        : 0;
      if (mountedRef.current) setLiveBreedCount(bc);
    };
    fetchBreed();
  }, [open, coupleId, breedCount]);

  // 버튼/라벨 계산은 항상 DB에서 읽은 값 우선
  const usedBreedCount = Math.min(liveBreedCount ?? breedCount ?? 0, 3);
  const reachedLimit = usedBreedCount >= 3;
  const breedDisabledBase = fishCountOfThis < 2 || reachedLimit || !coupleId;

  // 진행 중에 관계없이 닫기/판매는 활성 (요청사항)
  const breedDisabled = breedDisabledBase || stage === "breeding";
  const breedReason =
    fishCountOfThis < 2
      ? "해당 물고기가 2마리 이상 있어야 교배할 수 있어요."
      : reachedLimit
      ? "오늘 교배 3/3회를 모두 사용했어요."
      : !coupleId
      ? "커플 정보가 없습니다."
      : "";

  const breedLabel =
    stage === "breeding" ? "교배중…" : `교배 (${usedBreedCount}/3)`;

  // 이펙트 파티클
  const particles = useMemo(
    () =>
      Array.from({ length: 20 }).map((_, i) => ({
        id: i,
        dx: Math.random() * 120 - 60,
        dy: -60 - Math.random() * 80,
        delay: Math.random() * 250,
        scale: 0.8 + Math.random() * 1.2,
        char: ["✨", "💖", "🐟", "💦"][Math.floor(Math.random() * 4)],
      })),
    []
  );

  const handleBreed = async () => {
    if (breedDisabledBase) {
      if (reachedLimit) toast.warning("오늘 교배 3/3회를 모두 사용했어요.");
      else if (fishCountOfThis < 2)
        toast.warning("해당 물고기가 2마리 이상 있어야 교배할 수 있어요.");
      else if (!coupleId) toast.warning("커플 정보가 없습니다.");
      return;
    }

    setStage("breeding");

    // 2초 연출
    await new Promise((r) => setTimeout(r, 2000));

    // 확률 판정
    const p = fish?.breedProb ?? 0.1;
    const success = Math.random() < p;

    // ⚠️ 서버 최신값으로 다시 한 번 확인 + 업데이트
    const { data, error } = await supabase
      .from("couple_aquarium")
      .select("aquarium_fishes, breed_count")
      .eq("couple_id", coupleId!)
      .maybeSingle();

    if (error) {
      toast.error(`교배 상태 조회 실패: ${error.message}`);
      setStage("idle");
      return;
    }

    const list = Array.isArray(data?.aquarium_fishes)
      ? (data!.aquarium_fishes as string[])
      : [];
    const currentBreed = Number.isFinite(data?.breed_count as number)
      ? (data?.breed_count as number)
      : 0;

    if (currentBreed >= 3) {
      // 서버 기준 초과 방지
      toast.warning("오늘 교배 3/3회를 모두 사용했어요.");
      setStage("idle");
      // 최신값 반영
      if (mountedRef.current) setLiveBreedCount(currentBreed);
      return;
    }

    const nextBreed = Math.min(currentBreed + 1, 3);
    const nextList = success ? [...list, fishId] : list;

    const { error: upErr } = await supabase
      .from("couple_aquarium")
      .update({ aquarium_fishes: nextList, breed_count: nextBreed })
      .eq("couple_id", coupleId!);

    if (upErr) {
      toast.error(`교배 처리 실패: ${upErr.message}`);
      setStage("idle");
      return;
    }

    // ✅ 로컬 카운트 즉시 갱신 (UI에 바로 반영)
    if (mountedRef.current) setLiveBreedCount(nextBreed);

    // 알림 전송 (성공/실패)
    try {
      if (user?.id && user?.partner_id) {
        await sendUserNotification({
          senderId: user.id,
          receiverId: user.partner_id,
          type: success ? "교배성공" : "교배실패",
          itemName: fish.labelKo,
        });
      }
    } catch (e) {
      console.warn("알림 전송 실패(무시 가능):", e);
    }

    setBreedResult(success);
    setStage("result");
    onAfterBreed?.({ success, nextBreed });
  };

  const handleSell = async () => {
    if (!onSell) return;
    if (
      !confirm(
        `정말로 "${fish.labelKo}"를 원가의 절반(${sellPrice} 골드)에 판매할까요?`
      )
    )
      return;

    await onSell({ index, fishId, sellPrice });

    // 판매 알림
    try {
      if (user?.id && user?.partner_id) {
        await sendUserNotification({
          senderId: user.id,
          receiverId: user.partner_id,
          type: "물품판매",
          itemName: fish.labelKo,
        });
      }
    } catch (e) {
      console.warn("판매 알림 전송 실패(무시 가능):", e);
    }

    await onAfterSell?.();
    onClose();
  };

  // 키프레임 1회 삽입
  useEffect(() => {
    const id = "breed-modal-effect";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes floatUp {
        0%   { opacity: 0; transform: translate(0,0) scale(0.8); }
        20%  { opacity: 1; }
        100% { opacity: 0; transform: translate(var(--dx,0), var(--dy,-80px)) scale(1); }
      }
      @keyframes pulseOnce {
        0%   { transform: scale(0.9); filter: drop-shadow(0 0 0 rgba(0,0,0,0)); }
        60%  { transform: scale(1.06); filter: drop-shadow(0 6px 10px rgba(0,0,0,.25)); }
        100% { transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const rarityBadge = (r: FishRarity) => {
    const cls =
      r === "일반"
        ? "bg-neutral-100 text-neutral-800 border-neutral-200"
        : r === "희귀"
        ? "bg-sky-100 text-sky-900 border-sky-200"
        : r === "에픽"
        ? "bg-violet-100 text-violet-900 border-violet-200"
        : "bg-amber-100 text-amber-900 border-amber-200";
    return (
      <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}
      >
        {r}
      </span>
    );
  };

  const BreedDots = ({ used }: { used: number }) => (
    <div
      className="flex items-center gap-1.5"
      aria-label={`오늘 교배 사용 ${used}/3`}
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <span
          key={i}
          className={`inline-block h-2.5 w-2.5 rounded-full ${
            i < used ? "bg-rose-500" : "bg-gray-200"
          }`}
        />
      ))}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50"
      onClick={onClose} // ✅ 언제나 닫기 가능
    >
      <div
        className="w-[500px] max-w-[92vw] rounded-2xl bg-white p-4 shadow-xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold tracking-tight">
                <span className="inline-block px-2 py-1 rounded-md bg-sky-100 text-sky-900 border border-sky-200">
                  {fish.labelKo}
                </span>
              </h3>
              {rarityBadge(fish.rarity as FishRarity)}
            </div>
            {/* 희귀도 기반 포획 확률 */}
            <div className="mt-1 flex items-center gap-1.5 text-[12px] text-gray-600">
              <Info className="w-4 h-4 text-sky-600" />
              <span>
                포획 확률(희귀도):{" "}
                <b className="text-gray-800">{captureBasePct}%</b>
              </span>
            </div>
          </div>

          <button
            onClick={onClose} // ✅ 언제나 활성화
            className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            <X className="w-4 h-4" />
            닫기
          </button>
        </div>

        {/* 본문 */}
        <div className="flex gap-4 min-h-[120px]">
          {stage !== "result" ? (
            <>
              <div className="relative">
                <img
                  src={fish.image}
                  alt={fish.labelKo}
                  className="w-28 h-28 object-contain rounded-md bg-white"
                  style={{ animation: "pulseOnce 500ms ease-out" }}
                  draggable={false}
                />
                {/* 가격 배지 */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-1">
                  <span className="inline-flex items-center gap-1 rounded-full border bg-amber-50 text-amber-900 border-amber-200 px-2.5 py-0.5 text-xs">
                    <BadgeDollarSign className="w-4 h-4" />
                    원가 {fish.cost.toLocaleString("ko-KR")}
                  </span>
                </div>
              </div>

              <div className="flex-1 text-sm">
                <div className="text-gray-600">
                  보유: <b className="text-gray-800">{fishCountOfThis}마리</b>
                </div>
                <div className="text-rose-600 font-semibold">
                  교배 확률: {(fish.breedProb * 100).toFixed(1)}%
                </div>
                <div className="text-gray-600">
                  판매가:{" "}
                  <b className="text-gray-800">
                    {sellPrice.toLocaleString("ko-KR")} 골드
                  </b>
                </div>

                {/* 오늘 교배 진행도 */}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-500">오늘 교배</span>
                  <BreedDots used={usedBreedCount} />
                </div>

                {stage === "breeding" && (
                  <div className="mt-3 text-base font-semibold flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-rose-500" />
                    교배중… ⏳
                  </div>
                )}
                {breedDisabledBase && (
                  <div className="mt-2 text-xs text-rose-500">
                    {breedReason}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="w-full text-center py-4 relative">
              {breedResult &&
                particles.map((p) => (
                  <span
                    key={p.id}
                    className="absolute text-xl opacity-0 pointer-events-none"
                    style={{
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      animation: `floatUp 900ms ease-out ${p.delay}ms forwards`,
                      ["--dx" as any]: `${p.dx}px`,
                      ["--dy" as any]: `${p.dy}px`,
                    }}
                  >
                    {p.char}
                  </span>
                ))}
              <img
                src={fish.image}
                alt={fish.labelKo}
                className="w-32 h-32 object-contain mx-auto"
                style={{ animation: "pulseOnce 500ms ease-out" }}
                draggable={false}
              />
              <div className="mt-2 text-lg font-bold">
                {breedResult ? "교배 성공! 🐣" : "교배 실패… 💦"}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {breedResult
                  ? `${fish.labelKo} 한 마리가 추가되었어요(새로고침 필수)`
                  : `다음에 다시 시도해봐요.`}
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={handleBreed}
            disabled={breedDisabled}
            title={breedDisabledBase ? breedReason : "교배하기"}
            className={`px-3 py-1.5 rounded ${
              breedDisabled
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-rose-500 text-white hover:bg-rose-600"
            }`}
          >
            {breedLabel}
          </button>

          {onSell && (
            <button
              onClick={handleSell}
              className="px-3 py-1.5 rounded bg-amber-600 text-white hover:bg-amber-700"
            >
              판매
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
