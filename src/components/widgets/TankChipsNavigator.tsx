// src/components/aquarium/TankChipsNavigator.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Anchor } from "lucide-react";

type Tank = { tank_no: number; title: string; theme_id: number | null };

type Props = {
  tanks: Tank[];
  idx: number;
  onSelect: (index: number) => void;
  className?: string;
};

export default function TankChipsNavigator({
  tanks,
  idx,
  onSelect,
  className,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLButtonElement>(
      `[data-index="${idx}"]`
    );
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [idx, tanks.length]);

  const items = useMemo(
    () =>
      tanks.map((t) => ({
        ...t,
        _title: t.title?.trim() || `${t.tank_no}번 어항`,
      })),
    [tanks]
  );

  return (
    <aside
      className={cn(
        "sticky top-20 max-h-[calc(100svh-120px)]",
        // Glass 카드 톤 유지
        "w-full sm:w-[248px] rounded-2xl border border-white/60 bg-gradient-to-b from-white/75 to-white/55 backdrop-blur-md",
        "shadow-[0_6px_24px_rgba(15,23,42,0.06)]",
        "p-3 flex flex-col",
        className
      )}
      aria-label="아쿠아리움 이름 네비게이터"
    >
      {/* 헤더 */}
      <header className="px-1 py-0.5 flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/15 ring-1 ring-amber-500/20">
          <Anchor className="h-[14px] w-[14px] text-amber-600" />
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold text-sm leading-5">네비게이터</h3>
          <p className="text-[11px] text-muted-foreground/80 leading-4">
            어항을 빠르게 이동하세요
          </p>
        </div>
      </header>

      <Separator className="my-2" />

      {/* 리스트 (스크롤 페이드 마스크) */}
      <div
        ref={listRef}
        className={cn(
          "min-h-0 overflow-y-auto pr-1 flex flex-col gap-1.5",
          "[mask-image:linear-gradient(to_bottom,transparent,black_14px,black_calc(100%-14px),transparent)]"
        )}
      >
        {items.map((t, i) => {
          const active = i === idx;

          return (
            <div key={t.tank_no} className="relative">
              {/* 좌측 얇은 액티브 바 (유지) */}
              <span
                aria-hidden
                className={cn(
                  "absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full transition-opacity",
                  active ? "opacity-100 bg-amber-500/70" : "opacity-0"
                )}
              />
              <Button
                data-index={i}
                onClick={() => onSelect(i)}
                variant="ghost"
                aria-current={active ? "true" : undefined}
                // 활성 시 hover 효과 제거, 비활성 시만 hover 살짝
                className={cn(
                  "group w-full h-10 rounded-xl justify-start gap-2 pl-3 pr-2 text-[13px]",
                  "transition-all duration-200 border border-transparent",
                  active
                    ? "bg-amber-600 text-white shadow-sm hover:bg-amber-600"
                    : "hover:bg-black/[0.02]"
                )}
              >
                {/* ✅ 글머리표(컬러 dot) 제거됨 */}

                {/* 타이틀 */}
                <span
                  className={cn(
                    "truncate",
                    active ? "font-semibold" : "text-slate-700"
                  )}
                >
                  {t._title}
                </span>

                {/* 번호 태그 */}
                <span
                  className={cn(
                    "ml-auto text-[11px] tabular-nums",
                    active ? "text-white/90" : "text-muted-foreground"
                  )}
                >
                  #{t.tank_no}
                </span>
              </Button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
