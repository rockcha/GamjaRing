// src/features/fishing/ingredient-section/ui/BulkFishingPanel.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  baitCount: number;
  bulkCount: number;
  setBulkCount: (n: number) => void;
  busy: boolean;
  onRun: (countSnapshot: number) => void; // ✅ 변경: 스냅샷 전달
  tanksErr?: string | null;
};

export default function BulkFishingPanel({
  baitCount,
  bulkCount,
  setBulkCount,
  busy,
  onRun,
  tanksErr,
}: Props) {
  const [inputText, setInputText] = useState<string>(
    bulkCount ? String(bulkCount) : ""
  );
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 외부 상태 → 표시 동기화
  useEffect(() => {
    setInputText(bulkCount ? String(bulkCount) : "");
  }, [bulkCount]);

  const maxUsable = Math.max(0, baitCount);
  const hasBait = maxUsable > 0;

  const parsed = useMemo(() => {
    const n = Number(inputText);
    return Number.isFinite(n) ? n : NaN;
  }, [inputText]);

  const isBlank = inputText.trim() === "";
  const isInvalid =
    !isBlank && (!Number.isInteger(parsed) || parsed < 1 || parsed > maxUsable);

  function normalizeOrFallback(): number {
    if (isBlank) return hasBait ? 1 : 0;
    const n = Number.isFinite(parsed) ? parsed : 1;
    return Math.min(Math.max(1, Math.trunc(n)), Math.max(1, maxUsable));
  }

  function commitOnly() {
    if (!hasBait) return;
    const n = normalizeOrFallback();
    setBulkCount(n);
    setInputText(String(n));
  }

  function commitAndRun() {
    if (busy || !hasBait || isBlank || isInvalid) return;
    const n = normalizeOrFallback();
    setBulkCount(n);
    onRun(n); // ✅ 제출 시 스냅샷 값으로 실행
  }

  return (
    <>
      <Card className="p-4 bg-slate-50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            commitAndRun();
          }}
          className="flex items-end justify-between gap-3"
        >
          {/* 좌측: 인풋 */}
          <div className="w-[120px]">
            <label className="text-xs text-muted-foreground">사용 개수</label>
            <input
              ref={inputRef}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder={hasBait ? "개수를 입력하세요" : "미끼 없음"}
              className={cn(
                "mt-1 w-full h-9 rounded-md border px-3 text-sm bg-white",
                "focus-visible:ring-2 focus-visible:ring-indigo-100"
              )}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onBlur={commitOnly}
              onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} // 스크롤 값 변경 방지
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={(e) => {
                if (!hasBait || busy) return;
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  const n = normalizeOrFallback();
                  const next = Math.min(maxUsable, n + 1);
                  setBulkCount(next);
                  setInputText(String(next));
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  const n = normalizeOrFallback();
                  const next = Math.max(1, n - 1);
                  setBulkCount(next);
                  setInputText(String(next));
                }
              }}
              disabled={busy || !hasBait}
              aria-invalid={isInvalid || undefined}
            />
          </div>

          {/* 우측: 실행 버튼 */}
          <Button
            type="submit"
            disabled={busy || !hasBait || isBlank || isInvalid}
            title="Enter로도 시작할 수 있어요"
          >
            {busy ? "진행 중…" : "낚시 시작"}
          </Button>
        </form>

        {/* 탱크 관련 경고(있을 때만) */}
        {tanksErr && (
          <div className="mt-2 text-[11px] text-muted-foreground">
            {tanksErr}
          </div>
        )}
      </Card>
    </>
  );
}
