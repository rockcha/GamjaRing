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

// ✅ 알림 전송 (생산시설구매)
import { sendUserNotification } from "@/utils/notification/sendUserNotification";

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
  const [buyingId, setBuyingId] = useState<string | null>(null);

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

      // ✅ 파트너에게 "생산시설구매" 알림 전송 (실패해도 구매는 유지)
      try {
        if (user?.id && user?.partner_id) {
          await sendUserNotification({
            senderId: user.id,
            receiverId: user.partner_id,
            type: "생산시설구매",
            itemName: prod.name,
          });
        }
      } catch (e) {
        console.warn("생산시설 구매 알림 전송 실패(무시 가능):", e);
      }
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
        🛒 생산시설 상점
      </Button>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent
          className={cn(
            "p-0 overflow-hidden", // 테두리/라운드 유지
            // ▶ 폭: 모바일 거의 풀사이즈, 데스크탑 중형
            "w-[calc(100vw-1.5rem)] sm:w-auto sm:max-w-4xl",
            // ▶ 높이: 고정 X, 최대 높이만 지정하여 중앙 정렬/스크롤 보장
            "max-h-[90dvh] md:max-h-[85vh]"
          )}
        >
          {/* 3분할 레이아웃: 헤더/본문(스크롤)/푸터 */}
          <div className="grid grid-rows-[auto_minmax(0,1fr)_auto] max-h-[90dvh] md:max-h-[85vh]">
            {/* 헤더: sticky 아니어도 상관없지만, 상단 고정 원하면 sticky 유지 가능 */}
            <DialogHeader className="px-4 pt-4 pb-2 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
              <div className="flex items-center justify-between gap-3">
                <DialogTitle className="text-base sm:text-lg">
                  생산수단 목록
                </DialogTitle>
                <GoldDisplay className="mr-1 sm:mr-2" />
              </div>
            </DialogHeader>

            {/* 본문: 오직 여기만 스크롤 */}
            <div className="overflow-y-auto px-3 sm:px-4 py-3">
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton
                      key={i}
                      className="h-40 sm:h-44 lg:h-48 rounded-xl"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                  {PRODUCERS.map((p) => {
                    const have = ownedCount[p.name] ?? 0;
                    const canAfford =
                      typeof gold !== "number" ? true : gold >= p.price;
                    const emoji = producesEmojis(p);

                    return (
                      <div
                        key={p.id}
                        className={cn(
                          "relative rounded-xl border bg-[#FAF7F2] p-2 sm:p-3 shadow-sm",
                          "transition-all hover:shadow-[0_10px_28px_-18px_rgba(0,0,0,0.25)]"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-neutral-800 truncate text-sm sm:text-base">
                            {p.name}
                          </div>
                          {have > 0 && (
                            <span className="shrink-0 rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] sm:text-xs border">
                              보유 {have}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 relative">
                          <div className="w-full rounded-lg overflow-hidden border bg-white">
                            <div className="aspect-[4/3] w-full">
                              <img
                                src={p.image}
                                alt={p.name}
                                className="h-full w-full object-contain"
                                draggable={false}
                                loading="lazy"
                              />
                            </div>
                          </div>

                          {emoji.length > 0 && (
                            <span
                              className="
                          absolute top-1 left-1 sm:top-1.5 sm:left-1.5
                          inline-flex items-center gap-1 rounded-full
                          border bg-white/90 backdrop-blur px-1.5 sm:px-2 py-0.5
                          text-xs sm:text-sm shadow-sm
                        "
                              title="생산 가능 재료"
                            >
                              {emoji.join(" ")}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
                          <span className="inline-flex items-center gap-1 rounded-full border bg-neutral-50 px-1.5 sm:px-2 py-0.5">
                            <Coins className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-500" />
                            {p.price.toLocaleString()}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full border bg-neutral-50 px-1.5 sm:px-2 py-0.5">
                            <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-sky-600" />
                            {formatHours(p.timeSec)}
                          </span>
                        </div>

                        <div className="mt-2 sm:mt-3 flex justify-end">
                          <Button
                            size="sm"
                            className="h-8 px-2.5 sm:px-3"
                            disabled={buyingId === p.id || !canAfford}
                            onClick={() => handleBuy(p)}
                          >
                            {buyingId === p.id
                              ? "구매 중…"
                              : canAfford
                              ? "구매하기"
                              : "골드 부족"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 푸터 */}
            <DialogFooter className="px-3 sm:px-4 py-2 sm:py-3 border-t bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
              <div className="w-full flex items-center justify-end">
                <Button variant="outline" onClick={() => handleOpen(false)}>
                  닫기
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
