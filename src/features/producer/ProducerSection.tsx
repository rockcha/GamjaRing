// src/features/producer/ProducerSection.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { Skeleton } from "@/components/ui/skeleton";
import ProducerCard from "./ProducerCard";
import { fetchFieldProducers } from "./index";
import type { FieldProducer } from "./index";
import supabase from "@/lib/supabase";
import BrowseProducersButton from "./BrowseProducersButton";

export default function ProducerSection() {
  const { user } = useUser();
  const coupleId = user?.couple_id ?? null;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FieldProducer[]>([]);

  const load = async () => {
    if (!coupleId) return;
    setLoading(true);
    try {
      const arr = await fetchFieldProducers(coupleId);
      setItems(arr);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // ✅ 실시간 변경 구독(선택)
    if (!coupleId) return;
    const ch = supabase
      .channel("realtime-producers")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "couple_potato_field",
          filter: `couple_id=eq.${coupleId}`,
        },
        load
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId]);

  const total = items.length;
  const producing = useMemo(
    () => items.filter((i) => i.state === "producing").length,
    [items]
  );
  const ready = useMemo(
    () => items.filter((i) => i.state === "ready").length,
    [items]
  );

  if (!coupleId) {
    return (
      <div className="text-sm text-neutral-600">
        커플 연결 후 이용할 수 있어요.
      </div>
    );
  }

  return (
    <section>
      {/* 상단 카운트 바 */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        {loading ? (
          <>
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-24" />
          </>
        ) : (
          <>
            <span className="rounded-md bg-neutral-50 px-2 py-1 border">
              보유: <b>{total}</b>
            </span>
            <span className="rounded-md bg-amber-50 px-2 py-1 border border-amber-200 text-amber-700">
              운영중: <b>{producing}</b>
            </span>
            <span className="rounded-md bg-emerald-50 px-2 py-1 border border-emerald-200 text-emerald-700">
              완료: <b>{ready}</b>
            </span>
          </>
        )}
        <div className="ml-auto">
          <BrowseProducersButton onPurchased={load} />
        </div>
      </div>

      {/* 카드 그리드 */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="text-sm text-neutral-500">
          아직 보유한 생산 수단이 없어요.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {items.map((fp, idx) => (
            <ProducerCard
              key={`${fp.title}-${idx}`}
              coupleId={coupleId}
              index={idx}
              data={fp}
            />
          ))}
        </div>
      )}
    </section>
  );
}
