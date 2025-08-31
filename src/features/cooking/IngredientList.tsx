"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { IngredientItem } from "./utils";

type Props = {
  items: IngredientItem[];
  onRemoveAt: (index: number) => void;
  onClear: () => void;
};

export default function IngredientList({ items, onRemoveAt, onClear }: Props) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="py-3">
        <CardTitle className="text-base">현재 재료</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">추가된 재료가 없어요.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {items.map((ing, i) => (
              <Badge
                key={`${ing.name}-${i}`}
                variant="secondary"
                className="px-2 py-1 text-[12px] cursor-pointer hover:bg-neutral-200/70 transition"
                title="클릭하면 하나 제외"
                onClick={() => onRemoveAt(i)}
              >
                {ing.name}
              </Badge>
            ))}
          </div>
        )}
        <div className="mt-3 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={items.length === 0}
          >
            모두 지우기
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
