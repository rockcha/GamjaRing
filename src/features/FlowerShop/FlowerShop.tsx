// src/features/FlowerShop/FlowerShop.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Flower2,
  Loader2,
  PackageOpen,
  ReceiptText,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCoupleContext } from "@/contexts/CoupleContext";
import supabase from "@/lib/supabase";
import { cn } from "@/lib/utils";
import FlowerDexButton from "./FlowerDexButton";

type Grade = "일반" | "희귀" | "에픽";
type Flower = { id: string; label: string; grade: Grade; price: number };
type OwnedMap = Record<string, number>;

type OrderSlot =
  | { state: "empty" }
  | { state: "ordered"; flower: Flower }
  | { state: "sold" };

const SLOT_COUNT = 8;
const ORDER_COST = 20;
const PROB = { normal: 0.6, rare: 0.35, epic: 0.05 } as const;

const GRADE_LABEL: Record<Grade, string> = {
  일반: "일반",
  희귀: "희귀",
  에픽: "에픽",
};

const GRADE_TONE: Record<Grade, string> = {
  일반: "border-slate-200 bg-slate-50/70",
  희귀: "border-sky-200 bg-sky-50/80",
  에픽: "border-violet-200 bg-violet-50/80",
};

const GRADE_BADGE: Record<Grade, string> = {
  일반: "bg-slate-100 text-slate-700 border-slate-200",
  희귀: "bg-sky-100 text-sky-700 border-sky-200",
  에픽: "bg-violet-100 text-violet-700 border-violet-200",
};

export default function FlowerShop() {
  const { couple, gold, spendGold, addGold } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  const [flowers, setFlowers] = useState<Flower[]>([]);
  const [owned, setOwned] = useState<OwnedMap>({});
  const [invTab, setInvTab] = useState<"all" | Grade>("all");
  const [slots, setSlots] = useState<OrderSlot[]>(
    Array.from({ length: SLOT_COUNT }, () => ({ state: "empty" })),
  );

  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [selling, setSelling] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

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
    if (!coupleId) {
      setOwned({});
      return;
    }

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
    (data ?? []).forEach((row: any) => {
      map[row.flower_id] = Number(row.qty ?? 0);
    });
    setOwned(map);
  }, [coupleId]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      await Promise.all([loadFlowers(), loadOwned()]);
      if (mounted) setLoading(false);
    }

    load();
    return () => {
      mounted = false;
      setSlots(Array.from({ length: SLOT_COUNT }, () => ({ state: "empty" })));
    };
  }, [loadFlowers, loadOwned]);

  const imgSrc = (label: string) => `/flowers/${encodeURIComponent(label)}.png`;

  const pools = useMemo(
    () => ({
      일반: flowers.filter((flower) => flower.grade === "일반"),
      희귀: flowers.filter((flower) => flower.grade === "희귀"),
      에픽: flowers.filter((flower) => flower.grade === "에픽"),
    }),
    [flowers],
  );

  const ownedList = useMemo(() => {
    let list = flowers.filter((flower) => (owned[flower.id] ?? 0) > 0);
    if (invTab !== "all") {
      list = list.filter((flower) => flower.grade === invTab);
    }
    return list;
  }, [flowers, invTab, owned]);

  const ownedTotal = useMemo(
    () => Object.values(owned).reduce((sum, qty) => sum + qty, 0),
    [owned],
  );

  const pickGrade = (): Grade => {
    const r = Math.random();
    if (r < PROB.normal) return "일반";
    if (r < PROB.normal + PROB.rare) return "희귀";
    return "에픽";
  };

  const pickOne = (): Flower | null => {
    const grade = pickGrade();
    const pool = pools[grade];
    if (pool.length > 0)
      return pool[Math.floor(Math.random() * pool.length)] ?? null;
    if (flowers.length === 0) return null;
    return flowers[Math.floor(Math.random() * flowers.length)] ?? null;
  };

  const makeOrders = () => {
    setSlots(
      Array.from({ length: SLOT_COUNT }, () => {
        const flower = pickOne();
        return flower ? { state: "ordered", flower } : { state: "empty" };
      }),
    );
  };

  const handleOrder = async () => {
    if (ordering) return;
    if ((gold ?? 0) < ORDER_COST) {
      toast.error(`골드가 부족해요. ${ORDER_COST}골드가 필요합니다.`);
      return;
    }

    setOrdering(true);
    try {
      const { error } = await spendGold(ORDER_COST);
      if (error) throw error;

      setSlots(Array.from({ length: SLOT_COUNT }, () => ({ state: "empty" })));
      window.setTimeout(() => {
        makeOrders();
        toast.success("새 주문 목록이 도착했어요.");
        setOrdering(false);
      }, 250);
    } catch (error: any) {
      toast.error(error?.message ?? "주문을 불러오지 못했어요.");
      setOrdering(false);
    }
  };

  const sell = async (flower: Flower, index: number) => {
    if (!coupleId || selling) return;
    if ((owned[flower.id] ?? 0) <= 0) {
      toast.error("보유 수량이 없어요.");
      return;
    }

    setSelling(flower.id);
    try {
      const { data: current, error: selectError } = await supabase
        .from("flowers_inventory")
        .select("qty")
        .eq("couple_id", coupleId)
        .eq("flower_id", flower.id)
        .maybeSingle();
      if (selectError) throw selectError;

      const nextQty = Math.max(0, Number(current?.qty ?? 0) - 1);
      const { error: updateError } = await supabase
        .from("flowers_inventory")
        .update({ qty: nextQty })
        .eq("couple_id", coupleId)
        .eq("flower_id", flower.id);
      if (updateError) throw updateError;

      const { error: goldError } = await addGold(flower.price);
      if (goldError) throw goldError;

      setOwned((prev) => ({ ...prev, [flower.id]: nextQty }));
      setSlots((prev) =>
        prev.map((slot, slotIndex) =>
          slotIndex === index ? { state: "sold" } : slot,
        ),
      );

      toast.success(
        `${flower.label} 판매 완료. +${flower.price.toLocaleString()}골드`,
      );
    } catch (error: any) {
      toast.error(error?.message ?? "판매 중 오류가 발생했어요.");
    } finally {
      setSelling(null);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="border-border/80 bg-white shadow-sm">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <Tabs
              value={invTab}
              onValueChange={(value) => setInvTab(value as any)}
            >
              <TabsList>
                <TabsTrigger value="all">전체</TabsTrigger>
                <TabsTrigger value="일반">일반</TabsTrigger>
                <TabsTrigger value="희귀">희귀</TabsTrigger>
                <TabsTrigger value="에픽">에픽</TabsTrigger>
              </TabsList>
            </Tabs>
            <FlowerDexButton />
            <Button onClick={() => setOpen(true)} className="gap-2">
              <ReceiptText className="size-4" />
              주문 받기
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-white shadow-sm">
        <CardContent className="p-4 md:p-5">
          <ScrollArea className="h-[min(68vh,720px)] pr-2">
            {loading ? (
              <FlowerGridSkeleton />
            ) : ownedList.length === 0 ? (
              <EmptyInventory />
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
                {ownedList.map((flower) => (
                  <FlowerInventoryCard
                    key={flower.id}
                    flower={flower}
                    qty={owned[flower.id] ?? 0}
                    imgSrc={imgSrc(flower.label)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ReceiptText className="size-5 text-pink-600" />
              주문 목록
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3">
              {slots.map((slot, index) => {
                if (slot.state === "empty") {
                  return <EmptyOrderSlot key={`empty-${index}`} />;
                }

                if (slot.state === "sold") {
                  return <SoldOrderSlot key={`sold-${index}`} />;
                }

                const flower = slot.flower;
                const qty = Number(owned[flower.id] ?? 0);
                const hasFlower = qty > 0;
                const isSelling = selling === flower.id;

                return (
                  <button
                    key={`${flower.id}-${index}`}
                    type="button"
                    disabled={isSelling}
                    aria-busy={isSelling}
                    onClick={() => {
                      if (!hasFlower) {
                        toast.error("보유 수량이 없어요.");
                        return;
                      }
                      sell(flower, index);
                    }}
                    className={cn(
                      "relative overflow-hidden rounded-lg border p-2 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200",
                      GRADE_TONE[flower.grade],
                    )}
                  >
                    <div className="relative aspect-square overflow-hidden rounded-md bg-white/70">
                      <img
                        src={imgSrc(flower.label)}
                        alt={flower.label}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                      {isSelling && (
                        <div className="absolute inset-0 grid place-items-center bg-white/70">
                          <Loader2 className="size-5 animate-spin text-pink-600" />
                        </div>
                      )}
                    </div>

                    <div className="mt-2 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-sm font-semibold leading-5">
                          {flower.label}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn("shrink-0", GRADE_BADGE[flower.grade])}
                        >
                          {GRADE_LABEL[flower.grade]}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>보유 x{qty}</span>
                        <span className="font-semibold text-foreground">
                          +{flower.price.toLocaleString()}G
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground">
              주문 목록은 창을 닫아도 유지돼요. 보유 꽃이 있는 주문을 누르면
              판매됩니다.
            </p>
          </div>

          <DialogFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              보유 골드{" "}
              <span className="font-semibold text-foreground">
                {Number(gold ?? 0).toLocaleString("ko-KR")}G
              </span>
            </div>

            <Button onClick={handleOrder} disabled={ordering} className="gap-2">
              {ordering ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  주문 받는 중
                </>
              ) : (
                <>주문 받기 -{ORDER_COST}G</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FlowerInventoryCard({
  flower,
  qty,
  imgSrc,
}: {
  flower: Flower;
  qty: number;
  imgSrc: string;
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden border shadow-sm",
        GRADE_TONE[flower.grade],
      )}
    >
      <CardContent className="p-0">
        <div className="relative aspect-[4/5] bg-white/70">
          <img
            src={imgSrc}
            alt={flower.label}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <Badge className="absolute right-2 top-2 bg-black/75 text-white">
            x{qty}
          </Badge>
          <Badge
            variant="outline"
            className={cn("absolute left-2 top-2", GRADE_BADGE[flower.grade])}
          >
            {GRADE_LABEL[flower.grade]}
          </Badge>
        </div>
        <div className="border-t bg-white/90 px-3 py-2">
          <p className="truncate text-sm font-semibold">{flower.label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            판매가 {flower.price.toLocaleString("ko-KR")}G
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function FlowerGridSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
      {Array.from({ length: 14 }).map((_, index) => (
        <Skeleton key={index} className="aspect-[4/5] rounded-lg" />
      ))}
    </div>
  );
}

function EmptyInventory() {
  return (
    <div className="grid min-h-[320px] place-items-center rounded-lg border border-dashed bg-muted/20 p-8 text-center">
      <div>
        <PackageOpen className="mx-auto mb-3 size-9 text-muted-foreground" />
        <p className="font-medium">보유한 꽃이 없어요</p>
        <p className="mt-1 text-sm text-muted-foreground">
          정원에서 씨앗을 심고 꽃을 수확해보세요.
        </p>
      </div>
    </div>
  );
}

function EmptyOrderSlot() {
  return (
    <div className="grid aspect-[4/5] place-items-center rounded-lg border border-dashed bg-muted/20 p-3 text-center text-sm text-muted-foreground">
      <div>
        <Search className="mx-auto mb-2 size-5" />
        대기 슬롯
      </div>
    </div>
  );
}

function SoldOrderSlot() {
  return (
    <div className="grid aspect-[4/5] place-items-center rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center text-sm font-medium text-emerald-700">
      판매 완료
    </div>
  );
}
