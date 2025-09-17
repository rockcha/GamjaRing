import { useEffect, useMemo, useState } from "react";
import { supabase, getBoard, getInventory, getPlaced } from "./supa";
import type { BoardMeta, InventoryRow, PlacedSticker } from "./types";

export function useStickerBoard(coupleId?: string | null) {
  const [board, setBoard] = useState<BoardMeta>({
    couple_id: coupleId ?? "",
    width: 1280,
    height: 720,
    bg_url: null,
  });
  const [placed, setPlaced] = useState<PlacedSticker[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  // 초기 로드
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [b, p, inv] = await Promise.all([
        getBoard(coupleId),
        getPlaced(coupleId),
        getInventory(coupleId),
      ]);
      setBoard(b);
      setPlaced(p);
      setInventory(inv);
      setLoading(false);
    })();
  }, [coupleId]);

  // Realtime sync (stickers)
  useEffect(() => {
    if (!coupleId) return;

    const chSt = supabase
      .channel(`rt:stickers:${coupleId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stickers",
          filter: `couple_id=eq.${coupleId}`,
        },
        (payload) => {
          setPlaced((prev) => {
            const m = new Map(prev.map((s) => [s.id, s]));
            if (
              payload.eventType === "INSERT" ||
              payload.eventType === "UPDATE"
            ) {
              m.set((payload.new as any).id, payload.new as any);
            } else if (payload.eventType === "DELETE") {
              m.delete((payload.old as any).id);
            }
            return Array.from(m.values()).sort(
              (a, b) => (a.z ?? 0) - (b.z ?? 0)
            );
          });
        }
      )
      .subscribe();

    const chInv = supabase
      .channel(`rt:inventory:${coupleId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sticker_inventory",
          filter: `couple_id=eq.${coupleId}`,
        },
        async () => {
          const inv = await getInventory(coupleId);
          setInventory(inv);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chSt);
      supabase.removeChannel(chInv);
    };
  }, [coupleId]);

  // ✅ 상점 구매 등 외부 이벤트로 인벤토리 강제 최신화
  useEffect(() => {
    if (!coupleId) return;
    const onBump = async (ev: any) => {
      if (ev?.detail?.coupleId && ev.detail.coupleId !== coupleId) return;
      const inv = await getInventory(coupleId);
      setInventory(inv);
    };
    window.addEventListener("sticker-inventory-updated", onBump);
    return () =>
      window.removeEventListener("sticker-inventory-updated", onBump);
  }, [coupleId]);

  // Debounced updater
  const saveDebounced = useMemo(() => {
    let t: any;
    return (fn: () => void, ms = 120) => {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }, []);

  return {
    board,
    placed,
    setPlaced,
    inventory,
    setInventory,
    loading,
    saveDebounced,
  };
}
