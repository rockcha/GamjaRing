// src/features/flowers/FlowerDexButton.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";

type Flower = {
  id: string;
  label: string;
  grade: "일반" | "희귀" | "에픽";
  price: number;
};

type InvRow = { flower_id: string; qty: number };
type OwnedMap = Record<string, number>;

export default function FlowerDexButton({ className }: { className?: string }) {
  const { couple } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  const [open, setOpen] = useState(false);
  const [flowers, setFlowers] = useState<Flower[] | null>(null);
  const [owned, setOwned] = useState<OwnedMap>({});
  const [loading, setLoading] = useState(false);

  // 필터 상태
  const [ownFilter, setOwnFilter] = useState<"all" | "owned" | "unowned">(
    "all"
  );
  const [gradeTab, setGradeTab] = useState<"all" | "일반" | "희귀" | "에픽">(
    "all"
  );

  const loadFlowers = useCallback(async () => {
    const { data, error } = await supabase
      .from("flowers")
      .select("id,label,grade,price")
      .order("grade", { ascending: true })
      .order("price", { ascending: true });
    if (error) {
      console.warn("[FlowerDex] load flowers error:", error.message);
      setFlowers([]);
      return;
    }
    setFlowers((data ?? []) as Flower[]);
  }, []);

  const loadOwned = useCallback(async () => {
    if (!coupleId) {
      setOwned({});
      return;
    }
    const { data, error } = await supabase
      .from("flowers_inventory")
      .select("flower_id, qty")
      .eq("couple_id", coupleId);
    if (error) {
      console.warn("[FlowerDex] load owned error:", error.message);
      setOwned({});
      return;
    }
    const map: OwnedMap = {};
    (data as InvRow[] | null)?.forEach(
      (r) => (map[r.flower_id] = Number(r.qty ?? 0))
    );
    setOwned(map);
  }, [coupleId]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([loadFlowers(), loadOwned()]).finally(() => setLoading(false));
  }, [open, loadFlowers, loadOwned]);

  const filtered = useMemo(() => {
    let list = flowers ?? [];
    if (gradeTab !== "all") list = list.filter((f) => f.grade === gradeTab);
    if (ownFilter === "owned")
      list = list.filter((f) => (owned[f.id] ?? 0) > 0);
    else if (ownFilter === "unowned")
      list = list.filter((f) => (owned[f.id] ?? 0) <= 0);
    return list;
  }, [flowers, gradeTab, ownFilter, owned]);

  const imgSrc = (label: string) => `/flowers/${encodeURIComponent(label)}.png`;

  const gradeTone: Record<Flower["grade"], string> = {
    일반: "ring-1 ring-neutral-200 bg-neutral-50 dark:bg-neutral-950/60 dark:ring-neutral-800",
    희귀: "ring-1 ring-sky-200 bg-sky-50 dark:bg-sky-950/40 dark:ring-sky-900/60",
    에픽: "ring-1 ring-violet-200 bg-violet-50 dark:bg-violet-950/40 dark:ring-violet-900/60",
  };

  return (
    <>
      <Button className={className} onClick={() => setOpen(true)}>
        🌸 꽃 도감
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="text-xl">🌸 꽃 도감</DialogTitle>
            <DialogDescription className="px-0">
              등급/보유 상태로 필터링하여 모든 꽃을 한눈에 확인해요.
            </DialogDescription>
          </DialogHeader>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-muted to-transparent" />

          {/* 등급 탭 + 보유/미보유 토글 (같은 가로줄) */}
          <div className="px-6 pt-4">
            <div className="flex items-center justify-between gap-3">
              <Tabs
                value={gradeTab}
                onValueChange={(v) => setGradeTab(v as any)}
              >
                <TabsList>
                  <TabsTrigger value="all">전체</TabsTrigger>
                  <TabsTrigger value="일반">일반</TabsTrigger>
                  <TabsTrigger value="희귀">희귀</TabsTrigger>
                  <TabsTrigger value="에픽">에픽</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="inline-flex rounded-full border bg-background p-1 text-xs">
                <button
                  className={`px-3 py-1 rounded-full ${
                    ownFilter === "all"
                      ? "bg-muted font-semibold"
                      : "opacity-80"
                  }`}
                  onClick={() => setOwnFilter("all")}
                >
                  전체
                </button>
                <button
                  className={`px-3 py-1 rounded-full ${
                    ownFilter === "owned"
                      ? "bg-muted font-semibold"
                      : "opacity-80"
                  }`}
                  onClick={() => setOwnFilter("owned")}
                >
                  보유
                </button>
                <button
                  className={`px-3 py-1 rounded-full ${
                    ownFilter === "unowned"
                      ? "bg-muted font-semibold"
                      : "opacity-80"
                  }`}
                  onClick={() => setOwnFilter("unowned")}
                >
                  미보유
                </button>
              </div>
            </div>
          </div>

          {/* 콘텐츠 스크롤 영역: 고정 높이로 변경 */}
          <ScrollArea className="h-[70vh] px-6 py-4">
            {loading ? (
              <div className="text-sm text-muted-foreground px-1 py-10">
                불러오는 중…
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-sm text-muted-foreground px-1 py-10">
                표시할 꽃이 없어요.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 items-stretch">
                {filtered.map((f) => {
                  const qty = owned[f.id] ?? 0;
                  const has = qty > 0;
                  return (
                    <Card
                      key={f.id}
                      className={`relative overflow-hidden ${
                        gradeTone[f.grade]
                      } ${has ? "" : "opacity-60 grayscale"}`}
                    >
                      {has && (
                        <Badge
                          className="absolute right-2 top-2 z-20 border border-black/20 bg-black/75 text-white shadow-sm"
                          variant="secondary"
                        >
                          x{qty}
                        </Badge>
                      )}
                      <CardContent className="flex aspect-[4/5] flex-col overflow-hidden p-0">
                        <div className="relative min-h-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.42),rgba(0,0,0,0.08)_72%)]">
                          <img
                            src={imgSrc(f.label)}
                            alt={f.label}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/18 via-transparent to-white/10" />
                        </div>
                        <div className="flex min-h-[48px] items-center justify-between gap-2 border-t border-black/10 bg-white/92 p-3 text-neutral-950 shadow-[0_-8px_18px_-16px_rgba(0,0,0,0.65)]">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">
                              {f.label}
                            </div>
                          </div>
                          <div className="shrink-0 text-sm font-bold tabular-nums text-amber-700">
                            🪙 {f.price.toLocaleString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="px-6 pb-6 pt-3">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
