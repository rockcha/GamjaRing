"use client";

import { useEffect, useState } from "react";
import { useCoupleContext } from "@/contexts/CoupleContext";
import PotatoFieldGrid from "@/features/potato_field/PotatoFieldGrid";
import { ensureRow, getPotatoCount } from "@/features/potato_field/utils";

export default function PotatoFieldPage() {
  const { couple } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  const [count, setCount] = useState<number>(0);
  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    if (!coupleId) return;
    (async () => {
      await ensureRow(coupleId);
      const n = await getPotatoCount(coupleId);
      setCount(n);
      setReady(true);
    })();
  }, [coupleId]);

  if (!coupleId) {
    return (
      <div className="mx-auto max-w-xl py-10 text-center text-slate-600">
        커플 연결이 필요해요.
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-xl py-10 text-center text-slate-600">
        감자밭 불러오는 중… 🥔
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* 현재 감자 갯수 */}
      <div className="mb-6 flex items-center justify-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 ring-1 ring-amber-300">
          <span className="text-lg">내 감자</span>
          <span className="text-2xl">🥔</span>
          <span className="text-xl font-semibold tabular-nums">{count}</span>
        </div>
      </div>

      {/* 3×3 감자밭 */}
      <PotatoFieldGrid coupleId={coupleId} onCountChange={setCount} />
    </div>
  );
}
