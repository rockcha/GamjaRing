// src/features/seeds/SeedShopButton.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";

type Seed = {
  id: number;
  label: string;
  price: number;
  bloom_hours: number;
  description?: string | null;
};

type QtyState = Record<number, string>;
type OwnedMap = Record<number, number>;

type Props = {
  className?: string;
  /** 구매 성공 직후, 증가한 수량을 알림: { [seedId]: +qty } */
  onPurchased?: (delta: Record<number, number>) => void;
  /** 서버 리프레시(선택). 부모가 주면 구매 후 호출 */
  onSync?: () => Promise<void> | void;
};

export default function SeedShopButton({
  className,
  onPurchased,
  onSync,
}: Props) {
  const { couple, gold, spendGold } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  const [open, setOpen] = useState(false);

  const [seeds, setSeeds] = useState<Seed[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [qtyMap, setQtyMap] = useState<QtyState>({ 1: "1", 2: "1", 3: "1" });
  const [owned, setOwned] = useState<OwnedMap>({}); // seed_id -> qty

  const loadSeeds = useCallback(async () => {
    const { data, error } = await supabase
      .from("seeds")
      .select("id,label,price,bloom_hours,description")
      .in("id", [1, 2, 3])
      .order("id", { ascending: true });

    if (error) {
      console.warn("[SeedShop] load seeds error:", error.message);
      // 폴백
      setSeeds([
        {
          id: 1,
          label: "일반 씨앗",
          price: 30,
          bloom_hours: 6,
          description: "흔하게 구할 수 있는 일반적인 씨앗.",
        },
        {
          id: 2,
          label: "미스터리 씨앗",
          price: 80,
          bloom_hours: 10,
          description: "어떤 꽃의 씨앗인지 알 수 없는 수수께끼의 씨앗.",
        },
        {
          id: 3,
          label: "신화 씨앗",
          price: 160,
          bloom_hours: 14,
          description:
            "최소 희귀 등급의 꽃의 씨앗. 구하기 힘들지만, 그만큼 보상이 따른다.",
        },
      ]);
      return;
    }
    setSeeds(
      (data ?? []).length
        ? data!
        : [
            {
              id: 1,
              label: "일반 씨앗",
              price: 30,
              bloom_hours: 6,
              description: "흔하게 구할 수 있는 일반적인 씨앗.",
            },
            {
              id: 2,
              label: "미스터리 씨앗",
              price: 80,
              bloom_hours: 10,
              description: "어떤 꽃의 씨앗인지 알 수 없는 수수께끼의 씨앗.",
            },
            {
              id: 3,
              label: "신화 씨앗",
              price: 160,
              bloom_hours: 14,
              description:
                "최소 희귀 등급의 꽃의 씨앗. 구하기 힘들지만, 그만큼 보상이 따른다.",
            },
          ]
    );
  }, []);

  const loadOwned = useCallback(async () => {
    if (!coupleId) return setOwned({});
    const { data, error } = await supabase
      .from("seed_ownerships")
      .select("seed_id, qty")
      .eq("couple_id", coupleId);
    if (error) {
      console.warn("[SeedShop] load owned error:", error.message);
      return;
    }
    const map: OwnedMap = {};
    (data ?? []).forEach((r: any) => (map[r.seed_id] = Number(r.qty ?? 0)));
    setOwned(map);
  }, [coupleId]);

  useEffect(() => {
    if (!open) return;
    void loadSeeds();
    void loadOwned();
  }, [open, loadSeeds, loadOwned]);

  const safeQty = useCallback(
    (seedId: number) => {
      const n = Math.floor(Number(qtyMap[seedId]));
      return Number.isFinite(n) && n > 0 ? n : 1;
    },
    [qtyMap]
  );

  const totalById = useMemo(() => {
    const map: Record<number, number> = {};
    (seeds ?? []).forEach((s) => {
      map[s.id] = s.price * safeQty(s.id);
    });
    return map;
  }, [seeds, safeQty]);

  const imgSrc = (label: string) =>
    `/flowers/seeds/${encodeURIComponent(label)}.png`;

  const refreshOwned = useCallback(async () => {
    await loadOwned();
  }, [loadOwned]);

  const handleBuy = useCallback(
    async (seed: Seed) => {
      if (!coupleId) {
        toast.error("커플 정보가 없습니다.");
        return;
      }
      const qty = safeQty(seed.id);
      const need = seed.price * qty;

      if (need <= 0) {
        toast.error("수량을 확인해주세요.");
        return;
      }
      if (gold < need) {
        toast.error("골드가 부족합니다 🪙");
        return;
      }

      setLoading(true);
      try {
        // 1) 골드 차감
        const { error: spendErr } = await spendGold(need);
        if (spendErr) throw spendErr;

        // 2) 수량 증가 (RPC 우선)
        const { error: rpcErr } = await supabase.rpc("seed_add_qty", {
          p_seed_id: seed.id,
          p_couple_id: coupleId,
          p_qty: qty,
        });

        if (rpcErr) {
          // 폴백: select→update/insert
          const { data: cur, error: selErr } = await supabase
            .from("seed_ownerships")
            .select("qty")
            .eq("seed_id", seed.id)
            .eq("couple_id", coupleId)
            .maybeSingle();
          if (selErr) throw selErr;

          if (cur) {
            const nextQty = Number(cur.qty ?? 0) + qty;
            const { error: updErr } = await supabase
              .from("seed_ownerships")
              .update({ qty: nextQty })
              .eq("seed_id", seed.id)
              .eq("couple_id", coupleId);
            if (updErr) throw updErr;
          } else {
            const { error: insErr } = await supabase
              .from("seed_ownerships")
              .insert({ seed_id: seed.id, couple_id: coupleId, qty });
            if (insErr) throw insErr;
          }
        }

        // ✅ 내부 카드 표시도 갱신
        setOwned((m) => ({ ...m, [seed.id]: (m[seed.id] ?? 0) + qty }));
        setQtyMap((m) => ({ ...m, [seed.id]: "1" }));

        // ✅ 부모에게 “구매됨” 알림 → 텃밭 즉시 반영
        onPurchased?.({ [seed.id]: qty });

        toast.success(`"${seed.label}" ${qty}개 구매 완료! 🌱`);

        // (선택) 서버 정합성 재확인
        void refreshOwned();
        if (onSync) {
          await onSync();
        }
      } catch (e: any) {
        console.error("[SeedShop] buy error:", e?.message ?? e);
        toast.error(e?.message ?? "구매 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [coupleId, gold, spendGold, safeQty, onPurchased, onSync, refreshOwned]
  );

  return (
    <>
      <Button className={className} onClick={() => setOpen(true)}>
        씨앗 상점
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="text-xl flex items-center justify-between gap-4">
              <span>🌼 씨앗 상점</span>
              <span className="text-base font-medium text-muted-foreground mt-4">
                보유 골드:{" "}
                <span className="font-semibold">
                  🪙 {gold.toLocaleString()}
                </span>
              </span>
            </DialogTitle>
            <DialogDescription className="px-0">
              원하는 씨앗을 선택해 한 번에 여러 개 구매할 수 있어요.
            </DialogDescription>
          </DialogHeader>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-muted to-transparent" />

          <ScrollArea className="max-h-[70vh] px-6 py-5">
            {seeds ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
                {seeds.map((seed) => (
                  <Card
                    key={seed.id}
                    className="h-full flex flex-col border-muted/60 hover:shadow-sm transition-shadow"
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center justify-between gap-3">
                        <span className="truncate">{seed.label}</span>
                        <Badge
                          variant="secondary"
                          className="whitespace-nowrap"
                        >
                          ⏳ {seed.bloom_hours}h
                        </Badge>
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col space-y-3">
                      <div className="w-full aspect-square rounded-2xl overflow-hidden bg-muted/30 grid place-items-center">
                        <img
                          src={imgSrc(seed.label)}
                          alt={`${seed.label} icon`}
                          className="max-h-[80%] max-w-[80%] object-contain"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>

                      {seed.description ? (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {seed.description}
                        </p>
                      ) : null}

                      <div className="flex items-center justify-between">
                        <div className="text-lg font-semibold">
                          🪙 {seed.price.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          보유:{" "}
                          <span className="font-medium">
                            {owned[seed.id] ?? 0}
                          </span>
                          개
                        </div>
                      </div>

                      <div className="mt-auto flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor={`qty-${seed.id}`}
                            className="text-sm text-muted-foreground"
                          >
                            수량
                          </label>
                          <Input
                            id={`qty-${seed.id}`}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={qtyMap[seed.id] ?? "1"}
                            onChange={(e) =>
                              setQtyMap((m) => ({
                                ...m,
                                [seed.id]: e.target.value,
                              }))
                            }
                            className="w-20 text-right"
                            placeholder="1"
                          />
                        </div>
                        <div className="text-muted-foreground">
                          총액:{" "}
                          <span className="font-semibold">
                            🪙 {(totalById[seed.id] ?? 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-0 mt-auto">
                      <Button
                        className="w-full"
                        onClick={() => handleBuy(seed)}
                        disabled={loading || !coupleId}
                      >
                        {loading ? "구매 중..." : `구매`}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground px-1 py-10">
                씨앗 정보를 불러오는 중…
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
