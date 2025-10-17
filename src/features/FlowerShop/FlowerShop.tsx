// src/features/flowers/FlowerShop.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const [slots, setSlots] = useState<OrderSlot[]>(
    Array.from({ length: 5 }, () => ({ state: "empty" }))
  );
  const [loading, setLoading] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [selling, setSelling] = useState<string | null>(null);

  // 데이터 로드
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
      setSlots(Array.from({ length: 5 }, () => ({ state: "empty" })));
  }, [loadFlowers, loadOwned]);

  // 유틸
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
    for (let i = 0; i < 5; i++) {
      const f = pickOne();
      if (f) list.push({ state: "ordered", flower: f });
      else list.push({ state: "empty" });
    }
    setSlots(list);
  };

  // 주문 받기 (🪙20)
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
      setSlots(Array.from({ length: 5 }, () => ({ state: "empty" })));
      setTimeout(() => {
        makeOrders();
        toast.success("새로운 꽃 주문이 도착했어요! ✉️");
        setOrdering(false);
      }, 350);
    } catch (e: any) {
      toast.error(e?.message ?? "주문 생성 중 오류");
      setOrdering(false);
    }
  };

  // 판매
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

  // 인벤토리(보유만)
  const ownedList = useMemo(() => {
    let list = flowers.filter((f) => (owned[f.id] ?? 0) > 0);
    if (invTab !== "all") list = list.filter((f) => f.grade === invTab);
    return list;
  }, [flowers, owned, invTab]);

  const trayVariants = {
    initial: (i: number) => ({ opacity: 0, x: 60, scale: 0.98 }),
    animate: (i: number) => ({
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 240,
        damping: 22,
        delay: 0.05 * (4 - i),
      },
    }),
    exit: { opacity: 0, x: -24, scale: 0.98, transition: { duration: 0.15 } },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* 좌: 인벤토리 */}
      <section className="lg:col-span-5">
        {/* 헤더 라인: 제목 + 탭 + 꽃 도감 버튼 */}
        <div className="mb-3 flex flex-wrap items-center gap-2 justify-between">
          <h2 className="text-lg font-bold tracking-tight">인벤토리</h2>

          <div className="flex items-center gap-2">
            {/* 🔧 blur 제거 */}
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

            <FlowerDexButton />
          </div>
        </div>

        <ScrollArea className="h-[60vh] pr-2">
          {loading ? (
            <div className="text-sm text-muted-foreground py-10">
              불러오는 중…
            </div>
          ) : ownedList.length === 0 ? (
            <div className="text-sm text-muted-foreground py-10 space-y-2">
              <div>보유한 꽃이 없습니다.</div>
              <div className="text-xs">먼저 뒤뜰에서 씨앗을 심어보세요! 🌱</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ownedList.map((f) => (
                <Card
                  key={f.id}
                  className={`relative overflow-hidden ${
                    gradeTone[f.grade]
                  } transition-shadow`}
                >
                  <Badge
                    className="absolute right-2 top-2 shadow-sm border border-black/20 bg-black/80 text-white px-2.5 py-1 font-mono font-bold"
                    variant="secondary"
                  >
                    x{owned[f.id] ?? 0}
                  </Badge>

                  <CardContent className="p-3 flex flex-col gap-2">
                    {/* 🔧 blur 제거 & 배경은 미세한 그라데이션만 유지 */}
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
      </section>

      {/* 우: 주문 받는 섹션 */}
      <section className="lg:col-span-7 mt-6 lg:mt-10">
        <Card className="border-muted/60">
          {/* 🔧 sticky header의 blur 제거 */}
          <CardHeader className="pb-2 sticky top-0 z-10 bg-background/60 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">🧾 주문 받기</CardTitle>
              <div className="flex items-center gap-3">
                {ordering && (
                  <span className="text-sm text-amber-600 flex items-center gap-1">
                    <Loader2 className="size-4 animate-spin" />
                    수령 중…
                  </span>
                )}

                <Button
                  onClick={handleOrder}
                  disabled={ordering}
                  className="gap-2"
                >
                  {ordering ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      수령 중…
                    </>
                  ) : (
                    <>🪙 20 주문 받기</>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-3">
            <AnimatePresence mode="popLayout">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {slots.map((slot, idx) => {
                  if (slot.state === "empty") {
                    return (
                      <motion.div
                        key={`empty-${idx}`}
                        layout
                        initial={{ opacity: 0.4, scale: 0.96 }}
                        animate={{ opacity: 0.8, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="rounded-xl h-40 grid place-items-center text-xs font-medium
                        border-2 border-dashed border-border/60 bg-background/40
                        shadow-[inset_0_1px_0_rgba(255,255,255,.04)]"
                      >
                        대기 슬롯
                      </motion.div>
                    );
                  }

                  if (slot.state === "sold") {
                    return (
                      <motion.div
                        key={`sold-${idx}`}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative rounded-xl h-40 grid place-items-center text-sm
                        bg-emerald-50/60 dark:bg-emerald-900/20 border border-emerald-200/60
                        shadow-[inset_0_0_0_1px_rgba(16,185,129,.25)]"
                      >
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                          판매 완료
                        </span>
                        <span
                          className="absolute -rotate-12 top-2 left-2 text-[10px] px-1.5 py-0.5 rounded
                          bg-emerald-600/10 border border-emerald-600/30 text-emerald-700"
                        >
                          DONE
                        </span>
                      </motion.div>
                    );
                  }

                  const f = slot.flower;
                  const has = (owned[f.id] ?? 0) > 0;

                  return (
                    <motion.button
                      key={`${f.id}-${idx}`}
                      layout
                      custom={idx}
                      variants={trayVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      whileHover={{ y: -2, scale: 1.02 }}
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 22,
                      }}
                      className={`group relative overflow-hidden rounded-xl h-40 border p-2 text-left ${
                        gradeTone[f.grade]
                      } 
                      before:absolute before:inset-0 before:content-[''] before:opacity-0 
                      before:transition-opacity before:duration-300 active:before:opacity-20 before:bg-white/30`}
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
                      {/* 이미지 컨테이너 — 🔧 blur 제거 */}
                      <div
                        className="w-full h-full grid place-items-center rounded-lg overflow-hidden
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

                      {/* 🔧 이름 라벨: 가로 중앙 정렬 */}
                      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-2 text-[11px] font-semibold px-2 py-1 rounded-full bg-black/35 text-white border border-white/10">
                        {f.label}
                      </div>

                      {/* 가격 Pill */}
                      <div className="pointer-events-none absolute bottom-2 right-2">
                        <span className="rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums bg-black/40 text-white border border-white/10 shadow-sm">
                          🪙 {f.price.toLocaleString()}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </AnimatePresence>

            <p className="mt-3 text-xs text-muted-foreground">
              💡 Tip: 꽃집을 나가면 현재 주문 목록은 사라져요.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
