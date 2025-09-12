// src/features/kitchen/IngredientFishingSection.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { fetchKitchen } from "@/features/kitchen/kitchenApi";
import {
  INGREDIENTS,
  INGREDIENT_TITLES,
  type IngredientTitle,
} from "@/features/kitchen/type";
import { FISHES, type FishRarity } from "@/features/aquarium/fishes";
import { PackageOpen, Fish as FishIcon } from "lucide-react";

const DND_MIME = "application/x-ingredient";

/* ------------------------------- */
/* 🥔 이모지 전용 드래그 고스트 유틸 */
/* ------------------------------- */
let dragGhostEl: HTMLDivElement | null = null;

function setEmojiDragImage(e: React.DragEvent, emoji: string, fontPx = 48) {
  if (dragGhostEl) {
    dragGhostEl.remove();
    dragGhostEl = null;
  }
  const ghost = document.createElement("div");
  ghost.textContent = emoji;
  ghost.style.position = "fixed";
  ghost.style.top = "-1000px";
  ghost.style.left = "-1000px";
  ghost.style.fontSize = `${fontPx}px`;
  ghost.style.lineHeight = "1";
  ghost.style.pointerEvents = "none";
  ghost.style.userSelect = "none";
  ghost.style.background = "transparent";
  document.body.appendChild(ghost);
  dragGhostEl = ghost;
  e.dataTransfer!.setDragImage(ghost, fontPx / 2, fontPx / 2);
}
function cleanupDragGhost() {
  if (dragGhostEl) {
    dragGhostEl.remove();
    dragGhostEl = null;
  }
}

type Props = {
  className?: string;
  dragDisabled?: boolean; // 낚시 중일 때 true → 드래그 off
};

type IngredientCell = {
  title: IngredientTitle;
  emoji: string;
  count: number;
};

export default function IngredientFishingSection({
  className,
  dragDisabled = false,
}: Props) {
  const { couple } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  const [loading, setLoading] = useState(false);
  const [invMap, setInvMap] = useState<Record<IngredientTitle, number>>(
    {} as any
  );
  const [selected, setSelected] = useState<{
    title: IngredientTitle;
    emoji: string;
  } | null>(null);

  const EMOJI_BY_TITLE = useMemo(
    () =>
      Object.fromEntries(
        INGREDIENTS.map(
          (it) => [it.title as IngredientTitle, it.emoji] as const
        )
      ) as Record<IngredientTitle, string>,
    []
  );

  // 인벤 불러오기
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!coupleId) {
        setInvMap({} as any);
        setSelected(null);
        return;
      }
      try {
        setLoading(true);
        const k = await fetchKitchen(coupleId);
        const next: Record<IngredientTitle, number> = {} as any;
        for (const t of INGREDIENT_TITLES) next[t] = 0;
        for (const row of k.ingredients ?? []) {
          const t = row.title as IngredientTitle;
          if (t in next) next[t] = row.num ?? 0;
        }
        if (mounted) setInvMap(next);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [coupleId]);

  // 페이지에서 소비 성공 시 덜어내도록 이벤트 구독
  useEffect(() => {
    function onConsumed(e: Event) {
      const detail = (e as CustomEvent<{ title: IngredientTitle }>).detail;
      if (!detail?.title) return;
      setInvMap((prev) => {
        const cur = prev[detail.title] ?? 0;
        const nextCount = Math.max(0, cur - 1);
        const next = { ...prev, [detail.title]: nextCount };
        if (selected?.title === detail.title && nextCount <= 0)
          setSelected(null);
        return next;
      });
    }
    window.addEventListener("ingredient-consumed", onConsumed as any);
    return () =>
      window.removeEventListener("ingredient-consumed", onConsumed as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.title]);

  const cells: IngredientCell[] = useMemo(() => {
    const list = INGREDIENT_TITLES.map((t) => ({
      title: t,
      emoji: EMOJI_BY_TITLE[t] ?? "📦",
      count: invMap[t] ?? 0,
    }))
      .filter((c) => c.count > 0)
      .sort((a, b) =>
        b.count !== a.count
          ? b.count - a.count
          : a.title.localeCompare(b.title, "ko")
      )
      .slice(0, 15);
    return list;
  }, [invMap, EMOJI_BY_TITLE]);

  // 선택 재료로 포획 가능한 "모든 어종"
  const capturable = useMemo(() => {
    if (!selected) return [];
    return FISHES.filter((f) => f.ingredient === selected.title);
  }, [selected]);

  const rarityCardCls = (r: FishRarity) =>
    r === "일반"
      ? "bg-neutral-50 border-neutral-200"
      : r === "희귀"
      ? "bg-sky-50 border-sky-200"
      : r === "에픽"
      ? "bg-violet-50 border-violet-200"
      : "bg-amber-50 border-amber-200";

  // 최대 12개만 미리보기
  const MAX_SHOW = 12;
  const shown = useMemo(
    () => (selected ? capturable.slice(0, MAX_SHOW) : []),
    [selected, capturable]
  );

  // 드래그 스타트 (이모지만 프리뷰)
  const handleDragStart = (e: React.DragEvent, cell: IngredientCell) => {
    if (dragDisabled || cell.count <= 0) {
      e.preventDefault();
      return;
    }
    const payload = JSON.stringify({ title: cell.title, emoji: cell.emoji });
    e.dataTransfer.setData(DND_MIME, payload);
    e.dataTransfer.effectAllowed = "copy";
    setEmojiDragImage(e, cell.emoji, 48);
  };

  return (
    <section className={cn("flex flex-col gap-3 min-h-0", className)}>
      {/* 헤더 */}
      <div className="flex items-center">
        <span className="inline-flex h-7 w-7 items-center justify-center">
          <PackageOpen className="h-5 w-5 text-amber-700" />
        </span>
        <h3 className="text-base font-semibold text-zinc-800">재료통</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {loading
            ? "불러오는 중…"
            : `보유 중: ${
                Object.values(invMap).reduce((a, b) => a + (b || 0), 0) ?? 0
              }개`}
        </span>
      </div>

      {/* ✅ 더 촘촘한 반응형 그리드 (작게 시작 → 화면 따라 점진 확대) */}
      <div
        className={cn(
          "grid rounded-2xl",
          "gap-[6px] sm:gap-2",
          // xs: 56px, sm: 64px, md+: 72px 최소칸
          "grid-cols-[repeat(auto-fit,minmax(56px,1fr))]",
          "sm:grid-cols-[repeat(auto-fit,minmax(64px,1fr))]",
          "md:grid-cols-[repeat(auto-fit,minmax(72px,1fr))]"
        )}
      >
        {cells.length === 0 && (
          <div className="col-span-full text-xs sm:text-sm text-muted-foreground border rounded-xl p-3 sm:p-4 text-center">
            보유한 재료가 없어요.
          </div>
        )}

        {cells.map((c) => {
          const isSel = selected?.title === c.title;
          const disabled = dragDisabled || c.count <= 0;

          return (
            <button
              key={c.title}
              onClick={() => {
                setSelected({ title: c.title, emoji: c.emoji });
                window.dispatchEvent(
                  new CustomEvent("ingredient-picked", {
                    detail: { title: c.title, emoji: c.emoji },
                  })
                );
              }}
              draggable={!disabled}
              onDragStart={(e) => handleDragStart(e, c)}
              onDragEnd={cleanupDragGhost}
              className={cn(
                "relative w-full aspect-square rounded-lg border bg-white shadow-sm overflow-hidden",
                "flex flex-col items-center justify-center",
                // 패딩/갭도 반응형 축소
                "p-[6px] sm:p-2",
                "gap-[2px] sm:gap-1",
                "transition will-change-transform hover:shadow-md hover:-translate-y-0.5",
                isSel
                  ? "ring-2 ring-amber-500 border-amber-300 bg-amber-50"
                  : "border-zinc-200",
                disabled
                  ? "opacity-60 cursor-not-allowed"
                  : "cursor-grab active:cursor-grabbing"
              )}
              title={`${c.title} ×${c.count}`}
            >
              {/* 이모지(작게 시작해서 화면폭에 맞춰 확대) */}
              <span
                data-emoji
                className="leading-none select-none text-[clamp(16px,3.8vw,32px)]"
              >
                {c.emoji}
              </span>

              {/* 수량(조금 더 작게) */}
              <span className="absolute right-1 bottom-1 text-[10px] sm:text-[11px] text-amber-700 font-semibold tabular-nums">
                ×{c.count}
              </span>

              {dragDisabled && (
                <span
                  className="absolute inset-0 bg-white/50 backdrop-blur-[1px]"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 선택 정보 & 포획 가능 어종 */}
      <div className="flex gap-2 mt-3 sm:mt-4">
        <FishIcon className="w-5 h-5 text-sky-600" />
        <span className="text-sm font-semibold text-zinc-800">
          포획 가능 어종
        </span>
      </div>

      <div className="rounded-2xl border p-2 sm:p-3 flex flex-col min-h-[200px] sm:min-h-[240px] lg:min-h-[220px]">
        <div className="mt-1.5 sm:mt-2 flex items-center gap-2">
          <span className="text-xs text-amber-700 font-semibold">
            {`${Math.min(capturable.length, MAX_SHOW)}종 / 최대 12종`}
          </span>
        </div>

        {/* 프리뷰 */}
        <div className="mt-2 flex-1 min-h-0 overflow-y-auto">
          {selected ? (
            capturable.length > 0 ? (
              <div className="grid grid-cols-2 xs:grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
                {shown.map((f) => (
                  <div
                    key={f.id}
                    className={cn(
                      "rounded-xl border p-1",
                      "w-full aspect-square",
                      rarityCardCls(f.rarity as FishRarity)
                    )}
                    title={f.labelKo}
                  >
                    <div className="rounded-lg overflow-hidden w-full h-full">
                      <img
                        src={f.image}
                        alt={f.labelKo}
                        className="w-full h-full object-contain"
                        draggable={false}
                        loading="lazy"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                이 재료로 표시할 어종이 없어요.
              </div>
            )
          ) : (
            <div className="text-xs text-muted-foreground">
              재료를 선택하면 어종이 보여요.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
