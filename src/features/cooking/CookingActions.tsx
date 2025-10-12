// src/features/cooking/CookingActions.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function CookingActions({
  total,
  canCook,
  onCook,
  onReset,
}: {
  total: number;
  canCook: boolean;
  onCook: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        className={cn("rounded-xl", !canCook && "opacity-50")}
        disabled={!canCook}
        onClick={onCook}
      >
        조리 시작
      </Button>
      <Button variant="outline" className="rounded-xl" onClick={onReset}>
        재료 비우기
      </Button>
    </div>
  );
}
