// src/components/AquariumPreviewCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";
import AquariumBox from "@/features/aquarium/AquariumBox";

type TankRow = { tank_no: number; title: string | null };

export default function AquariumPreviewCard({
  className,
  defaultTankNo = 1,
}: {
  className?: string;
  defaultTankNo?: number;
}) {
  const { couple } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  const [tanks, setTanks] = useState<TankRow[]>([]);
  const [selectedTankNo, setSelectedTankNo] = useState<number>(defaultTankNo);
  const [loading, setLoading] = useState<boolean>(false);

  const selectedTitle = useMemo(() => {
    const t = tanks.find((x) => x.tank_no === selectedTankNo);
    return t?.title ?? `어항 ${selectedTankNo}`;
  }, [tanks, selectedTankNo]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!coupleId) {
        setTanks([]);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("aquarium_tanks")
          .select("tank_no, title")
          .eq("couple_id", coupleId)
          .order("tank_no", { ascending: true });

        if (cancelled) return;

        if (error) {
          console.warn("[PreviewCard] load tanks error:", error);
          setTanks([]);
          return;
        }

        const rows: TankRow[] =
          (data ?? []).map((r: any) => ({
            tank_no: Number(r.tank_no),
            title: r.title ?? null,
          })) || [];

        setTanks(rows);

        if (!rows.some((r) => r.tank_no === defaultTankNo)) {
          setSelectedTankNo(rows[0]?.tank_no ?? 1);
        } else {
          setSelectedTankNo(defaultTankNo);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [coupleId, defaultTankNo]);

  return (
    <Card className={className}>
      <CardHeader className="space-y-2">
        {/* ✅ 제목 고정 */}
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base sm:text-lg">
            🪸 우리의 아쿠아리움
          </CardTitle>

          {/* 탱크 선택 (옵션 라벨은 각 탱크 title) */}
          <label className="text-xs flex items-center gap-2">
            <span className="text-muted-foreground hidden sm:inline">탱크</span>
            <select
              className="border rounded-md px-2 py-1 text-sm bg-background"
              disabled={loading || !tanks.length}
              value={selectedTankNo}
              onChange={(e) => setSelectedTankNo(Number(e.target.value))}
            >
              {(tanks.length ? tanks : [{ tank_no: 1, title: "어항 1" }]).map(
                (t) => (
                  <option key={t.tank_no} value={t.tank_no}>
                    {t.title ? t.title : `어항 ${t.tank_no}`}
                  </option>
                )
              )}
            </select>
          </label>
        </div>
      </CardHeader>

      <CardContent className="p-1">
        <AquariumBox tankNo={selectedTankNo} fitToContainer heightVh={60} />
      </CardContent>
    </Card>
  );
}
