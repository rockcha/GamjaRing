// src/features/bucketlist/components/BucketFilterBar.tsx
"use client";

import { cn } from "@/lib/utils";
import type { BucketFilters } from "./types";
import { CATEGORY_ORDER, CATEGORY_META, toneClasses } from "./types";

type Props = {
  filters: BucketFilters;
  onChange: (f: BucketFilters) => void;
};

export default function BucketFilterBar({ filters, onChange }: Props) {
  const set = (patch: Partial<BucketFilters>) =>
    onChange({ ...filters, ...patch });

  const currentTone =
    filters.category !== "전체"
      ? toneClasses(CATEGORY_META[filters.category].tone)
      : null;

  const pickBorderClass = (toneCard: string) =>
    toneCard.split(" ").find((k) => k.startsWith("border-")) ||
    "border-slate-200";

  // 파스텔 기본 배경 클래스 (tone.softBg가 이미 파스텔)
  const basePastel = (toneSoftBg?: string) => cn(toneSoftBg ?? "bg-slate-50");

  return (
    <div className="w-full space-y-3">
      {/* ✅ 카테고리 이모지 필터 — 항상 테마 파스텔 배경 */}
      <div className="flex flex-wrap gap-2">
        {/* 전체 */}
        <button
          type="button"
          className={cn(
            "rounded-xl border px-3 py-1.5 text-sm transition",
            basePastel(), // 파스텔 기본
            "text-slate-800",
            filters.category === "전체"
              ? "ring-2 ring-slate-300/70 shadow-sm -translate-y-[1px] border-slate-900 bg-white text-slate-900"
              : "hover:shadow-sm hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/70",
            "active:scale-[0.98]"
          )}
          onClick={() => set({ category: "전체" })}
        >
          전체
        </button>

        {CATEGORY_ORDER.map((c) => {
          const meta = CATEGORY_META[c];
          const tone = toneClasses(meta.tone);
          const active = filters.category === c;
          const borderClass = pickBorderClass(tone.card);
          return (
            <button
              key={c}
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm transition",
                basePastel(tone.softBg), // ✅ 기본부터 파스텔 배경 적용
                borderClass,
                "text-slate-800",
                active
                  ? cn("ring-2", tone.ring, "shadow-sm -translate-y-[1px]")
                  : cn(
                      "hover:shadow-sm hover:-translate-y-[1px]",
                      "focus-visible:outline-none focus-visible:ring-2",
                      tone.ring
                    ),
                "active:scale-[0.98]"
              )}
              onClick={() => set({ category: c })}
              aria-pressed={active}
              title={meta.desc}
            >
              <span className="text-base">{meta.emoji}</span>
              {c}
            </button>
          );
        })}
      </div>

      {/* 설명 줄 */}
      <p className="text-xs text-muted-foreground">
        {filters.category === "전체"
          ? "모든 카테고리를 함께 볼 수 있어요."
          : CATEGORY_META[filters.category].desc}
      </p>

      {/* ✅ 상태 세그먼트 — 항상 현재 카테고리 톤 파스텔 배경 */}
      <div className="flex flex-wrap gap-2">
        {(["미완료", "완료", "전체"] as const).map((s) => {
          const pastel = basePastel(currentTone?.softBg);
          const border = currentTone
            ? pickBorderClass(currentTone.card)
            : "border-slate-200";
          const ring = currentTone ? currentTone.ring : "ring-slate-300/70";
          const active = filters.status === s;

          return (
            <button
              key={s}
              type="button"
              onClick={() => set({ status: s })}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs transition",
                pastel, // ✅ 기본 파스텔 배경
                border,
                "text-slate-800",
                active
                  ? cn("ring-2", ring, "shadow-sm -translate-y-[1px]")
                  : cn(
                      "hover:shadow-sm hover:-translate-y-[1px]",
                      "focus-visible:outline-none focus-visible:ring-2",
                      ring
                    ),
                "active:scale-[0.98]"
              )}
            >
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
}
