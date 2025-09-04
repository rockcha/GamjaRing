// src/features/producer/BrowseProducersButton.tsx
"use client";

import { useEffect, useState } from "react";
import { PRODUCERS, type Producer } from "./type";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { toast } from "sonner";
import { fetchFieldProducers, addProducer } from "@/features/producer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  INGREDIENT_EMOJI,
  type IngredientTitle,
} from "@/features/kitchen/type";
import GoldDisplay from "../aquarium/GoldDisplay";
import { Coins, Clock } from "lucide-react";

function formatHours(h: number) {
  const totalMin = Math.round(h * 60);
  const HH = Math.floor(totalMin / 60);
  const MM = totalMin % 60;
  if (HH > 0 && MM > 0) return `${HH}시간 ${MM}분`;
  if (HH > 0) return `${HH}시간`;
  return `${MM}분`;
}

// 재료 이모지
function producesEmojis(p: Producer) {
  return p.produces.map((t) => INGREDIENT_EMOJI[t as IngredientTitle] ?? "❓");
}

export default function BrowseProducersButton({
  className,
  onPurchased,
}: {
  className?: string;
  onPurchased?: () => void;
}) {
  const { user } = useUser();
  const coupleId = user?.couple_id ?? null;

  const { gold, addGold } = useCoupleContext();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [ownedCount, setOwnedCount] = useState<Record<string, number>>({});

  const loadOwned = async () => {
    if (!coupleId) return;
    setLoading(true);
    try {
      const list = await fetchFieldProducers(coupleId);
      const map: Record<string, number> = {};
      list.forEach((fp) => {
        map[fp.title] = (map[fp.title] ?? 0) + 1;
      });
      setOwnedCount(map);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (v: boolean) => {
    setOpen(v);
    if (v) loadOwned();
  };

  const [buyingId, setBuyingId] = useState<string | null>(null);

  const handleBuy = async (prod: Producer) => {
    if (!coupleId) {
      toast.warning("커플 연결 후 이용할 수 있어요.");
      return;
    }
    if (buyingId) return;
    if (typeof gold === "number" && gold < prod.price) {
      toast.warning("골드가 부족해요.");
      return;
    }

    try {
      setBuyingId(prod.id);
      await addGold(-prod.price);
      await addProducer(coupleId, prod.name);
      setOwnedCount((m) => ({ ...m, [prod.name]: (m[prod.name] ?? 0) + 1 }));
      toast.success(`구매 완료: ${prod.name}`);
      onPurchased?.();
    } catch (e) {
      console.error(e);
      try {
        await addGold(prod.price);
      } catch {
        /* noop */
      }
      toast.error("구매에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => handleOpen(true)}
        className={cn("gap-2", className)}
      >
        🛒 생산수단 둘러보기
      </Button>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
          <div className="flex flex-col min-h-[420px] max-h-[80vh]">
            {/* 제목 + 골드 우측 정렬 */}
            <DialogHeader className="px-4 pt-4 pb-2 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <DialogTitle>생산수단 목록</DialogTitle>
                <GoldDisplay className="mr-8" />
              </div>
            </DialogHeader>

            {/* 본문 */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-40 rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {PRODUCERS.map((p) => {
                    const have = ownedCount[p.name] ?? 0;
                    const canAfford =
                      typeof gold !== "number" ? true : gold >= p.price;
                    const emoji = producesEmojis(p);

                    return (
                      <div
                        key={p.id}
                        className={cn(
                          "group relative rounded-xl border p-3 bg-white",
                          "hover:shadow-sm transition"
                        )}
                      >
                        {/* 상단: 이름 + 보유수 */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-neutral-800 truncate">
                              {p.name}
                            </div>
                          </div>
                          {have > 0 && (
                            <div className="shrink-0 rounded-md bg-neutral-50 px-2 py-1 text-xs border">
                              보유 {have}
                            </div>
                          )}
                        </div>

                        {/* 이미지 + 좌상단 이모지 배지 */}
                        <div className="mt-2 relative">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-full h-auto rounded-lg object-contain"
                            draggable={false}
                            loading="lazy"
                          />
                          {emoji.length > 0 && (
                            <span
                              className="
                                absolute top-0 left-0
                                inline-flex items-center gap-1 rounded-full
                                border bg-white/90 backdrop-blur px-2 py-1
                                text-sm shadow-sm
                              "
                              title="생산 가능 재료"
                            >
                              {emoji.join(" ")}
                            </span>
                          )}
                        </div>

                        {/* 메타: 아이콘+값 뱃지들 */}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <span className="inline-flex items-center gap-1 rounded-full border bg-neutral-50 px-2 py-1">
                            <Coins className="h-3.5 w-3.5 text-amber-500" />
                            {p.price.toLocaleString()}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full border bg-neutral-50 px-2 py-1">
                            <Clock className="h-3.5 w-3.5 text-sky-600" />
                            {formatHours(p.timeSec)}
                          </span>
                        </div>

                        {/* 액션: 오른쪽 버튼만 */}
                        <div className="mt-3 flex items-center justify-end">
                          <Button
                            size="sm"
                            disabled={buyingId === p.id || !canAfford}
                            onClick={() => handleBuy(p)}
                            className={cn(
                              "shrink-0",
                              !canAfford && "opacity-60 cursor-not-allowed"
                            )}
                          >
                            {buyingId === p.id
                              ? "구매 중…"
                              : canAfford
                              ? "내 농장에 추가"
                              : "골드 부족"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="px-4 pb-4 shrink-0">
              <Button variant="outline" onClick={() => handleOpen(false)}>
                닫기
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
