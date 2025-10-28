// src/features/flowers/FlowerShop.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";
import FlowerDexButton from "./FlowerDexButton";
import { Loader2 } from "lucide-react";

type Grade = "일반" | "희귀" | "에픽";
type Flower = { id: string; label: string; grade: Grade; price: number };
type OwnedMap = Record<string, number>;

type OrderSlot =
  | { state: "empty" }
  | { state: "ordered"; flower: Flower }
  | { state: "sold" };

const gradeTone: Record<Grade, string> = {
  일반: "ring-1 ring-neutral-200/70 bg-neutral-50/70 dark:bg-neutral-950/50 dark:ring-neutral-800/60 shadow-[0_8px_30px_-12px_rgba(0,0,0,.25)]",
  희귀: "ring-1 ring-sky-300/60 bg-sky-50/60 dark:bg-sky-950/30 dark:ring-sky-900/50 shadow-[0_10px_32px_-12px_rgba(56,189,248,.45)]",
  에픽: "ring-1 ring-violet-300/60 bg-violet-50/60 dark:bg-violet-950/30 dark:ring-violet-900/50 shadow-[0_10px_32px_-12px_rgba(167,139,250,.50)]",
};

const PROB = { normal: 0.6, rare: 0.35, epic: 0.05 } as const;

export default function FlowerShop() {
  const { couple, gold, spendGold, addGold } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  const [flowers, setFlowers] = useState<Flower[]>([]);
  const [owned, setOwned] = useState<OwnedMap>({});
  const [invTab, setInvTab] = useState<"all" | Grade>("all");
  // ✅ 슬롯 8개
  const [slots, setSlots] = useState<OrderSlot[]>(
    Array.from({ length: 8 }, () => ({ state: "empty" }))
  );
  const [loading, setLoading] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [selling, setSelling] = useState<string | null>(null);

  // Dialog
  const [open, setOpen] = useState(false);

  /** ===== 데이터 로드 ===== */
  const loadFlowers = useCallback(async () => {
    const { data, error } = await supabase
      .from("flowers")
      .select("id,label,grade,price")
      .order("grade", { ascending: true })
      .order("price", { ascending: true });
    if (error) {
      console.warn("[FlowerShop] load flowers error:", error.message);
      setFlowers([]);
      return;
    }
    setFlowers((data ?? []) as Flower[]);
  }, []);

  const loadOwned = useCallback(async () => {
    if (!coupleId) return setOwned({});
    const { data, error } = await supabase
      .from("flowers_inventory")
      .select("flower_id, qty")
      .eq("couple_id", coupleId);
    if (error) {
      console.warn("[FlowerShop] load owned error:", error.message);
      setOwned({});
      return;
    }
    const map: OwnedMap = {};
    (data ?? []).forEach((r: any) => (map[r.flower_id] = Number(r.qty ?? 0)));
    setOwned(map);
  }, [coupleId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadFlowers(), loadOwned()]).finally(() => setLoading(false));
    return () =>
      setSlots(Array.from({ length: 8 }, () => ({ state: "empty" })));
  }, [loadFlowers, loadOwned]);

  /** ===== 유틸 ===== */
  const imgSrc = (label: string) => `/flowers/${encodeURIComponent(label)}.png`;

  const pools = useMemo(() => {
    return {
      일반: flowers.filter((f) => f.grade === "일반"),
      희귀: flowers.filter((f) => f.grade === "희귀"),
      에픽: flowers.filter((f) => f.grade === "에픽"),
    };
  }, [flowers]);

  const pickGrade = () => {
    const r = Math.random();
    if (r < PROB.normal) return "일반" as Grade;
    if (r < PROB.normal + PROB.rare) return "희귀" as Grade;
    return "에픽" as Grade;
  };

  const pickOne = (): Flower | null => {
    const g = pickGrade();
    const pool = pools[g];
    if (pool.length === 0) {
      if (flowers.length === 0) return null;
      return flowers[Math.floor(Math.random() * flowers.length)];
    }
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const makeOrders = () => {
    const list: OrderSlot[] = [];
    for (let i = 0; i < 8; i++) {
      const f = pickOne();
      if (f) list.push({ state: "ordered", flower: f });
      else list.push({ state: "empty" });
    }
    setSlots(list);
  };

  /** ===== 주문 받기(🪙20, 무조건 지불) ===== */
  const handleOrder = async () => {
    if (ordering) return;
    if ((gold ?? 0) < 20) {
      toast.error("골드가 부족합니다. 🪙20 필요");
      return;
    }
    setOrdering(true);
    try {
      const { error } = await spendGold(20);
      if (error) throw error;
      setSlots(Array.from({ length: 8 }, () => ({ state: "empty" })));
      setTimeout(() => {
        makeOrders();
        toast.success("새로운 꽃 주문이 도착했어요! ✉️");
        setOrdering(false);
      }, 360);
    } catch (e: any) {
      toast.error(e?.message ?? "주문 생성 중 오류");
      setOrdering(false);
    }
  };

  /** ===== 판매 ===== */
  const sell = async (flower: Flower, idx: number) => {
    if (!coupleId) return;
    if ((owned[flower.id] ?? 0) <= 0) {
      toast.error("보유 수량이 없습니다.");
      return;
    }
    if (selling) return;
    setSelling(flower.id);
    try {
      const { data: cur, error: selErr } = await supabase
        .from("flowers_inventory")
        .select("qty")
        .eq("couple_id", coupleId)
        .eq("flower_id", flower.id)
        .maybeSingle();
      if (selErr) throw selErr;

      const nextQty = Math.max(0, Number(cur?.qty ?? 0) - 1);
      const { error: updErr } = await supabase
        .from("flowers_inventory")
        .update({ qty: nextQty })
        .eq("couple_id", coupleId)
        .eq("flower_id", flower.id);
      if (updErr) throw updErr;

      const { error: goldErr } = await addGold(flower.price);
      if (goldErr) throw goldErr;

      setOwned((m) => ({ ...m, [flower.id]: nextQty }));
      setSlots((prev) =>
        prev.map((s, i) => (i === idx ? { state: "empty" } : s))
      );
      toast.success(
        `"${flower.label}" 판매 완료! +🪙 ${flower.price.toLocaleString()}`
      );
    } catch (e: any) {
      toast.error(e?.message ?? "판매 중 오류");
    } finally {
      setSelling(null);
    }
  };

  /** ===== 인벤토리 (보유만) ===== */
  const ownedList = useMemo(() => {
    let list = flowers.filter((f) => (owned[f.id] ?? 0) > 0);
    if (invTab !== "all") list = list.filter((f) => f.grade === invTab);
    return list;
  }, [flowers, owned, invTab]);

  return (
    <div className="space-y-5">
      {/* 헤더: 제목/탭 + (우측) 꽃도감 & 주문 받기 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-extrabold tracking-tight">꽃 인벤토리</h2>
          <Tabs value={invTab} onValueChange={(v) => setInvTab(v as any)}>
            <TabsList className="rounded-full bg-background/60 supports-[backdrop-filter]:bg-background/60">
              <TabsTrigger className="rounded-full" value="all">
                전체
              </TabsTrigger>
              <TabsTrigger className="rounded-full" value="일반">
                일반
              </TabsTrigger>
              <TabsTrigger className="rounded-full" value="희귀">
                희귀
              </TabsTrigger>
              <TabsTrigger className="rounded-full" value="에픽">
                에픽
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* 오른쪽: 꽃 도감 버튼 → 주문 받기 버튼 순서 */}
        <div className="flex items-center gap-2">
          <FlowerDexButton />
          <Button
            onClick={() => setOpen(true)}
            className="h-10 rounded-xl px-4 font-semibold gap-2 shadow-sm"
          >
            {/* 이모지 표기 */}
            <span aria-hidden>🧾</span>
            주문 받기
          </Button>
        </div>
      </div>

      {/* 인벤토리: 메인 풀-와이드 강조 */}
      <Card className="border-muted/60">
        <CardContent className="pt-4">
          <ScrollArea className="h-[66vh] pr-2">
            {loading ? (
              <div className="text-sm text-muted-foreground py-10">
                불러오는 중…
              </div>
            ) : ownedList.length === 0 ? (
              <div className="text-sm text-muted-foreground py-10 space-y-2 text-center">
                <div>보유한 꽃이 없습니다.</div>
                <div className="text-xs">
                  먼저 뒤뜰에서 씨앗을 심어보세요! 🌱
                </div>
              </div>
            ) : (
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {ownedList.map((f) => (
                  <Card
                    key={f.id}
                    className={`relative overflow-hidden transition-shadow hover:shadow-md ${
                      gradeTone[f.grade]
                    }`}
                  >
                    <Badge
                      className="absolute right-2 top-2 shadow-sm border border-black/20 bg-black/80 text-white px-2.5 py-1 font-mono font-bold"
                      variant="secondary"
                    >
                      x{owned[f.id] ?? 0}
                    </Badge>
                    <CardContent className="p-3 flex flex-col gap-2">
                      <div
                        className="w-full aspect-square rounded-xl overflow-hidden grid place-items-center
                                   bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,.06),transparent)]
                                   border border-white/10"
                      >
                        <img
                          src={imgSrc(f.label)}
                          alt={f.label}
                          className="max-h-[85%] max-w-[85%] object-contain"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      <div className="text-sm font-semibold break-words tracking-tight text-center">
                        {f.label}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* ===== 주문 다이얼로그 ===== */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span aria-hidden>🧾</span>
                주문 목록
              </span>
              {/* 요청에 따라 안내 문구 제거 */}
              <span className="sr-only">주문 안내</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
              {slots.map((slot, idx) => {
                if (slot.state === "empty") {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="rounded-xl grid border-2 border-dashed border-border/60 bg-background/40 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]"
                    >
                      <div className="aspect-square w-full grid place-items-center text-xs font-medium">
                        대기 슬롯
                      </div>
                    </div>
                  );
                }

                if (slot.state === "sold") {
                  return (
                    <div
                      key={`sold-${idx}`}
                      className="relative rounded-xl grid bg-emerald-50/60 dark:bg-emerald-900/20 border border-emerald-200/60 shadow-[inset_0_0_0_1px_rgba(16,185,129,.25)]"
                    >
                      <div className="aspect-square w-full grid place-items-center text-sm">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                          판매 완료
                        </span>
                      </div>
                      <span className="absolute -rotate-12 top-2 left-2 text-[10px] px-1.5 py-0.5 rounded bg-emerald-600/10 border border-emerald-600/30 text-emerald-700">
                        DONE
                      </span>
                    </div>
                  );
                }

                const f = slot.flower;
                const has = (owned[f.id] ?? 0) > 0;

                return (
                  <button
                    key={`${f.id}-${idx}`}
                    className={`group relative overflow-hidden border p-2 text-left rounded-xl ${
                      gradeTone[f.grade]
                    } transition-transform hover:scale-[1.01]`}
                    disabled={selling === f.id}
                    aria-busy={selling === f.id}
                    onClick={async () => {
                      if (!has) {
                        toast.error("보유 수량이 없습니다.");
                        return;
                      }
                      await sell(f, idx);
                    }}
                  >
                    <div
                      className="aspect-square w-full grid place-items-center rounded-lg overflow-hidden
                                 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,.06),transparent)]
                                 border border-white/10"
                    >
                      <img
                        src={imgSrc(f.label)}
                        alt={f.label}
                        className="max-h-[75%] max-w-[75%] object-contain"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>

                    {/* 이름 */}
                    <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-2 text-[11px] font-semibold px-2 py-1 rounded-full bg-black/35 text-white border border-white/10">
                      {f.label}
                    </div>

                    {/* 가격 + 미보유 배지(좌하단, 붉은 계열) */}
                    {!has && (
                      <span
                        className="pointer-events-none absolute bottom-2 left-2 rounded-full px-2 py-1 text-[10px] font-semibold
                                   bg-red-600/20 text-red-700 dark:text-red-300 border border-red-600/30"
                      >
                        미보유
                      </span>
                    )}
                    <span className="pointer-events-none absolute bottom-2 right-2 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums bg-black/40 text-white border border-white/10 shadow-sm">
                      🪙 {f.price.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground">
              💡 다이얼로그를 닫아도 주문 목록은 유지돼요. (꽃집을 떠나면
              초기화)
            </p>
          </div>

          <DialogFooter className="flex items-center justify-between gap-3 sm:justify-between">
            <div className="text-sm text-muted-foreground">
              현재 골드:{" "}
              <span className="font-semibold tabular-nums">
                🪙 {Number(gold ?? 0).toLocaleString()}
              </span>
            </div>

            {/* ✅ “다시 받기” 제거, 무조건 20 지불 버튼만 */}
            <Button
              onClick={handleOrder}
              disabled={ordering}
              className="gap-2 rounded-xl"
            >
              {ordering ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  수령 중…
                </>
              ) : (
                <>🪙 20 새 주문 받기</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
