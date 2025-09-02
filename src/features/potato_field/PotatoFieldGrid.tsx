"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ensureRow,
  computePlotsInfo,
  getPotatoCount,
  getPlotsPlantedAt,
  plantSeed,
  harvestPlot,
} from "./utils";
import { MATURE_MS, PLOT_COUNT } from "./types";
import type { PlotInfo } from "./types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function fmtRemain(ms?: number) {
  if (!ms || ms <= 0) return "곧 수확 가능";
  const sec = Math.ceil(ms / 1000);
  const hh = Math.floor(sec / 3600);
  const mm = Math.floor((sec % 3600) / 60);
  const ss = sec % 60;
  if (hh > 0) return `${hh}시간 ${mm}분`;
  if (mm > 0) return `${mm}분 ${ss}초`;
  return `${ss}초`;
}

export default function PotatoFieldGrid({
  coupleId,
  onCountChange,
}: {
  coupleId: string;
  onCountChange?: (n: number) => void;
}) {
  const [plots, setPlots] = useState<PlotInfo[]>([]);
  const [isBusyIdx, setIsBusyIdx] = useState<number | null>(null); // 2초 연출
  const [rev, setRev] = useState(0); // 강제 리프레시 트리거

  // 초기 로드 + 행 보장
  useEffect(() => {
    if (!coupleId) return;
    (async () => {
      await ensureRow(coupleId);
      const arr = await getPlotsPlantedAt(coupleId);
      setPlots(
        computePlotsInfo({
          couple_id: coupleId,
          harvested_count: 0,
          tool: null,
          plots_planted_at: arr,
        })
      );
      const cnt = await getPotatoCount(coupleId);
      onCountChange?.(cnt);
    })();
  }, [coupleId, onCountChange, rev]);

  // 1초 간격으로 남은 시간 갱신(프론트 표시용)
  useEffect(() => {
    const t = setInterval(() => {
      setPlots((prev) =>
        prev.map((p) => {
          if (p.state !== "growing" || !p.plantedAt) return p;
          const elapsed = Date.now() - p.plantedAt.getTime();
          if (elapsed >= MATURE_MS) {
            return { ...p, state: "ready", remainMs: 0 };
          }
          return { ...p, remainMs: Math.max(0, MATURE_MS - elapsed) };
        })
      );
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // 클릭 핸들러
  async function onClickCell(p: PlotInfo) {
    if (isBusyIdx !== null) return;
    if (p.state === "growing") return; // 클릭 무시
    setIsBusyIdx(p.idx);

    if (p.state === "empty") {
      // 씨앗 심는 연출(2초)
      toast.message("씨앗 심는 중… ⏳");
      await new Promise((r) => setTimeout(r, 2000));
      try {
        await plantSeed(coupleId, p.idx);
        toast.success("씨앗을 심었습니다 🌱");
      } catch (e) {
        console.error(e);
        toast.error("씨앗 심기에 실패했어요");
      }
    } else if (p.state === "ready") {
      // 수확 연출(2초)
      toast.message("수확 중… 🪓");
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const row = await harvestPlot(coupleId, p.idx);
        toast.success("수확 완료! 🥔 +1");
        onCountChange?.(row.harvested_count ?? 0);
      } catch (e) {
        console.error(e);
        toast.error("수확에 실패했어요");
      }
    }

    setIsBusyIdx(null);
    setRev((n) => n + 1); // 새로고침
  }

  // 셀 렌더
  function renderCell(p: PlotInfo) {
    const isBusy = isBusyIdx === p.idx;

    let content = null;
    let tip = "";
    let hoverClass =
      "hover:scale-[1.02] hover:shadow-inner hover:shadow-black/10 transition-transform";

    if (p.state === "empty") {
      content = <span className="text-2xl">　</span>;
      tip = isBusy ? "씨앗 심는 중…" : "씨앗 심기";
    } else if (p.state === "growing") {
      content = <span className="text-2xl">🌱</span>;
      tip = `수확까지 ${fmtRemain(p.remainMs)}`;
      hoverClass = "opacity-90"; // 클릭 불가
    } else {
      content = <span className="text-2xl">🥔</span>;
      tip = isBusy ? "수확 중…" : "수확하기";
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            disabled={p.state === "growing" || isBusy}
            onClick={() => onClickCell(p)}
            className={cn(
              "relative grid place-items-center rounded-lg border border-amber-700/40 bg-amber-100/50 aspect-square",
              "outline-none focus:ring-2 ring-amber-400/80",
              p.state === "empty" && "bg-amber-50",
              p.state === "growing" && "bg-green-100/50",
              p.state === "ready" && "bg-amber-200/60",
              hoverClass
            )}
          >
            {/* 땅 텍스처 느낌 */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(0,0,0,.03),transparent_40%),radial-gradient(circle_at_70%_60%,rgba(0,0,0,.03),transparent_45%)] rounded-lg" />
            {/* 상태 아이콘 */}
            <div className="relative z-10">{content}</div>

            {/* 2초 연출 오버레이 */}
            {isBusy && (
              <div className="absolute inset-0 grid place-items-center bg-black/10 backdrop-blur-[1px] rounded-lg">
                <span className="text-2xl animate-pulse">
                  {p.state === "empty" ? "⏳" : "🪓"}
                </span>
              </div>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>{tip}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="mx-auto w-full max-w-md">
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          }}
        >
          {Array.from({ length: PLOT_COUNT }).map((_, i) =>
            renderCell(plots[i] ?? { idx: i, state: "empty", plantedAt: null })
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
