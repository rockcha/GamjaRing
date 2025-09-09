// src/components/AquariumPreviewCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import AquariumBox from "@/features/aquarium/AquariumBox";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { Separator } from "@/components/ui/separator";

/**
 * ✅ 아쿠아리움 미리보기 카드
 * - PreviewCard가 DB에서 fishIds를 읽어와 계산 → AquariumBox에 prop으로 전달
 * - 로딩 동안엔 AquariumBox의 isLoading으로 스켈레톤 표시
 */
export default function AquariumPreviewCard({
  title = "🪸 우리의 아쿠아리움",
  aspectRatio = "16 / 9",
  className,
  maxPreview = 100, // 미리보기 최대 마리 수
}: {
  title?: string;
  aspectRatio?: string; // CSS aspect-ratio 표현식
  className?: string;
  maxPreview?: number;
}) {
  const { couple } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  const [loading, setLoading] = useState(false);
  const [allFishIds, setAllFishIds] = useState<string[]>([]);

  // 균형 잡힌 미리보기 배열 빌드 (중복 분산)
  const previewFishIds = useMemo(() => {
    const ids = allFishIds;
    if (ids.length <= maxPreview) return ids;

    // id별로 버킷 구성
    const buckets = new Map<string, string[]>();
    for (const id of ids) {
      const k = String(id);
      const arr = buckets.get(k) ?? [];
      arr.push(k);
      buckets.set(k, arr);
    }
    const species = Array.from(buckets.keys());
    const result: string[] = [];

    // 라운드로빈으로 분산 채집
    while (result.length < maxPreview) {
      let pushed = false;
      for (const k of species) {
        const b = buckets.get(k);
        if (b && b.length > 0) {
          result.push(b.shift() as string);
          pushed = true;
          if (result.length >= maxPreview) break;
        }
      }
      if (!pushed) break; // 더 이상 뽑을게 없으면 중단
    }
    return result;
  }, [allFishIds, maxPreview]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!coupleId) {
        setAllFishIds([]);
        return;
      }
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("couple_aquarium")
          .select("aquarium_fishes")
          .eq("couple_id", coupleId)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.warn("[PreviewCard] load fishes error:", error);
          setAllFishIds([]);
          return;
        }

        const raw = data?.aquarium_fishes;
        // 🔑 FISH_BY_ID 키와 맞추기 위해 문자열로 변환
        const arr: string[] = Array.isArray(raw)
          ? raw.map((x: any) => String(x))
          : [];
        setAllFishIds(arr);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coupleId]);

  return (
    <AquariumBox
      fishIds={previewFishIds}
      isLoading={loading}
      fitToContainer
      showDetailButton={false}
    />
  );
}
