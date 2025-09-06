// src/features/kitchen/IngredientAdjustCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { cn } from "@/lib/utils";
import {
  PackageOpen,
  Loader2,
  RefreshCw,
  Plus,
  Minus,
  ArrowRight,
} from "lucide-react";

type IngredientRow = {
  id: string;
  title: string;
  emoji: string | null;
};

export default function IngredientAdjustCard({
  className,
}: {
  className?: string;
}) {
  const { couple } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const [selectedId, setSelectedId] = useState<string>("");
  const [currentQty, setCurrentQty] = useState<number | null>(null);
  const [deltaInput, setDeltaInput] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);

  const selected = useMemo(
    () => ingredients.find((i) => i.id === selectedId),
    [ingredients, selectedId]
  );

  useEffect(() => {
    (async () => {
      setLoadingList(true);
      const { data, error } = await supabase
        .from("ingredients")
        .select("id, title, emoji")
        .order("title", { ascending: true });
      setLoadingList(false);
      if (error) {
        toast.error(`재료 목록을 불러오지 못했어요: ${error.message}`);
        return;
      }
      setIngredients((data as IngredientRow[]) ?? []);
      if (data && data.length && !selectedId) setSelectedId(data[0].id);
    })();
  }, []); // 최초 1회

  // 선택 변경 시 현재 수량 로드
  useEffect(() => {
    if (!coupleId || !selectedId) {
      setCurrentQty(null);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("ingredients_inventory")
        .select("qty")
        .eq("couple_id", coupleId)
        .eq("ingredient_id", selectedId)
        .maybeSingle();
      if (error) {
        toast.error(`수량 조회 실패: ${error.message}`);
        return;
      }
      setCurrentQty((data?.qty as number | undefined) ?? null);
    })();
  }, [coupleId, selectedId]);

  const parseDelta = (s: string): number | null => {
    if (!s.trim()) return null;
    // 허용 형식 예: "3", "+3", "-1"
    const n = Number(s);
    if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
    if (n === 0) return 0;
    return n;
  };

  const refreshQty = async () => {
    if (!coupleId || !selectedId) return;
    const { data } = await supabase
      .from("ingredients_inventory")
      .select("qty")
      .eq("couple_id", coupleId)
      .eq("ingredient_id", selectedId)
      .maybeSingle();
    setCurrentQty((data?.qty as number | undefined) ?? null);
  };

  const handleQuickDelta = (sign: 1 | -1) => {
    const cur = parseDelta(deltaInput) ?? 0;
    const next = cur + sign * 1;
    setDeltaInput(String(next > 0 ? `+${next}` : `${next}`));
  };

  const handleSubmit = async () => {
    if (!coupleId) {
      toast.error("커플 정보가 없어요.");
      return;
    }
    if (!selectedId) {
      toast.error("재료를 선택해 주세요.");
      return;
    }
    const delta = parseDelta(deltaInput);
    if (delta === null) {
      toast.error("정수를 입력해 주세요. 예) +3 또는 -1");
      return;
    }
    if (delta === 0) {
      toast.info("0은 변경이 없어요.");
      return;
    }

    // 행이 없고 음수면 사전 차단 (토스트만)
    if (currentQty === null && delta < 0) {
      toast.warning("해당 재료가 보유 목록에 없어서 감소시킬 수 없어요.");
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.rpc("adjust_ingredients_inventory", {
      p_couple_id: coupleId,
      p_ingredient_id: selectedId,
      p_delta: delta,
    });
    setSubmitting(false);

    if (error) {
      // 함수 내부 에러 메시지 친화 처리
      if (error.message?.toLowerCase().includes("insufficient")) {
        toast.warning("보유 수량이 부족해요.");
      } else {
        toast.error(`변경 실패: ${error.message}`);
      }
      return;
    }

    const newQty = data?.[0]?.qty as number | undefined;
    setCurrentQty(typeof newQty === "number" ? newQty : currentQty);
    setDeltaInput("");
    toast.success("재고가 반영됐어요.");
  };

  return (
    <section
      className={cn(
        "rounded-2xl border bg-white p-4 shadow-sm flex flex-col gap-3",
        className
      )}
    >
      <header className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center">
          <PackageOpen className="h-4 w-4 text-amber-700" />
        </span>
        <h3 className="text-sm font-semibold text-zinc-900">재료 증감</h3>
        <button
          onClick={refreshQty}
          className="ml-auto inline-flex items-center gap-1 text-xs text-sky-700 hover:underline"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          새로고침
        </button>
      </header>

      {/* 선택 & 현재 보유 */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-center">
        <div className="relative">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 pr-8 text-sm"
          >
            {loadingList ? (
              <option>불러오는 중…</option>
            ) : ingredients.length ? (
              ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {`${ing.emoji ?? ""} ${ing.title}`}
                </option>
              ))
            ) : (
              <option>재료 없음</option>
            )}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
            ▾
          </span>
        </div>

        <div className="text-xs sm:text-sm text-gray-600 sm:justify-self-end">
          현재 보유:{" "}
          <b className="text-gray-900">
            {currentQty === null ? 0 : currentQty}
          </b>
        </div>
      </div>

      {/* 입력 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleQuickDelta(-1)}
          className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
          title="-1"
        >
          <Minus className="w-4 h-4" />
        </button>

        <input
          value={deltaInput}
          onChange={(e) => setDeltaInput(e.target.value)}
          placeholder="+3 또는 -1"
          className="flex-1 rounded-md border px-3 py-2 text-sm"
          inputMode="numeric"
        />

        <button
          type="button"
          onClick={() => handleQuickDelta(+1)}
          className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
          title="+1"
        >
          <Plus className="w-4 h-4" />
        </button>

        <ArrowRight className="hidden sm:block w-4 h-4 text-gray-400" />

        <button
          onClick={handleSubmit}
          disabled={submitting || !selectedId}
          className={cn(
            "inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-2 text-sm text-white",
            "hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed"
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              적용 중…
            </>
          ) : (
            <>적용</>
          )}
        </button>
      </div>

      {/* 주의 문구 */}
      <p className="text-[11px] text-gray-500">
        음수 입력은 수량 감소입니다. <b>행이 없는데 음수</b>로 제출하면 변경하지
        않고 경고를 띄워요.
      </p>
    </section>
  );
}
