// src/features/potato_field/PotatoFieldGrid.tsx
"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  computePlotsInfo,
  ensureRow,
  harvestPlot,
  plantSeed,
} from "./utils";
import { MATURE_MS, PLOT_COUNT } from "./types";
import type { PlotInfo, PlotState } from "./types";

function formatRemain(ms?: number) {
  if (!ms || ms <= 0) return "곧 수확 가능";

  const sec = Math.ceil(ms / 1000);
  const hh = Math.floor(sec / 3600);
  const mm = Math.floor((sec % 3600) / 60);
  const ss = sec % 60;

  if (hh > 0) return `${hh}시간 ${mm}분`;
  if (mm > 0) return `${mm}분 ${ss}초`;
  return `${ss}초`;
}

function getPlotCopy(state: PlotState, isBusy: boolean, remainMs?: number) {
  if (state === "empty") {
    return {
      src: "/potato_field/empty.png",
      alt: "빈 밭",
      label: "씨앗 심기",
      tooltip: isBusy ? "씨앗을 심는 중" : "씨앗 심기",
    };
  }

  if (state === "growing") {
    return {
      src: "/potato_field/growing.png",
      alt: "성장 중",
      label: formatRemain(remainMs),
      tooltip: `수확까지 ${formatRemain(remainMs)}`,
    };
  }

  return {
    src: "/potato_field/ready.png",
    alt: "수확 가능",
    label: "수확하기",
    tooltip: isBusy ? "수확 중" : "수확하기",
  };
}

export default function PotatoFieldGrid({
  coupleId,
  onCountChange,
}: {
  coupleId: string;
  onCountChange?: (n: number) => void;
}) {
  const [plots, setPlots] = useState<PlotInfo[]>([]);
  const [busy, setBusy] = useState<Set<number>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const row = await ensureRow(coupleId);
    setPlots(computePlotsInfo(row));
    onCountChange?.(row.harvested_count ?? 0);
  }, [coupleId, onCountChange]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const row = await ensureRow(coupleId);
        if (!mounted) return;
        setPlots(computePlotsInfo(row));
        onCountChange?.(row.harvested_count ?? 0);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        console.error(err);
        setError("감자밭을 불러오지 못했어요.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [coupleId, onCountChange]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPlots((prev) =>
        prev.map((plot) => {
          if (plot.state !== "growing" || !plot.plantedAt) return plot;

          const elapsed = Date.now() - plot.plantedAt.getTime();
          if (elapsed >= MATURE_MS) {
            return { ...plot, state: "ready", remainMs: 0 };
          }

          return { ...plot, remainMs: Math.max(0, MATURE_MS - elapsed) };
        }),
      );
    }, 10000);

    return () => window.clearInterval(timer);
  }, []);

  const counts = useMemo(
    () => ({
      empty: plots.filter((plot) => plot.state === "empty").length,
      growing: plots.filter((plot) => plot.state === "growing").length,
      ready: plots.filter((plot) => plot.state === "ready").length,
    }),
    [plots],
  );

  const handlePlotClick = useCallback(
    async (plot: PlotInfo) => {
      if (plot.state === "growing" || busy.has(plot.idx)) return;

      setBusy((prev) => {
        const next = new Set(prev);
        next.add(plot.idx);
        return next;
      });

      try {
        if (plot.state === "empty") {
          await plantSeed(coupleId, plot.idx);
        } else if (plot.state === "ready") {
          const row = await harvestPlot(coupleId, plot.idx);
          onCountChange?.(row.harvested_count ?? 0);
        }

        await refresh();
      } catch (err) {
        console.error(err);
        setError("작업을 완료하지 못했어요. 잠시 후 다시 시도해주세요.");
      } finally {
        setBusy((prev) => {
          const next = new Set(prev);
          next.delete(plot.idx);
          return next;
        });
      }
    },
    [busy, coupleId, onCountChange, refresh],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2.5 md:gap-3">
          {Array.from({ length: PLOT_COUNT }).map((_, index) => (
            <Skeleton key={index} className="aspect-square rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: PLOT_COUNT }).map((_, idx) => (
            <PlotCell
              key={idx}
              plot={plots[idx] ?? { idx, state: "empty", plantedAt: null }}
              busy={busy.has(idx)}
              onClick={handlePlotClick}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2.5 text-center text-xs md:gap-3">
          <StatPill label="빈 칸" value={counts.empty} className="bg-slate-50" />
          <StatPill
            label="성장 중"
            value={counts.growing}
            className="bg-amber-50 text-amber-700"
          />
          <StatPill
            label="수확 가능"
            value={counts.ready}
            className="bg-emerald-50 text-emerald-700"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
      </div>
    </TooltipProvider>
  );
}

const PlotCell = memo(function PlotCell({
  plot,
  busy,
  onClick,
}: {
  plot: PlotInfo;
  busy: boolean;
  onClick: (plot: PlotInfo) => void;
}) {
  const copy = getPlotCopy(plot.state, busy, plot.remainMs);
  const disabled = plot.state === "growing" || busy;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onClick(plot)}
          className={cn(
            "group relative aspect-square overflow-hidden rounded-lg border bg-amber-50/50 shadow-sm",
            "transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300",
            disabled && "cursor-default hover:translate-y-0 hover:shadow-sm",
            plot.state === "ready" && "border-emerald-200 bg-emerald-50",
          )}
        >
          <img
            src={copy.src}
            alt={copy.alt}
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
            loading="lazy"
          />

          <div className="absolute inset-x-1 bottom-1">
            <span
              className={cn(
                "mx-auto flex min-h-6 max-w-full items-center justify-center rounded-md bg-white/90 px-1.5 text-[10px] font-medium shadow-sm backdrop-blur",
                plot.state === "ready" && "text-emerald-700",
                plot.state === "growing" && "text-amber-700",
              )}
            >
              {busy ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <span className="truncate">{copy.label}</span>
              )}
            </span>
          </div>
        </button>
      </TooltipTrigger>
      <TooltipContent>{copy.tooltip}</TooltipContent>
    </Tooltip>
  );
});

function StatPill({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border px-2 py-2", className)}>
      <div className="font-bold tabular-nums">{value}</div>
      <div className="mt-0.5 text-muted-foreground">{label}</div>
    </div>
  );
}
