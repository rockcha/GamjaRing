"use client";
import { useEffect, useMemo, useState } from "react";
import AquariumBox from "@/features/aquarium/AquariumBox";
import GoldDisplay from "@/features/aquarium/GoldDisplay";
import ShopModal from "@/features/aquarium/ShopModal";
import TankFrame from "@/features/aquarium/TankFrame";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";

export default function AquariumPage() {
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
        const { data, error } = await supabase
          .from("couples")
          .select("aquarium_fishes")
          .eq("id", coupleId)
          .maybeSingle();

        if (!mounted) return;

        if (!error && data) {
          const arr = Array.isArray(data.aquarium_fishes)
            ? (data.aquarium_fishes as string[])
            : [];
          setFishIds(arr);
        } else {
          setFishIds([]);
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
      alert("골드가 부족합니다!");
      return;
    }

    const { error: spendErr } = await spendGold(cost);
    if (spendErr) {
      alert(spendErr.message);
      return;
    }

    const nextFishIds = [...fishIds, fishId];
    setFishIds(nextFishIds);

    const { error: upErr } = await supabase
      .from("couples")
      .update({ aquarium_fishes: nextFishIds })
      .eq("id", coupleId);

    if (upErr) {
      alert(`구매 저장 실패: ${upErr.message}`);
      setFishIds(fishIds);
      await fetchCoupleData();
      return;
    }

    setGoldDelta(-cost);
  };

  // ✅ 판매 처리 (최소 변경)
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

    // 1) 인덱스 방어
    if (index < 0 || index >= fishIds.length || fishIds[index] !== fishId) {
      // 혹시 꼬였으면 뒤에서부터 같은 id 하나 제거
      index = fishIds.lastIndexOf(fishId);
      if (index === -1) return;
    }

    // 2) 낙관적 업데이트: 물고기 제거
    const next = fishIds.slice(0, index).concat(fishIds.slice(index + 1));
    setFishIds(next);

    // 3) DB 업데이트: 어항 물고기 배열 저장
    const { error: upErr1 } = await supabase
      .from("couples")
      .update({ aquarium_fishes: next })
      .eq("id", coupleId);
    if (upErr1) {
      alert(`판매 저장 실패: ${upErr1.message}`);
      await fetchCoupleData();
      return;
    }

    // 4) 골드 증가: DB 업데이트 후 동기화
    const newGold = gold + sellPrice;
    const { error: upErr2 } = await supabase
      .from("couples")
      .update({ gold: newGold })
      .eq("id", coupleId);
    if (upErr2) {
      console.warn("골드 지급 실패:", upErr2.message);
    } else {
      setGoldDelta(sellPrice); // 필요하면 +XX 표시용으로 사용
    }
    await fetchCoupleData(); // 컨텍스트 gold 동기화
  };

  const currentLoadingText: string = useMemo(() => {
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
        <GoldDisplay gold={gold} />
      </div>

      <TankFrame>
        <AquariumBox
          fishIds={fishIds}
          isLoading={loading}
          loadingText={currentLoadingText}
          onSell={handleSell} // ✅ 추가
        />
      </TankFrame>

      <div className="pt-2">
        <ShopModal gold={gold} onBuy={handleBuy} />
      </div>
    </div>
  );
}
