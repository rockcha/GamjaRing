// src/pages/AquariumPage.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import AquariumBox from "@/features/aquarium/AquariumBox";
import MarineDexModal from "@/features/aquarium/MarineDexModal";

import { toast } from "sonner";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import { useUser } from "@/contexts/UserContext";
import { FISH_BY_ID } from "@/features/aquarium/fishes";
import ThemeShopButton from "@/features/aquarium/ThemeShopButton";

/* ------------------------------
   ✅ TankSkeleton
   - 로딩 텍스트가 항상 즉시 표시
   - 물 배경은 약간 늦게(fade-in)
------------------------------ */
function TankSkeleton({ text }: { text: string }) {
  const [showBg, setShowBg] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setShowBg(true), 150); // 텍스트 먼저 노출
    return () => clearTimeout(id);
  }, []);

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden"
      style={{ aspectRatio: "800 / 420" }}
      aria-live="polite"
      aria-busy="true"
    >
      {/* 텍스트 레이어: 항상 즉시 렌더 */}
      <div className="text-3xl absolute inset-0 flex items-center justify-center z-10">
        {text}
      </div>
    </div>
  );
}

export default function AquariumPage() {
  const { user } = useUser();
  const { couple, gold, spendGold, fetchCoupleData } = useCoupleContext();

  const [fishIds, setFishIds] = useState<string[]>([]);
  const [goldDelta, setGoldDelta] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  const coupleId = couple?.id ?? null;

  const loadingMessages = useMemo(
    () => [
      "🫧 어항 청소중 …",
      "🍽️ 물고기 밥 주는 중 …",
      "🌿 수초 정리중 …",
      "💧 물 교체중 …",
      "🔧 필터 점검중 …",
      "🪸 산호 배치중 …",
    ],
    []
  );

  useEffect(() => {
    if (!loading) return;
    setLoadingMsgIndex(Math.floor(Math.random() * loadingMessages.length));
    const itv = setInterval(
      () => setLoadingMsgIndex((i) => (i + 1) % loadingMessages.length),
      1400
    );
    return () => clearInterval(itv);
  }, [loading, loadingMessages.length]);

  // ✅ couple_aquarium에서 물고기 가져오기 (없으면 행 생성)
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        if (!coupleId) {
          if (mounted) setFishIds([]);
          return;
        }

        const { data, error } = await supabase
          .from("couple_aquarium")
          .select("aquarium_fishes")
          .eq("couple_id", coupleId)
          .maybeSingle();

        if (!mounted) return;

        if (error || !data) {
          await supabase.from("couple_aquarium").upsert(
            {
              couple_id: coupleId,
              aquarium_fishes: [],
            },
            { onConflict: "couple_id" }
          );
          setFishIds([]);
        } else {
          const arr = Array.isArray(data.aquarium_fishes)
            ? (data.aquarium_fishes as string[])
            : [];
          setFishIds(arr);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [coupleId]);

  useEffect(() => {
    if (goldDelta === null) return;
    const t = setTimeout(() => setGoldDelta(null), 900);
    return () => clearTimeout(t);
  }, [goldDelta]);

  const handleBuy = async (fishId: string, cost: number) => {
    if (!coupleId) {
      alert("커플 정보가 없습니다. 로그인/연동 상태를 확인해주세요.");
      return;
    }
    if (gold < cost) {
      toast.warning("골드가 부족합니다!");
      return;
    }

    const { error: spendErr } = await spendGold(cost);
    if (spendErr) {
      toast.warning(spendErr.message);
      return;
    }

    const nextFishIds = [...fishIds, fishId];
    setFishIds(nextFishIds);

    const { error: upErr } = await supabase
      .from("couple_aquarium")
      .upsert(
        { couple_id: coupleId, aquarium_fishes: nextFishIds },
        { onConflict: "couple_id" }
      );

    if (upErr) {
      toast.warning(`구매 저장 실패: ${upErr.message}`);
      setFishIds(fishIds);
      await fetchCoupleData();
      return;
    }

    setGoldDelta(-cost);

    try {
      const itemName = (FISH_BY_ID[fishId]?.labelKo ?? fishId).toString();
      if (user?.id && user?.partner_id) {
        await sendUserNotification({
          senderId: user.id,
          receiverId: user.partner_id,
          type: "물품구매",
          itemName,
        } as any);
      }
    } catch (e) {
      console.warn("알림 전송 실패(무시 가능):", e);
    }

    toast.success("구매 완료!");
  };

  const handleSell = async ({
    index,
    fishId,
    sellPrice,
  }: {
    index: number;
    fishId: string;
    sellPrice: number;
  }) => {
    if (!coupleId) return;

    if (index < 0 || index >= fishIds.length || fishIds[index] !== fishId) {
      index = fishIds.lastIndexOf(fishId);
      if (index === -1) return;
    }

    const next = fishIds.slice(0, index).concat(fishIds.slice(index + 1));
    setFishIds(next);

    const { error: upErr1 } = await supabase
      .from("couple_aquarium")
      .upsert(
        { couple_id: coupleId, aquarium_fishes: next },
        { onConflict: "couple_id" }
      );

    if (upErr1) {
      alert(`판매 저장 실패: ${upErr1.message}`);
      setFishIds(fishIds);
      await fetchCoupleData();
      return;
    }

    const newGold = gold + sellPrice;
    const { error: upErr2 } = await supabase
      .from("couples")
      .update({ gold: newGold })
      .eq("id", coupleId);

    if (upErr2) {
      console.warn("골드 지급 실패:", upErr2.message);
    } else {
      setGoldDelta(sellPrice);
    }
    await fetchCoupleData();
  };

  const currentLoadingText = useMemo(() => {
    if (loadingMessages.length === 0) return "🫧 어항 청소중 …";
    const i =
      ((loadingMsgIndex % loadingMessages.length) + loadingMessages.length) %
      loadingMessages.length;
    return loadingMessages[i]!;
  }, [loadingMessages, loadingMsgIndex]);

  const fishCount = fishIds.length;

  return (
    // 🔽 헤더 높이를 모를 때: CSS 변수로 반응형 헤더 추정값 제공
    //    기본 64px, md: 72px, lg: 80px
    <div
      className="[--hdr:64px] md:[--hdr:72px] lg:[--hdr:80px] min-h-[calc(100svh-var(--hdr))] w-full
                   flex flex-col bg-sky-200"
    >
      <div className="w-full space-y-3 flex-1 ">
        {/* ✅ 어항 + 상단 고정 오버레이 (로딩/비로딩 공통) */}
        <div className="relative w-full mt-4">
          {/* 탱크 본체 */}
          {loading ? (
            <TankSkeleton text={currentLoadingText} />
          ) : (
            <AquariumBox
              fishIds={fishIds}
              isLoading={false}
              loadingText={currentLoadingText}
              onSell={handleSell}
            />
          )}

          {/* 🔒 상단-왼쪽 고정 오버레이 */}
          <div className="absolute right-2 top-2 z-20 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100/90 backdrop-blur-sm text-sky-900 border border-sky-200 px-2.5 py-1 text-xs shadow-sm">
              <span>🐟</span>
              <b className="tabular-nums">{fishCount}</b>
            </span>
            <ThemeShopButton />
            {/* 도감 버튼 (작게) */}
            <MarineDexModal
              gold={gold}
              onBuy={handleBuy}
              // @ts-expect-error: 내부에서 Button에 스프레드해주는 형태로 적용
              buttonProps={{
                size: "sm",
                className:
                  "h-7 px-2.5 rounded-full bg-white/85 hover:bg-white text-slate-700 border border-slate-200 shadow-sm backdrop-blur-sm",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
