// src/features/aquarium/AquariumDetailButton.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { useUser } from "@/contexts/UserContext";
import { FISH_BY_ID, type FishRarity } from "./fishes";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  Info,
  X,
  Fish as FishIcon,
  BadgeDollarSign,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type FishId = string;
type RarityFilter = "전체" | "일반" | "희귀" | "에픽" | "전설";

function RarityBadge({ r }: { r: FishRarity }) {
  const cls =
    r === "일반"
      ? "bg-neutral-100 text-neutral-800 border-neutral-200"
      : r === "희귀"
      ? "bg-sky-100 text-sky-900 border-sky-200"
      : r === "에픽"
      ? "bg-violet-100 text-violet-900 border-violet-200"
      : "bg-amber-100 text-amber-900 border-amber-200";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        cls
      )}
    >
      {r}
    </span>
  );
}

/** 희귀도별 카드/썸네일 톤 매핑 */
const RARITY_CARD_CLASS: Record<FishRarity, string> = {
  일반: "bg-neutral-50/80 border-neutral-200 text-slate-800 dark:bg-neutral-900/20 dark:border-neutral-700",
  희귀: "bg-sky-50/80 border-sky-200 text-slate-800 dark:bg-sky-900/20 dark:border-sky-800",
  에픽: "bg-violet-50/80 border-violet-200 text-slate-800 dark:bg-violet-900/20 dark:border-violet-800",
  전설: "bg-amber-50/80 border-amber-200 text-slate-800 dark:bg-amber-900/20 dark:border-amber-800",
};

const RARITY_IMG_RING: Record<FishRarity, string> = {
  일반: "ring-neutral-200 hover:ring-neutral-300 focus:ring-2 focus:ring-neutral-400/60",
  희귀: "ring-sky-200 hover:ring-sky-300 focus:ring-2 focus:ring-sky-400/60",
  에픽: "ring-violet-200 hover:ring-violet-300 focus:ring-2 focus:ring-violet-400/60",
  전설: "ring-amber-200 hover:ring-amber-300 focus:ring-2 focus:ring-amber-400/60",
};

export default function AquariumDetailButton({
  className,
  buttonLabel = "상세보기",
  onChanged,
}: {
  className?: string;
  buttonLabel?: string;
  onChanged?: () => void;
}) {
  const { couple } = useCoupleContext();
  const { user } = useUser();
  const coupleId = couple?.id ?? null;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fishIds, setFishIds] = useState<FishId[]>([]);
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>("전체");

  // 판매 확인 모달 상태
  const [confirm, setConfirm] = useState<{
    fishId: string;
    countBefore: number;
    sellPrice: number;
    image: string;
    label: string;
  } | null>(null);

  // 이미지 프리뷰(확대) 상태
  const [preview, setPreview] = useState<{ src: string; alt: string } | null>(
    null
  );

  const loadAquarium = async () => {
    if (!coupleId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("couple_aquarium")
        .select("aquarium_fishes")
        .eq("couple_id", coupleId)
        .maybeSingle();

      if (error) throw error;
      const arr = Array.isArray(data?.aquarium_fishes)
        ? (data!.aquarium_fishes as string[])
        : [];
      setFishIds(arr);
    } catch (e) {
      console.error(e);
      toast.error("어항 정보를 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void loadAquarium();
  }, [open]);

  // ESC로 미리보기/모달 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (preview) setPreview(null);
        else if (open) setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, preview]);

  /** 보유수 맵, 카드 리스트 */
  const countsById = useMemo(() => {
    const m = new Map<string, number>();
    for (const id of fishIds) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [fishIds]);

  const items = useMemo(() => {
    const rarityOrder: Record<FishRarity, number> = {
      전설: 0,
      에픽: 1,
      희귀: 2,
      일반: 3,
    };
    const list = [...countsById.entries()]
      .map(([id, count]) => {
        const fish = FISH_BY_ID[id];
        if (!fish) return null;
        const cost = fish.cost ?? 0;
        return {
          id,
          count,
          label: fish.labelKo,
          rarity: fish.rarity as FishRarity,
          sellPrice: Math.floor(cost / 2),
          image: fish.image,
          isWild: (fish as any).isWild,
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      count: number;
      label: string;
      rarity: FishRarity;
      sellPrice: number;
      image: string;
      isWild?: boolean;
    }>;
    list.sort((a, b) => {
      const r = rarityOrder[a.rarity] - rarityOrder[b.rarity];
      return r !== 0 ? r : a.label.localeCompare(b.label, "ko");
    });
    return list;
  }, [countsById]);

  /** 필터 적용 */
  const filteredItems = useMemo(
    () =>
      items.filter(
        (it) => rarityFilter === "전체" || it.rarity === rarityFilter
      ),
    [items, rarityFilter]
  );

  /** 판매 확인창 띄우기 */
  const askSell = (fishId: string) => {
    const it = items.find((x) => x.id === fishId);
    if (!it || it.count <= 0) return;
    setConfirm({
      fishId,
      countBefore: it.count,
      sellPrice: it.sellPrice,
      image: it.image,
      label: it.label,
    });
  };

  /** 실제 판매 처리 */
  const handleSell = async () => {
    if (!confirm || !coupleId) return;
    const { fishId, sellPrice, label } = confirm;

    try {
      setLoading(true);

      // 1) aquarium_fishes에서 해당 어종 1개 제거
      const firstIdx = fishIds.findIndex((f) => f === fishId);
      if (firstIdx === -1) {
        toast.error("이미 목록에서 삭제된 항목이에요.");
        setConfirm(null);
        return;
      }
      const nextFishIds = fishIds.slice();
      nextFishIds.splice(firstIdx, 1);

      const { error: upErr } = await supabase
        .from("couple_aquarium")
        .update({ aquarium_fishes: nextFishIds })
        .eq("couple_id", coupleId);
      if (upErr) throw upErr;

      // 2) couples.gold 증가
      const { data: coupleRow, error: getCoupleErr } = await supabase
        .from("couples")
        .select("gold")
        .eq("id", coupleId)
        .maybeSingle();
      if (getCoupleErr) throw getCoupleErr;

      const curGold = Number(coupleRow?.gold ?? 0);
      const { error: goldErr } = await supabase
        .from("couples")
        .update({ gold: curGold + sellPrice })
        .eq("id", coupleId);
      if (goldErr) throw goldErr;

      // 3) 알림 전송(선택)
      try {
        if (user?.id && (user as any)?.partner_id) {
          await sendUserNotification({
            senderId: user.id,
            receiverId: (user as any).partner_id,
            type: "물품판매",
            itemName: label,
          });
        }
      } catch (e) {
        console.warn("판매 알림 전송 실패(무시 가능):", e);
      }

      // 4) 로컬 반영
      setFishIds(nextFishIds);
      toast.success(
        `${label} 1마리 판매 완료 (+${sellPrice.toLocaleString("ko-KR")} 골드)`
      );
      setConfirm(null);
      onChanged?.();
    } catch (e) {
      console.error(e);
      toast.error("판매 처리 중 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 버튼 */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "rounded-full bg-white/90 backdrop-blur px-3 py-1.5",
          "text-sm font-semibold text-slate-800 shadow border hover:bg-white",
          "inline-flex items-center gap-1",
          className
        )}
        title="아쿠아리움 상세보기"
      >
        <Info className="w-4 h-4" />
        {buttonLabel}
      </button>

      {/* 상세 모달 */}
      <div
        className={cn(
          "fixed inset-0 z-[80] flex items-center justify-center bg-black/50 transition-opacity",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      >
        <div
          className={cn(
            "w-[1000px] max-w-[95vw] max-h-[75vh] overflow-auto rounded-2xl bg-white p-5 shadow-xl relative transition-transform",
            open ? "scale-100" : "scale-95"
          )}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* 헤더 (sticky) */}
          <div className="sticky top-0 z-10 -mx-5 px-5 pt-4 pb-3 mb-4 bg-white/90 backdrop-blur border-b border-gray-100">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">아쿠아리움 상세</h3>
                <span className="text-sm text-slate-600">
                  종류 <b>{items.length}</b> · 총 <b>{fishIds.length}</b>마리
                </span>
              </div>

              {/* 희귀도 필터 */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="rarityFilter"
                  className="text-sm text-slate-600 whitespace-nowrap"
                >
                  희귀도
                </label>
                <select
                  id="rarityFilter"
                  value={rarityFilter}
                  onChange={(e) =>
                    setRarityFilter(e.target.value as RarityFilter)
                  }
                  className="text-sm border rounded-md px-2 py-1 bg-white"
                >
                  <option value="전체">전체</option>
                  <option value="일반">일반</option>
                  <option value="희귀">희귀</option>
                  <option value="에픽">에픽</option>
                  <option value="전설">전설</option>
                </select>

                <button
                  onClick={() => setOpen(false)}
                  className="ml-2 p-1.5 rounded-md border hover:bg-gray-50"
                  aria-label="닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 본문 */}
          {loading ? (
            <div className="py-16 text-center text-slate-600">불러오는 중…</div>
          ) : filteredItems.length === 0 ? (
            <div className="py-16 text-center text-slate-600">
              표시할 물고기가 없어요.
            </div>
          ) : (
            // 2열 그리드(간격 확대)
            <div className="grid grid-cols-2 gap-4 sm:gap-5">
              {filteredItems.map((it) => (
                <div
                  key={it.id}
                  className={cn(
                    "grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border p-4",
                    RARITY_CARD_CLASS[it.rarity]
                  )}
                >
                  {/* 썸네일 컨테이너: 등급별 링 컬러 */}
                  <button
                    type="button"
                    onClick={() => setPreview({ src: it.image, alt: it.label })}
                    className={cn(
                      "group relative w-28 h-24 sm:w-32 sm:h-28 rounded-xl",
                      "bg-white/85 backdrop-blur-[2px] shadow-sm overflow-hidden ring-1",
                      RARITY_IMG_RING[it.rarity]
                    )}
                    title={`${it.label} 확대 보기`}
                  >
                    <img
                      src={it.image}
                      alt={it.label}
                      className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-[1.06]"
                      draggable={false}
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/5 to-transparent" />
                  </button>

                  {/* 텍스트 */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold truncate">{it.label}</div>
                      <RarityBadge r={it.rarity} />
                      {it.isWild && (
                        <span className="rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 text-[10px] font-semibold">
                          야생
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 flex items-center gap-3 text-[12px] text-gray-700">
                      <span className="inline-flex items-center gap-1">
                        <FishIcon className="w-3.5 h-3.5" />
                        보유{" "}
                        <b className="text-gray-900 ml-0.5">
                          {countsById.get(it.id) ?? 0}
                        </b>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <BadgeDollarSign className="w-3.5 h-3.5" />
                        판매가{" "}
                        <b className="text-amber-700 ml-0.5">
                          {it.sellPrice.toLocaleString("ko-KR")}
                        </b>
                      </span>
                    </div>
                  </div>

                  {/* 액션 */}
                  <Button
                    disabled={(countsById.get(it.id) ?? 0) <= 0 || loading}
                    onClick={() => askSell(it.id)}
                    className={cn(
                      "shrink-0",
                      (countsById.get(it.id) ?? 0) > 0
                        ? "bg-amber-600 hover:bg-amber-700 text-white"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    )}
                  >
                    판매
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 판매 확인 모달 */}
      <div
        className={cn(
          "fixed inset-0 z-[90] flex items-center justify-center bg-black/50 transition-opacity",
          confirm
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
        onClick={() => setConfirm(null)}
        aria-hidden={!confirm}
      >
        <div
          className="w-[420px] max-w-[85vw] rounded-2xl bg-white p-4 shadow-xl relative"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {confirm && (
            <>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-base font-bold">판매 확인</h4>
                <button
                  onClick={() => setConfirm(null)}
                  className="p-1.5 rounded-md border hover:bg-gray-50"
                  aria-label="닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-3">
                <img
                  src={confirm.image}
                  alt={confirm.label}
                  className="w-20 h-20 object-contain rounded-md bg-white ring-1 ring-gray-200"
                  draggable={false}
                />
                <div className="flex-1">
                  <div className="font-semibold">{confirm.label}</div>
                  <div className="mt-1 text-sm text-gray-700">
                    판매가{" "}
                    <b className="text-amber-700">
                      {confirm.sellPrice.toLocaleString("ko-KR")}
                    </b>{" "}
                    골드
                  </div>
                  <div className="mt-1 text-sm text-gray-700 inline-flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    수량: {confirm.countBefore} →{" "}
                    <b className="text-rose-700">{confirm.countBefore - 1}</b>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-sm">
                이 물고기 1마리를 판매하시겠습니까?
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setConfirm(null)}
                  className="border-gray-200"
                >
                  취소
                </Button>
                <Button
                  onClick={handleSell}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  판매
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 이미지 미리보기(확대) */}
      <div
        className={cn(
          "fixed inset-0 z-[95] flex items-center justify-center bg-black/70 transition-opacity",
          preview
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
        onClick={() => setPreview(null)}
        aria-hidden={!preview}
      >
        {preview && (
          <div
            className="relative max-w-[90vw] max-h-[80vh] p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={preview.src}
              alt={preview.alt}
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl ring-1 ring-white/20 bg-white/5"
              draggable={false}
            />
            <button
              onClick={() => setPreview(null)}
              className="absolute -top-3 -right-3 p-2 rounded-full bg-white text-slate-800 shadow ring-1 ring-black/10"
              aria-label="미리보기 닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
