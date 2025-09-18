// src/pages/KitchenPage.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { toast } from "sonner";

import RecipeShelf from "@/features/kitchen/RecipeShelf";
import PotBox from "@/features/kitchen/PotBox";
import RecipePreview from "@/features/kitchen/RecipePreview";
import Inventory from "@/features/kitchen/Inventory"; // 재료 인벤토리 전용
import CookedInventory from "@/features/kitchen/CookedInventory";
import { addFoodEmojiToCollection } from "@/features/kitchen/kitchenApi";
import {
  RECIPES,
  RECIPES_BY_GRADE,
  INGREDIENT_EMOJI,
  getFoodDesc,
  type IngredientTitle,
  type Recipe,
  type RecipeName,
} from "@/features/kitchen/type";

import {
  fetchKitchen,
  getPotatoCount,
  consumeIngredients,
  usePotatoes,
  addCookedFood,
} from "@/features/kitchen/kitchenApi";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Coins } from "lucide-react";

// ✅ 추가: 파트너에게 요리 공유 알림용
import { useUser } from "@/contexts/UserContext";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import CookingDoneEffects from "@/features/kitchen/CookingDoneEffects";

// ────────────────────────────────────────────────────────────
// Types & type guards
type PotStackItem =
  | { type: "ingredient"; title: IngredientTitle; emoji: string }
  | { type: "potato"; emoji: "🥔" };

function isIngredient(
  it: PotStackItem
): it is Extract<PotStackItem, { type: "ingredient" }> {
  return it.type === "ingredient";
}
// ────────────────────────────────────────────────────────────

type CookingState =
  | { open: boolean; phase: "progress"; gif: string }
  | {
      open: boolean;
      phase: "done";
      gif: string;
      name: RecipeName;
      emoji: string;
      sell: number;
      desc: string;
    };

export default function KitchenPage() {
  const { couple, addGold } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  // ✅ 추가: 사용자/파트너 정보 (알림 전송)
  const { user } = useUser();

  const defaultRecipeName = RECIPES_BY_GRADE["초급"][0]?.name ?? null;

  const [potatoCount, setPotatoCount] = useState(0);
  const [invMap, setInvMap] = useState<Record<string, number>>({});
  const [potStack, setPotStack] = useState<PotStackItem[]>([]);

  const [selectedRecipeName, setSelectedRecipeName] = useState<string | null>(
    defaultRecipeName
  );

  const selectedRecipe: Recipe | undefined = useMemo(
    () =>
      selectedRecipeName
        ? RECIPES.find((r) => r.name === selectedRecipeName)
        : undefined,
    [selectedRecipeName]
  );

  const [cooking, setCooking] = useState<CookingState>({
    open: false,
    phase: "progress",
    gif: "/cooking/cooking1.gif",
  });

  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);

  // 초기 로드
  useEffect(() => {
    if (!coupleId) return;
    (async () => {
      const k = await fetchKitchen(coupleId);
      const m: Record<string, number> = {};
      for (const it of k.ingredients) m[it.title] = it.num;
      setInvMap(m);
      setPotatoCount(await getPotatoCount(coupleId));
    })();
  }, [coupleId]);

  // 파생
  const potPotatoes = useMemo(
    () =>
      potStack.reduce((acc, it) => (it.type === "potato" ? acc + 1 : acc), 0),
    [potStack]
  );

  // 재료별 사용 맵
  const potMap = useMemo(() => {
    const m: Partial<Record<IngredientTitle, number>> = {};
    for (const it of potStack) {
      if (isIngredient(it)) m[it.title] = (m[it.title] ?? 0) + 1;
    }
    return m as Record<IngredientTitle, number>;
  }, [potStack]);

  // 레시피 변경 시 냄비 비우기
  useEffect(() => {
    setPotStack([]);
    setHighlightIdx(null);
  }, [selectedRecipeName]);

  // PotBox로 전달
  const potItemsForBox = useMemo(
    () =>
      potStack.map((it, idx) => {
        if (it.type === "ingredient") {
          const title: IngredientTitle = it.title;
          const emoji = it.emoji ?? INGREDIENT_EMOJI[title];
          return { stackIdx: idx, emoji };
        }
        return { stackIdx: idx, emoji: "🥔" as const };
      }),
    [potStack]
  );

  // 인벤토리 → 냄비
  function addIngredientToPot(title: IngredientTitle, emoji: string) {
    const r = selectedRecipe;
    if (!r) return toast.error("레시피를 먼저 선택하세요.");
    if (!r.ingredients.includes(title))
      return toast.error("이 레시피에 필요한 재료가 아니에요.");
    if ((potMap[title] ?? 0) >= 1) return toast.error("이미 넣은 재료예요.");

    const have = invMap[title] ?? 0;
    const used = potMap[title] ?? 0;
    if (have - used <= 0) return;

    setPotStack((s) => {
      const next: PotStackItem[] = [...s, { type: "ingredient", title, emoji }];
      setHighlightIdx(next.length - 1);
      return next;
    });
  }

  function addPotatoToPot() {
    const r = selectedRecipe;
    if (!r) return toast.error("레시피를 먼저 선택하세요.");
    if (potPotatoes >= r.potato)
      return toast.error("필요한 감자 수를 초과했어요.");
    if (potatoCount - potPotatoes <= 0) return;

    setPotStack((s) => {
      const next: PotStackItem[] = [...s, { type: "potato", emoji: "🥔" }];
      setHighlightIdx(next.length - 1);
      return next;
    });
  }

  function removeByStackIndex(idx: number) {
    setPotStack((s) => s.filter((_, i) => i !== idx));
    setHighlightIdx(null);
  }

  function onRemovePotato() {
    let idx = -1;
    for (let i = potStack.length - 1; i >= 0; i--) {
      const item = potStack[i];
      if (item?.type === "potato") {
        idx = i;
        break;
      }
    }
    if (idx >= 0) removeByStackIndex(idx);
  }

  const canCook = useMemo(() => {
    const r = selectedRecipe;
    if (!r) return false;
    if (potPotatoes !== r.potato) return false;
    return r.ingredients.every((t) => (potMap[t] ?? 0) === 1);
  }, [selectedRecipe, potPotatoes, potMap]);

  async function tryCookNow() {
    const r = selectedRecipe;
    if (!coupleId || !r) return;
    if (!canCook) return toast.error("필요한 재료/감자 수량이 맞지 않아요.");
    if (potatoCount < r.potato)
      return toast.error(`감자가 부족해요! (필요: ${r.potato})`);

    const n = Math.floor(Math.random() * 3) + 1;
    setCooking({
      open: true,
      phase: "progress",
      gif: `/cooking/cooking${n}.gif`,
    });

    setTimeout(async () => {
      try {
        const need: Partial<Record<IngredientTitle, number>> = {};
        r.ingredients.forEach((t) => (need[t] = 1));
        await consumeIngredients(
          coupleId,
          need as Record<IngredientTitle, number>
        );
        await usePotatoes(coupleId, r.potato);
        await addCookedFood(coupleId, r.name, 1);
        // ✅ 요리 이모지 스티커 컬렉션 추가/누적
        await addFoodEmojiToCollection(coupleId, r.name as RecipeName, r.emoji);

        const after = { ...invMap };
        r.ingredients.forEach(
          (t) => (after[t] = Math.max(0, (after[t] ?? 0) - 1))
        );
        setInvMap(after);
        setPotatoCount((p) => Math.max(0, p - r.potato));
        setPotStack([]);
        setHighlightIdx(null);

        setCooking({
          open: true,
          phase: "done",
          gif: `/cooking/cooking${n}.gif`,
          name: r.name as RecipeName,
          emoji: r.emoji,
          sell: r.sell,
          desc: getFoodDesc(r.name as RecipeName),
        });

        // ✅ 파트너 알림 (옵션)
        try {
          if (user?.id && user?.partner_id) {
            await sendUserNotification({
              senderId: user.id,
              receiverId: user.partner_id,
              type: "음식공유",
              foodName: r.name as RecipeName,
            });
          }
        } catch (e) {
          console.warn("음식 공유 알림 실패(무시 가능):", e);
        }
      } catch (e) {
        console.error(e);
        toast.error("조리에 실패했어요.");
        setCooking((s) => ({ ...s, open: false }));
      }
    }, 2000);
  }

  // 조리 완료 모달에서 판매하기
  async function sellCookedFromModal() {
    if (!coupleId) return;
    if (cooking.phase !== "done" || !cooking.name || !cooking.sell) return;
    try {
      addGold?.(cooking.sell);
      await addCookedFood(coupleId, cooking.name, -1);
    } finally {
      setCooking((s) => ({ ...s, open: false }));
    }
  }

  if (!coupleId) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-center text-muted-foreground">
        커플 연동이 필요해요.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl py-4">
      {/* 상단 3열 레이아웃: 재료 인벤토리 위치 유지 */}
      <div className="grid md:grid-cols-3 gap-6 min-h-[560px]">
        <Inventory
          potatoCount={potatoCount}
          potPotatoes={potPotatoes}
          invMap={invMap}
          potMap={potMap}
          onClickIngredient={addIngredientToPot}
          onClickPotato={addPotatoToPot}
        />

        <div className="flex flex-col items-stretch gap-3">
          <RecipePreview recipe={selectedRecipe as Recipe} />
          <PotBox
            items={potItemsForBox as any}
            potatoCount={potPotatoes}
            onRemoveByIndex={removeByStackIndex}
            onDecreasePotato={onRemovePotato}
            highlightStackIdx={highlightIdx}
            canCook={canCook}
            onCook={tryCookNow}
          />
        </div>

        <RecipeShelf
          selectedName={selectedRecipeName}
          onSelect={(name) => setSelectedRecipeName(name)}
        />
      </div>

      {/* 하단 전체폭: 완성 요리 인벤토리 */}
      <CookedInventory className="mt-6 w-full" />

      {/* 조리 중/완료 모달 */}
      <Dialog
        open={cooking.open}
        onOpenChange={(o) => setCooking((s) => ({ ...s, open: o }))}
      >
        <DialogContent className="max-w-md">
          {cooking.phase === "progress" ? (
            <>
              <DialogHeader>
                <DialogTitle>조리 중… ⏳</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-3 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cooking.gif} alt="cooking" className="object-fill" />
                <div className="text-sm text-muted-foreground">
                  잠시만 기다려주세요.
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>요리 완성!</DialogTitle>
                {/* 🔥 완성 이펙트 */}
                <CookingDoneEffects emoji={cooking.emoji} gold={cooking.sell} />
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-16 w-16 rounded-2xl border bg-white grid place-items-center text-4xl">
                    {cooking.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold leading-tight">
                        {cooking.name}
                      </h3>
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-amber-800 bg-amber-50">
                        <Coins className="h-3.5 w-3.5" />
                        판매가 {cooking.sell}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {cooking.desc}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center rounded-md bg-amber-600 px-3 py-2 text-sm text-white hover:bg-amber-700"
                    onClick={sellCookedFromModal}
                  >
                    판매하기
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
