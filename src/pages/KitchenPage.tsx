// src/pages/KitchenPage.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { toast } from "sonner";

import RecipeShelf from "@/features/kitchen/RecipeShelf";
import PotBox from "@/features/kitchen/PotBox";
import RecipePreview from "@/features/kitchen/RecipePreview";
import Inventory from "@/features/kitchen/Inventory";
import CookedInventory from "@/features/kitchen/CookedInventory";
import { addFoodEmojiToCollection } from "@/features/kitchen/kitchenApi";
import {
  RECIPES,
  RECIPES_BY_GRADE,
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

import { useUser } from "@/contexts/UserContext";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import CookingDoneEffects from "@/features/kitchen/CookingDoneEffects";

// ⬇️ 추가
import supabase from "@/lib/supabase";

/* ────────────────────────────────────────────────────────────────────────────
   타입
──────────────────────────────────────────────────────────────────────────── */
type Floating = { id: number; emoji: string };

/* ────────────────────────────────────────────────────────────────────────────
   KitchenPage
──────────────────────────────────────────────────────────────────────────── */
export default function KitchenPage() {
  const { couple, addGold } = useCoupleContext();
  const coupleId = couple?.id ?? null;
  const { user } = useUser();

  const defaultRecipeName = RECIPES_BY_GRADE["초급"][0]?.name ?? null;

  const [potatoCount, setPotatoCount] = useState(0);
  const [invMap, setInvMap] = useState<Record<string, number>>({});

  // ✅ 스테이징 상태 (이제 potbox 격자에 배치하지 않음)
  const [stagedIngredients, setStagedIngredients] = useState<
    Record<IngredientTitle, number>
  >({} as Record<IngredientTitle, number>);
  const [stagedPotatoes, setStagedPotatoes] = useState(0);

  // 플로팅 이모지(입력 피드백)
  const [floatings, setFloatings] = useState<Floating[]>([]);
  const pushFloating = (emoji: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setFloatings((s) => [...s, { id, emoji }]);
    // 1.5초 뒤 제거
    setTimeout(() => {
      setFloatings((s) => s.filter((f) => f.id !== id));
    }, 1500);
  };

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

  const [cooking, setCooking] = useState<CookingState>({
    open: false,
    phase: "progress",
    gif: "/cooking/cooking1.gif",
  });

  // 대표 냄비 PNG 경로 (모달에서 표시)
  const [repPotImg, setRepPotImg] = useState<string | null>(null);

  // ⬇️ 대표 냄비 이미지 조회 (모달 열릴 때마다 최신 반영)
  useEffect(() => {
    if (!coupleId) return;
    let live = true;
    (async () => {
      try {
        // 대표 냄비 ID 조회(없으면 1번 기본)
        const { data: inv } = await supabase
          .from("couple_pot_inventory")
          .select("pot_id")
          .eq("is_representative", true)
          .maybeSingle();

        const potId = inv?.pot_id ?? 1;
        const { data: pot } = await supabase
          .from("cooking_pots")
          .select("title")
          .eq("id", potId)
          .maybeSingle();

        const src = pot?.title ? `/cooking/${pot.title}.png` : null;
        if (live) setRepPotImg(src);
      } catch {
        if (live) setRepPotImg(null);
      }
    })();
    return () => {
      live = false;
    };
  }, [coupleId, cooking.open]);

  // 초기 로드: 인벤토리/감자
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

  // 레시피 변경 시 스테이징 초기화
  useEffect(() => {
    setStagedIngredients({} as any);
    setStagedPotatoes(0);
  }, [selectedRecipeName]);

  // 작은 프리로드(모달 LCP 안정)
  useEffect(() => {
    const imgs = [
      "/cooking/cooking1.gif",
      "/cooking/cooking2.gif",
      "/cooking/cooking3.gif",
    ];
    imgs.forEach((src) => {
      const i = new Image();
      i.src = src;
    });
  }, []);

  // 접근성: 조리 진행 상황 낭독
  const [liveMessage, setLiveMessage] = useState("");
  useEffect(() => {
    const r = selectedRecipe;
    if (!r) return;
    const totalNeed =
      (r?.potato ?? 0) + (r?.ingredients?.reduce((a, b) => a + b.qty, 0) ?? 0);
    const staged =
      stagedPotatoes +
      Object.values(stagedIngredients).reduce((a, b) => a + b, 0);
    setLiveMessage(`현재 조리 준비도 ${staged}/${totalNeed}`);
  }, [selectedRecipe, stagedPotatoes, stagedIngredients]);

  /* ────────────────────────────────────────────────────────────────────────
     헬퍼
  ───────────────────────────────────────────────────────────────────────── */
  function requiredQtyFor(title: IngredientTitle): number {
    const r = selectedRecipe;
    if (!r) return 0;
    return r.ingredients.find((x) => x.title === title)?.qty ?? 0;
  }

  function addIngredientToStage(title: IngredientTitle, emoji: string) {
    const r = selectedRecipe;
    if (!r) return toast.error("레시피를 먼저 선택하세요.");

    const need = requiredQtyFor(title);
    if (need <= 0) return toast.error("이 레시피에 필요한 재료가 아니에요.");

    const used = stagedIngredients[title] ?? 0;
    if (used >= need)
      return toast.error(`이미 충분히 넣었어요. (필요: ${need})`);

    const have = invMap[title] ?? 0;
    if (have - used <= 0) return toast.error("해당 재료 재고가 부족해요.");

    setStagedIngredients((prev) => ({ ...prev, [title]: used + 1 }));
    pushFloating(emoji);
  }

  function addPotatoToStage() {
    const r = selectedRecipe;
    if (!r) return toast.error("레시피를 먼저 선택하세요.");
    if (stagedPotatoes >= r.potato)
      return toast.error("필요한 감자 수를 초과했어요.");
    if (potatoCount - stagedPotatoes <= 0)
      return toast.error("감자가 부족해요.");

    setStagedPotatoes((p) => p + 1);
    pushFloating("🥔");
  }

  const canCook = useMemo(() => {
    const r = selectedRecipe;
    if (!r) return false;
    if (stagedPotatoes !== r.potato) return false;
    return r.ingredients.every(
      ({ title, qty }) => (stagedIngredients[title] ?? 0) === qty
    );
  }, [selectedRecipe, stagedPotatoes, stagedIngredients]);

  async function tryCookNow() {
    const r = selectedRecipe;
    if (!coupleId || !r) return;
    if (!canCook) return toast.error("아직 재료가 조금 모자라요 🧑‍🍳");
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
        // 재료 차감 맵
        const need: Record<IngredientTitle, number> = Object.fromEntries(
          r.ingredients.map(({ title, qty }) => [title, qty])
        ) as Record<IngredientTitle, number>;

        await consumeIngredients(coupleId, need);
        await usePotatoes(coupleId, r.potato);
        await addCookedFood(coupleId, r.name, 1);
        await addFoodEmojiToCollection(coupleId, r.name as RecipeName, r.emoji);

        // 로컬 상태 반영
        const after = { ...invMap };
        r.ingredients.forEach(({ title, qty }) => {
          after[title] = Math.max(0, (after[title] ?? 0) - qty);
        });
        setInvMap(after);
        setPotatoCount((p) => Math.max(0, p - r.potato));

        // 스테이징 초기화
        setStagedIngredients({} as any);
        setStagedPotatoes(0);

        setCooking({
          open: true,
          phase: "done",
          gif: `/cooking/cooking${n}.gif`,
          name: r.name as RecipeName,
          emoji: r.emoji,
          sell: r.sell,
          desc: getFoodDesc(r.name as RecipeName),
        });

        // 파트너 알림 (실패 무시)
        try {
          if (user?.id && (user as any)?.partner_id) {
            await sendUserNotification({
              senderId: user.id,
              receiverId: (user as any).partner_id,
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

  async function sellCookedFromModal() {
    if (!coupleId) return;
    if (
      cooking.phase !== "done" ||
      !("name" in cooking) ||
      !("sell" in cooking)
    )
      return;
    try {
      addGold?.(cooking.sell);
      await addCookedFood(coupleId, cooking.name, -1);
    } finally {
      setCooking((s) => ({ ...s, open: false }));
    }
  }

  // 진행률 계산 (UI 표시용)
  const totalRequired =
    (selectedRecipe?.potato ?? 0) +
    (selectedRecipe?.ingredients?.reduce((a, b) => a + b.qty, 0) ?? 0);
  const stagedTotal =
    stagedPotatoes +
    Object.values(stagedIngredients).reduce((a, b) => a + b, 0);
  const progressPct =
    totalRequired > 0
      ? Math.min(100, Math.round((stagedTotal / totalRequired) * 100))
      : 0;

  if (!coupleId) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-center text-muted-foreground">
        커플 연동이 필요해요.
      </div>
    );
  }

  /* ────────────────────────────────────────────────────────────────────────
     UI
  ───────────────────────────────────────────────────────────────────────── */
  return (
    <div className="relative">
      {/* 배경 톤(종이결 + 라디얼 그라데이션) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,247,231,.7),transparent_60%)]" />
        <div className="absolute inset-0 opacity-[.06] bg-[url('/tex/paper.png')]" />
      </div>

      {/* 페이지 컨테이너 */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 md:py-6">
        {/* 상단 상태 스트립 */}
        <header
          className="mb-5 md:mb-6 rounded-2xl border border-amber-200/60 bg-amber-50/70 backdrop-blur px-4 sm:px-5 py-3 shadow-[0_8px_24px_-8px_rgba(120,85,40,.15)]"
          aria-live="polite"
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm tabular-nums">
            <BadgeChip
              label="감자"
              value={potatoCount}
              tone="amber"
              emoji="🥔"
            />
            <div className="h-4 w-px bg-amber-200/80" />
            <BadgeChip
              label="선택 레시피"
              value={selectedRecipe?.name ?? "—"}
              tone="violet"
              emoji={(selectedRecipe as any)?.emoji ?? "🍽️"}
            />
            <BadgeChip
              label="판매가"
              value={selectedRecipe ? `${selectedRecipe.sell}` : "—"}
              tone="stone"
              icon={<Coins className="h-3.5 w-3.5" />}
            />
            <div className="ml-auto inline-flex items-center gap-2 text-xs text-amber-900/70">
              <ProgressDot pct={progressPct} />
              <span>
                {stagedTotal}/{totalRequired}
              </span>
            </div>
          </div>
          {/* SR용 진행 멘트 */}
          <span className="sr-only">{liveMessage}</span>
        </header>

        {/* 상단 3열 레이아웃 */}
        <div className="grid gap-6 md:grid-cols-3 min-h-[560px]">
          {/* Inventory 래퍼: 톤만 부여 (컴포넌트 API 변경 없음) */}
          <section className="rounded-2xl border border-stone-200 bg-stone-50/80 p-2 sm:p-3 shadow-[0_8px_24px_-8px_rgba(120,85,40,.08)]">
            <Inventory
              potatoCount={potatoCount}
              potPotatoes={0}
              invMap={invMap}
              stagedIngredients={stagedIngredients}
              stagedPotatoes={stagedPotatoes}
              onClickIngredient={addIngredientToStage}
              onClickPotato={addPotatoToStage}
            />
          </section>

          {/* 가운데 컬럼: RecipePreview + PotBox */}
          <section className="flex flex-col items-stretch gap-3">
            <div className="rounded-2xl border border-stone-200/80 bg-white/70 backdrop-blur p-2 sm:p-3 shadow-[0_8px_24px_-8px_rgba(120,85,40,.08)]">
              <RecipePreview recipe={selectedRecipe as Recipe} />
            </div>

            <div className="relative rounded-2xl border border-amber-200 bg-amber-50/70 backdrop-blur p-2 sm:p-3 ring-amber-200/40 shadow-[0_8px_24px_-8px_rgba(120,85,40,.12)]">
              {/* 상단 오른쪽 미세 상태 위젯 */}
              <div className="absolute right-3 top-3 inline-flex items-center gap-2 text-xs text-amber-900/70">
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-white/60 px-2 py-0.5">
                  준비도 {progressPct}%
                </span>
              </div>

              <PotBox
                canCook={canCook}
                onCook={tryCookNow}
                floatingEmojis={floatings}
                totalRequired={totalRequired}
                stagedTotal={stagedTotal}
              />
            </div>
          </section>

          {/* RecipeShelf 래퍼 */}
          <section className="rounded-2xl border border-violet-200 bg-violet-50/70 p-2 sm:p-3 shadow-[0_8px_24px_-8px_rgba(120,85,40,.08)]">
            <RecipeShelf
              selectedName={selectedRecipeName}
              onSelect={(name) => setSelectedRecipeName(name)}
            />
          </section>
        </div>

        {/* 하단: 완성 요리 인벤토리 */}
        <div className="mt-6 rounded-2xl border border-stone-200 bg-white/70 backdrop-blur p-2 sm:p-3 shadow-[0_8px_24px_-8px_rgba(120,85,40,.08)]">
          <CookedInventory className="w-full" />
        </div>

        {/* 조리 중/완료 모달 */}
        <Dialog
          open={cooking.open}
          onOpenChange={(o) => setCooking((s) => ({ ...s, open: o }))}
        >
          <DialogContent className="max-w-md rounded-2xl border border-amber-200/60 bg-white/90 backdrop-blur shadow-[0_24px_60px_-24px_rgba(120,85,40,.35)]">
            {cooking.phase === "progress" ? (
              <>
                <DialogHeader className="pb-2">
                  <DialogTitle className="leading-tight">
                    {selectedRecipe?.name
                      ? `${selectedRecipe.name} 만드는 중…`
                      : "조리 중…"}
                  </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center gap-4 py-3">
                  {/* 대표 냄비 PNG (gif 대신) */}
                  {repPotImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={repPotImg}
                      alt="cooking pot"
                      className="h-40 w-40 object-contain animate-[cookPulse_1.6s_ease-in-out_infinite]"
                    />
                  ) : (
                    <div className="h-40 w-40 rounded-full bg-amber-50 grid place-items-center text-3xl animate-pulse">
                      🍲
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    불을 지피고 있어요…
                  </div>

                  {/* 예상 판매가 미리보기 */}
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50/80 px-2 py-0.5 text-xs text-amber-900/80">
                    <Coins className="h-3.5 w-3.5" />
                    예상 판매가 {selectedRecipe?.sell ?? "—"}
                  </div>
                </div>
              </>
            ) : (
              <>
                <DialogHeader className="pb-0">
                  <DialogTitle>요리 완성!</DialogTitle>
                  <CookingDoneEffects
                    emoji={(cooking as any).emoji}
                    gold={(cooking as any).sell}
                  />
                </DialogHeader>

                <div className="space-y-4 pt-2">
                  <div className="flex items-start gap-3">
                    <div className="h-16 w-16 rounded-2xl border bg-white grid place-items-center text-4xl">
                      {(cooking as any).emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold leading-tight">
                          {(cooking as any).name}
                        </h3>
                        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-amber-800 bg-amber-50">
                          <Coins className="h-3.5 w-3.5" />
                          판매가 {(cooking as any).sell}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {(cooking as any).desc}
                      </p>
                    </div>
                  </div>

                  {/* 하단 액션 바(모바일 사용성 ↑) */}
                  <div className="sticky -mx-4 sm:-mx-5 mb-[-.5rem] px-4 sm:px-5 py-2 bg-white/80 backdrop-blur border-t flex justify-end gap-2">
                    {/* 보관함 열기(네비게이션 경로 모르면 버튼만 토글) */}
                    {/* <button
                      type="button"
                      className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-amber-50"
                      onClick={() => {/* 라우팅 연결 시 사용 */
                    /*}}
                    >
                      보관함 열기
                    </button> */}
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

        {/* ⬇️ 간단한 요리 펄스 효과 */}
        <style>{`
          @keyframes cookPulse {
            0%   { transform: scale(.98); filter: drop-shadow(0 0 0 rgba(0,0,0,0)); }
            50%  { transform: scale(1.02); filter: drop-shadow(0 10px 22px rgba(245,158,11,.35)); }
            100% { transform: scale(.98); filter: drop-shadow(0 0 0 rgba(0,0,0,0)); }
          }
        `}</style>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   작은 UI 유틸 (파일 내 로컬 컴포넌트) — 외부 의존도 없이 토닝/정보표시 전용
──────────────────────────────────────────────────────────────────────────── */
function BadgeChip({
  label,
  value,
  tone = "stone",
  icon,
  emoji,
}: {
  label: string;
  value: string | number;
  tone?: "amber" | "violet" | "stone";
  icon?: React.ReactNode;
  emoji?: string;
}) {
  const toneCls =
    tone === "amber"
      ? "border-amber-200 bg-white/70 text-amber-900"
      : tone === "violet"
      ? "border-violet-200 bg-white/70 text-violet-900"
      : "border-stone-200 bg-white/70 text-stone-900";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${toneCls}`}
    >
      {icon ? icon : emoji ? <span className="text-sm">{emoji}</span> : null}
      <span className="text-[11px] opacity-70">{label}</span>
      <span className="text-xs font-medium tabular-nums">{value}</span>
    </span>
  );
}

function ProgressDot({ pct }: { pct: number }) {
  // 단순 원형 진행 표현(시맨틱 값만 표시)
  return (
    <span
      className="relative grid place-items-center h-5 w-5 rounded-full border border-amber-300/80 bg-amber-50/70"
      aria-label={`준비도 ${pct}%`}
      title={`준비도 ${pct}%`}
    >
      <span
        className="absolute rounded-full bg-amber-400/80"
        style={{
          width: `${Math.max(16 * (pct / 100), 6)}px`,
          height: `${Math.max(16 * (pct / 100), 6)}px`,
          transition: "width .2s ease, height .2s ease",
        }}
      />
    </span>
  );
}
