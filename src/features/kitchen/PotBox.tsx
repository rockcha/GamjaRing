// src/features/kitchen/PotBox.tsx
"use client";

import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { ChefHat, ShoppingBag, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import supabase from "@/lib/supabase";
import { toast } from "sonner";

type CookingPot = {
  id: number;
  title: string;
  price: number;
  description: string | null;
};

type OwnedPot = {
  pot_id: number;
  is_representative: boolean;
  purchased_at?: string;
};

type FloatingItem = { id: number; emoji: string };

export default function PotBox({
  canCook = false,
  onCook,
  floatingEmojis = [],
  totalRequired = 0,
  stagedTotal = 0,
  // ⬇️ 조리 중 오버레이 제어 (KitchenPage에서 넘겨줘)
  isCooking = false,
  cookingLabel,
}: {
  canCook?: boolean;
  onCook?: () => void;
  floatingEmojis?: FloatingItem[];
  totalRequired?: number;
  stagedTotal?: number;
  isCooking?: boolean;
  cookingLabel?: string; // 예: `${recipe?.name} 만드는 중…`
}) {
  const [openShop, setOpenShop] = useState(false);

  // 보유/대표/상점
  const [loadingOwned, setLoadingOwned] = useState(false);
  const [owned, setOwned] = useState<OwnedPot[]>([]);
  const repPotId = useMemo(
    () => owned.find((o) => o.is_representative)?.pot_id ?? null,
    [owned]
  );

  const [loadingShop, setLoadingShop] = useState(false);
  const [pots, setPots] = useState<CookingPot[]>([]);
  const [actionBusy, setActionBusy] = useState<number | null>(null);

  // id -> title 로컬 맵 (불필요한 단건 조회 줄이기)
  const potTitleMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of pots) m.set(p.id, p.title);
    return m;
  }, [pots]);

  const fetchOwned = async () => {
    try {
      setLoadingOwned(true);
      const { data, error } = await supabase
        .from("couple_pot_inventory")
        .select("pot_id, is_representative, purchased_at")
        .order("purchased_at", { ascending: true });
      if (error) throw error;
      setOwned((data ?? []) as OwnedPot[]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "보유 중인 냄비를 불러오지 못했어요.");
    } finally {
      setLoadingOwned(false);
    }
  };

  const fetchShop = async () => {
    try {
      setLoadingShop(true);
      const { data, error } = await supabase
        .from("cooking_pots")
        .select("id, title, price, description")
        .order("id", { ascending: true });
      if (error) throw error;
      setPots((data ?? []) as CookingPot[]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "상점 목록을 불러오지 못했어요.");
    } finally {
      setLoadingShop(false);
    }
  };

  useEffect(() => {
    fetchOwned();
  }, []);

  useEffect(() => {
    if (openShop) {
      fetchShop();
      fetchOwned();
    }
  }, [openShop]);

  const getPotImagePath = (title: string | null | undefined) =>
    title ? `/cooking/${encodeURIComponent(title)}.png` : "";

  // 대표 냄비 이미지 (기본값 1 제거 + 레이스 가드 + 로컬맵 우선)
  const [repImageSrc, setRepImageSrc] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 대표가 확정되지 않았다면 아무 것도 바꾸지 않음 (기본냄비 강제 X)
      if (repPotId == null) return;

      // 1) 로컬 맵에서 먼저 시도 (요청 줄이기)
      const localTitle = potTitleMap.get(repPotId);
      if (localTitle) {
        if (!cancelled) setRepImageSrc(getPotImagePath(localTitle));
        return;
      }

      // 2) 없으면 단건 조회 (in-flight 가드)
      const { data, error } = await supabase
        .from("cooking_pots")
        .select("title")
        .eq("id", repPotId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error(error);
        setRepImageSrc(null);
        return;
      }
      setRepImageSrc(getPotImagePath(data?.title));
    })();

    return () => {
      cancelled = true;
    };
  }, [repPotId, potTitleMap]);

  // 낙관적 갱신
  const markOwnedOptimistic = (potId: number) => {
    setOwned((prev) =>
      prev.some((o) => o.pot_id === potId)
        ? prev
        : [
            ...prev,
            {
              pot_id: potId,
              is_representative: false,
              purchased_at: new Date().toISOString(),
            },
          ]
    );
  };
  const markRepOptimistic = (potId: number) => {
    setOwned((prev) =>
      prev.map((o) =>
        o.pot_id === potId
          ? { ...o, is_representative: true }
          : { ...o, is_representative: false }
      )
    );
  };

  const handleMakeRepresentative = async (potId: number) => {
    try {
      setActionBusy(potId);
      markRepOptimistic(potId);
      const { error } = await supabase.rpc("buy_cooking_pot", {
        p_pot_id: potId,
        p_set_as_rep: true,
      });
      if (error) throw error;
      toast.success("대표 냄비로 설정했어요!");
      await fetchOwned();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "대표 설정에 실패했어요.");
      fetchOwned();
    } finally {
      setActionBusy(null);
    }
  };

  const handleBuy = async (pot: CookingPot) => {
    try {
      setActionBusy(pot.id);
      markOwnedOptimistic(pot.id);
      const { error } = await supabase.rpc("buy_cooking_pot", {
        p_pot_id: pot.id,
        p_set_as_rep: false,
      });
      if (error) throw error;
      toast.success("구매 완료!");
      await Promise.all([fetchOwned(), fetchShop()]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "구매에 실패했어요.");
      fetchOwned();
    } finally {
      setActionBusy(null);
    }
  };

  const ownedIds = useMemo(() => new Set(owned.map((o) => o.pot_id)), [owned]);
  const isOwned = (id: number) => ownedIds.has(id);

  // 진행도
  const progress =
    totalRequired > 0
      ? Math.min(100, Math.round((stagedTotal / totalRequired) * 100))
      : 0;

  return (
    <div className="relative overflow-hidden rounded-2xl p-4 bg-none">
      <div className="relative z-10">
        <div className="relative h-[260px] sm:h-[300px] md:h-[320px]">
          {/* 대표 냄비 배경 */}
          {repImageSrc && (
            <div
              className="pointer-events-none absolute inset-0 bg-center bg-contain bg-no-repeat transition-opacity duration-300"
              style={{ backgroundImage: `url(${repImageSrc})` }}
              aria-hidden
            />
          )}

          {/* 진행도: 상단 중앙 */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[78%] sm:w-[70%]">
            <div className="relative">
              <Progress
                value={progress}
                className={`
                  h-2 rounded-full bg-amber-100/80 backdrop-blur-sm
                  shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]
                  [&>div]:bg-gradient-to-r [&>div]:from-amber-400 [&>div]:to-rose-400
                  [&>div]:shadow-[0_1px_8px_rgba(244,114,182,0.35)]
                `}
              />
              <div className="pointer-events-none mt-1 flex items-center justify-center text-[11px]">
                {progress === 100 ? (
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border">
                    완료
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {stagedTotal}/{totalRequired} · {progress}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 이모지 팝-페이드 레이어 */}
          <FloatingEmojiLayer items={floatingEmojis} />

          {/* 좌하단: 상점 */}
          <div className="absolute left-0 bottom-0 p-2">
            <Button
              size="sm"
              variant="secondary"
              className="h-8 px-2 gap-1 pointer-events-auto"
              onClick={() => setOpenShop(true)}
              title="냄비 상점"
            >
              <ShoppingBag className="h-4 w-4" />
              상점
            </Button>
          </div>

          {/* 우하단: 조리 시작 */}
          <div className="absolute right-0 bottom-0 p-2">
            <Button
              className={[
                "gap-1 px-3 transition-all",
                canCook
                  ? "hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                  : "opacity-60 cursor-not-allowed",
              ].join(" ")}
              size="sm"
              onClick={onCook}
              disabled={!canCook}
              title={canCook ? "조리 시작" : "재료/감자 수량이 맞지 않아요"}
            >
              <ChefHat className="h-4 w-4" />
              조리 시작
            </Button>
          </div>
        </div>
      </div>

      {/* 상점 모달 */}
      <Dialog open={openShop} onOpenChange={setOpenShop}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>냄비 상점</DialogTitle>
            <DialogDescription>
              이미지, 제목, 설명을 확인하고 구매하거나 대표로 지정할 수 있어요.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border">
            <ScrollArea className="h-[480px] p-4">
              {loadingShop ? (
                <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  불러오는 중…
                </div>
              ) : pots.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  판매 중인 냄비가 없어요.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pots.map((p) => {
                    const ownedFlag = isOwned(p.id);
                    const isRep = repPotId === p.id;
                    const busy = actionBusy === p.id;
                    const imgSrc = getPotImagePath(p.title);
                    return (
                      <Card key={p.id} className="p-3 flex flex-col">
                        <div className="aspect-square rounded-md overflow-hidden border bg-muted/30 grid place-items-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imgSrc}
                            alt={p.title}
                            className="h-full w-full object-contain"
                            loading="lazy"
                          />
                        </div>
                        <div className="mt-3 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{p.title}</h3>
                            {isRep && <Badge>대표</Badge>}
                            {ownedFlag && !isRep && (
                              <Badge variant="secondary">보유</Badge>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                            {p.description}
                          </p>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="text-sm">
                            <span className="font-semibold">{p.price}</span>{" "}
                            골드
                          </div>
                          {!ownedFlag ? (
                            <Button
                              size="sm"
                              disabled={busy}
                              onClick={() => handleBuy(p)}
                              className="gap-1"
                              title="구매하기"
                            >
                              {busy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ShoppingBag className="h-4 w-4" />
                              )}
                              구매
                            </Button>
                          ) : isRep ? (
                            <Button size="sm" disabled className="gap-1">
                              <Crown className="h-4 w-4" />
                              대표
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              disabled={busy}
                              onClick={() => handleMakeRepresentative(p.id)}
                              className="gap-1"
                              title="대표로 지정"
                            >
                              {busy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Crown className="h-4 w-4" />
                              )}
                              대표로
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        /* 더 부드러운 팝-페이드 (크게, opacity/scale만) */
        @keyframes popFadeSoft {
          0%   { opacity: 0; transform: translate3d(-50%, 0, 0) scale(0.88); }
          22%  { opacity: 1; transform: translate3d(-50%, 0, 0) scale(1.04); }
          76%  { opacity: 1; transform: translate3d(-50%, 0, 0) scale(1.08); }
          100% { opacity: 0; transform: translate3d(-50%, 0, 0) scale(1.12); }
        }

        /* 조리 중 오버레이: 김(steam) + 빛(glow) */
        @keyframes steamRise {
          0%   { opacity: 0; transform: translate3d(0, 4%, 0) scale(0.8); }
          20%  { opacity: 0.85; }
          100% { opacity: 0; transform: translate3d(0, -28%, 0) scale(1.05); }
        }
        @keyframes heatPulse {
          0%,100% { opacity: .18; transform: scale(1); }
          50%     { opacity: .34; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}

/** ─────────────────────────────────────────────────────────
 *  깜빡임 최소화를 위한 이모지 레이어
 *  - memo + 결정적 오프셋(CSS 변수) + contain: paint
 *  - 부모의 다른 상태 변경(progress 등)과 독립적으로 동작
 *  ───────────────────────────────────────────────────────── */
const FloatingEmojiLayer = memo(function FloatingEmojiLayer({
  items,
}: {
  items: FloatingItem[];
}) {
  const styleVarsFor = (id: number): React.CSSProperties => {
    const slot = ((id % 9) + 9) % 9; // 0..8
    const xOffsetPct = (slot - 4) * 4; // -16..16
    const delayMs = (id % 6) * 80; // 0..400
    const scale = 1 + (id % 3) * 0.04; // 1,1.04,1.08
    return {
      ["--x" as any]: `${xOffsetPct}%`,
      ["--delay" as any]: `${delayMs}ms`,
      ["--scale" as any]: scale.toString(),
    };
  };

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ contain: "paint" as any }}
      aria-hidden
    >
      {items.map((f) => (
        <span
          key={f.id}
          className="absolute select-none will-change-[opacity,transform] transform-gpu text-5xl sm:text-6xl"
          style={{
            left: "calc(50% + var(--x))",
            top: "24%",
            transform: "translate3d(-50%, 0, 0) scale(var(--scale))",
            animation:
              "popFadeSoft 1.6s var(--delay) cubic-bezier(.22,.61,.36,1) forwards",
            WebkitBackfaceVisibility: "hidden",
            backfaceVisibility: "hidden",
            ...styleVarsFor(f.id),
          }}
        >
          {f.emoji}
        </span>
      ))}
    </div>
  );
});
