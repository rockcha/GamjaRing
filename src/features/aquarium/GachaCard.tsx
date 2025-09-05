// src/features/aquarium/IngredientGachaCard.tsx
"use client";

import { useMemo, useState } from "react";
import { rollFishByIngredient } from "../fishing/rollfish";
import { FISH_BY_ID, type FishRarity } from "./fishes";
import {
  INGREDIENT_EMOJI,
  type IngredientTitle,
} from "@/features/kitchen/type";

// shadcn/ui
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

// rarity 배지 (텍스트만, 색상만)
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
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}
    >
      {r}
    </span>
  );
}

export default function IngredientGachaCard() {
  // 재료 목록: 이모지 맵의 key를 그대로 사용
  const ingredientList = useMemo(
    () => Object.keys(INGREDIENT_EMOJI) as IngredientTitle[],
    []
  );

  const [ingredient, setIngredient] = useState<IngredientTitle | null>(
    ingredientList[0] ?? null
  );
  const [includeWild, setIncludeWild] = useState(true);
  const [fallbackAny, setFallbackAny] = useState(false);

  const [resultText, setResultText] = useState<string>("아직 결과가 없습니다.");
  const [rolling, setRolling] = useState(false);

  const onRoll = async () => {
    if (!ingredient) return;
    setRolling(true);

    // 연출 약간
    await new Promise((r) => setTimeout(r, 300));

    const res = rollFishByIngredient(ingredient, {
      includeWild,
      fallbackToAnyRarity: fallbackAny,
    });

    const ingEmoji = INGREDIENT_EMOJI[ingredient] ?? "❓";
    if (!res.ok) {
      setResultText(`❌ ${ingEmoji} ${ingredient} → 실패`);
    } else {
      const fish = FISH_BY_ID[res.fishId];
      const name = fish?.labelKo ?? res.fishId;
      setResultText(
        `✅ ${ingEmoji} ${ingredient} → [${res.rarity}] ${name} (id: ${res.fishId})`
      );
    }
    setRolling(false);
  };

  return (
    <Card className="w-full max-w-[540px]">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">재료 가챠</CardTitle>
        <p className="text-xs text-muted-foreground">
          기본 확률 — 실패 40% · 일반 40% · 희귀 15% · 에픽 4% · 전설 1%
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Select + 돌리기 */}
        <div className="flex items-center gap-2">
          <Select
            value={ingredient ?? undefined}
            onValueChange={(v) => setIngredient(v as IngredientTitle)}
          >
            <SelectTrigger className="min-w-[180px]">
              <SelectValue placeholder="재료 선택" />
            </SelectTrigger>
            <SelectContent>
              {ingredientList.map((ing) => (
                <SelectItem key={ing} value={ing}>
                  <span className="mr-1 text-base">
                    {INGREDIENT_EMOJI[ing] ?? "❓"}
                  </span>
                  {ing}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={onRoll}
            disabled={!ingredient || rolling}
            className="shrink-0"
          >
            {rolling ? "돌리는 중…" : "돌리기"}
          </Button>
        </div>

        {/* 옵션 */}
        <div className="flex items-center gap-6 text-sm">
          <label className="inline-flex items-center gap-2">
            <Checkbox
              checked={includeWild}
              onCheckedChange={(v) => setIncludeWild(!!v)}
            />
            야생 포함
          </label>

          <label className="inline-flex items-center gap-2">
            <Checkbox
              checked={fallbackAny}
              onCheckedChange={(v) => setFallbackAny(!!v)}
            />
            선택 등급 풀이 없으면 같은 재료의 아무 등급에서 선택
          </label>
        </div>

        <Separator />

        {/* 결과 (텍스트만) */}
        <div className="text-sm">
          <div className="mb-1 text-muted-foreground">결과</div>
          {/* 등급 배지를 텍스트 안에 동적으로 붙이고 싶다면 아래처럼 파싱 가능하지만,
              요구사항이 '텍스트로 알려주기'라 그대로 문자열만 표기 */}
          <p className="whitespace-pre-wrap">{resultText}</p>
        </div>

        {/* 등급 안내 (선택적) */}
        <div className="pt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span>등급 표시:</span>
          <div className="flex items-center gap-1">
            <RarityBadge r="일반" />
            <RarityBadge r="희귀" />
            <RarityBadge r="에픽" />
            <RarityBadge r="전설" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
