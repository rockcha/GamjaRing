// src/components/widgets/TimeMoodBanner.tsx
"use client";

import { cn } from "@/lib/utils";
import { useTimeMood } from "./useTimeMood";

export default function TimeMoodBanner({ className }: { className?: string }) {
  const { mood, line } = useTimeMood();

  const Icon = mood.Icon;
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl p-4 md:p-5 ring-offset-background",
        "shadow-sm backdrop-blur-sm",
        mood.classes.card,
        mood.classes.ring,
        className
      )}
      aria-label={`현재 테마: ${mood.label}`}
    >
      {/* 부드러운 빛 퍼짐 효과 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-60"
      />
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-xl border",
            mood.classes.chip
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className={cn("text-sm font-medium", mood.classes.title)}>
            {mood.label}
          </div>
          <div className={cn("text-sm truncate", mood.classes.text)}>
            {line}
          </div>
        </div>
      </div>
    </div>
  );
}
