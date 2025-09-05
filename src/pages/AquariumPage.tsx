// src/pages/AquariumPage.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import AquariumBox from "@/features/aquarium/AquariumBox";
import MarineDexModal from "@/features/aquarium/MarineDexModal";
import TankFrame from "@/features/aquarium/TankFrame";

import { toast } from "sonner";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import { useUser } from "@/contexts/UserContext";
import { FISH_BY_ID } from "@/features/aquarium/fishes";

// ✅ 로딩 스켈레톤 (AquariumBox가 렌더되기 전 단계에서만 사용)
function TankSkeleton({ text }: { text: string }) {
  return (
    <div className="mx-auto w-full px-2" style={{ maxWidth: 1100 }}>
      <div
        className="relative w-full rounded-xl overflow-hidden"
        style={{ aspectRatio: "800 / 420" }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-sky-200 to-sky-300 animate-pulse" />
        <div className="absolute inset-0 opacity-30 bg-[url('/aquarium/water.jpg')] bg-cover" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="px-4 py-2 rounded-lg bg-white/70 text-slate-700 font-medium shadow">
            {text}
          </div>
        </div>
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
    <div className="w-full p-6">
      <div className="mx-auto w-full max-w-[1100px] px-2 space-y-3">
        {/* 어항 폭 기준 좌↔우 끝에 배치 */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 text-sky-800 border border-sky-200 pr-4 px-3 py-1 text-sm">
            <span>🐟</span>
            <b className="tabular-nums">{fishCount}</b>
          </span>
          <div className="pb-2">
            <MarineDexModal gold={gold} onBuy={handleBuy} />
          </div>
        </div>

        <TankFrame>
          {/* ✅ 로딩일 때는 AquariumBox를 아예 렌더하지 않고 스켈레톤만 보여줌 */}
          {loading ? (
            <TankSkeleton text={currentLoadingText} />
          ) : (
            <AquariumBox
              fishIds={fishIds}
              isLoading={false} // 이미 페이지에서 로딩 분기 처리
              loadingText={currentLoadingText}
              onSell={handleSell}
            />
          )}
        </TankFrame>
      </div>
    </div>
  );
}
