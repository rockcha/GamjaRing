// src/pages/AquariumPage.tsx (파일 경로는 사용 중인 구조에 맞춰 유지)
"use client";
import { useEffect, useMemo, useState } from "react";
import AquariumBox from "@/features/aquarium/AquariumBox";

import ShopModal from "@/features/aquarium/ShopModal";
import TankFrame from "@/features/aquarium/TankFrame";

import { toast } from "sonner";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";

import { useUser } from "@/contexts/UserContext";
import { FISH_BY_ID } from "@/features/aquarium/fishes";

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

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        if (!coupleId) {
          if (mounted) setFishIds([]);
          return;
        }
        const { data } = await supabase
          .from("couples")
          .select("aquarium_fishes")
          .eq("id", coupleId)
          .maybeSingle();

        if (!mounted) return;

        const arr = Array.isArray(data?.aquarium_fishes)
          ? (data!.aquarium_fishes as string[])
          : [];
        setFishIds(arr);
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
      .from("couples")
      .update({ aquarium_fishes: nextFishIds })
      .eq("id", coupleId);

    if (upErr) {
      toast.warning(`구매 저장 실패: ${upErr.message}`);
      setFishIds(fishIds);
      await fetchCoupleData();
      return;
    }

    setGoldDelta(-cost);

    try {
      // 수정
      const itemName = (FISH_BY_ID[fishId]?.labelKo ?? fishId).toString();

      if (user?.id && user?.partner_id) {
        await sendUserNotification({
          senderId: user.id,
          receiverId: user.partner_id,
          type: "물품구매",
          itemName, // ← 전달 (없으면 기본 문구로 처리)
        });
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
      .from("couples")
      .update({ aquarium_fishes: next })
      .eq("id", coupleId);
    if (upErr1) {
      alert(`판매 저장 실패: ${upErr1.message}`);
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
    <div className="p-6 space-y-4">
      <div className="relative flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          아쿠아리움 🐟
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 text-sky-800 border border-sky-200 px-3 py-1 text-sm">
            <span>보유</span>
            <b className="tabular-nums">{fishCount}</b>
            <span>마리</span>
          </span>
        </h1>
        <div className="pb-2">
          <ShopModal gold={gold} onBuy={handleBuy} />
        </div>
      </div>

      <TankFrame>
        <AquariumBox
          fishIds={fishIds}
          isLoading={loading}
          loadingText={currentLoadingText}
          onSell={handleSell}
        />
      </TankFrame>
    </div>
  );
}
