"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
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
  const [busy, setBusy] = useState<Set<number>>(new Set());
  const [rev, setRev] = useState(0);

  // 초기 로드
  useEffect(() => {
    if (!coupleId) return;
    (async () => {
      await ensureRow(coupleId);
      const arr = await getPlotsPlantedAt(coupleId);
      setPlots(
        computePlotsInfo({
          couple_id: coupleId,
          harvested_count: 0,
          plots_planted_at: arr,
        })
      );
      const cnt = await getPotatoCount(coupleId);
      onCountChange?.(cnt);
    })();
  }, [coupleId, onCountChange, rev]);

  // 1초 타이머
  useEffect(() => {
    const t = setInterval(() => {
      setPlots((prev) =>
        prev.map((p) => {
          if (p.state !== "growing" || !p.plantedAt) return p;
          const elapsed = Date.now() - p.plantedAt.getTime();
          if (elapsed >= MATURE_MS)
            return { ...p, state: "ready", remainMs: 0 };
          return { ...p, remainMs: Math.max(0, MATURE_MS - elapsed) };
        })
      );
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // 클릭
  async function onClickCell(p: PlotInfo) {
    if (p.state === "growing") return; // 성장 중 클릭 무시
    if (busy.has(p.idx)) return;

    setBusy((prev) => new Set(prev).add(p.idx));

    if (p.state === "empty") {
      // 씨앗 심기(연출 2초)
      await new Promise((r) => setTimeout(r, 2000));
      try {
        await plantSeed(coupleId, p.idx);
      } finally {
        // noop
      }
    } else if (p.state === "ready") {
      // 수확(연출 2초)
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const row = await harvestPlot(coupleId, p.idx);
        onCountChange?.(row.harvested_count ?? 0);
      } finally {
        // noop
      }
    }

    setBusy((prev) => {
      const next = new Set(prev);
      next.delete(p.idx);
      return next;
    });
    setRev((n) => n + 1); // 상태 새로고침 → 페이드로 자연 전환
  }

  // 셀
  function renderCell(p: PlotInfo) {
    const isBusy = busy.has(p.idx);

    // 상태별 PNG (항상 표시; busy여도 숨기지 않음)
    let mainSrc = "";
    let mainAlt = "";
    let tip = "";

    if (p.state === "empty") {
      mainSrc = "/potato_field/empty.png";
      mainAlt = "빈 밭";
      tip = isBusy ? "씨앗 심는 중…" : "씨앗 심기";
    } else if (p.state === "growing") {
      mainSrc = "/potato_field/growing.png";
      mainAlt = "성장 중";
      tip = `수확까지 ${fmtRemain(p.remainMs)}`;
    } else {
      mainSrc = "/potato_field/ready.png";
      mainAlt = "수확 가능";
      tip = isBusy ? "수확 중…" : "수확하기";
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            disabled={p.state === "growing" || isBusy}
            onClick={() => onClickCell(p)}
            className={cn(
              "relative aspect-square rounded-xl overflow-hidden grid place-items-center",
              "focus:outline-none hover:scale-[1.01] transition-transform"
            )}
            style={{ minWidth: 128, minHeight: 128 }}
          >
            {/* 메인 PNG: 셀 꽉 채움 + 상태 변경 시 부드럽게 페이드 */}
            <img
              key={mainSrc} // 상태 바뀌면 새 이미지로 교체 → 페이드 애니메이션 트리거
              src={mainSrc}
              alt={mainAlt}
              className="absolute inset-0 h-full w-full object-cover animate-[fadeIn_220ms_ease-out_forwards]"
              draggable={false}
            />

            {/* 진행 중 오버레이: 기존 PNG 유지 + 라벨만 표시 */}
            {isBusy && (
              <div className="absolute inset-0 grid place-items-end p-2 pointer-events-none">
                <span className="inline-flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-white text-xs">
                  ⏳ {p.state === "empty" ? "씨앗 심는 중…" : "수확 중…"}
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
      <div className="mx-auto w-full">
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(3, minmax(128px, 1fr))" }}
        >
          {Array.from({ length: PLOT_COUNT }).map((_, i) =>
            renderCell(plots[i] ?? { idx: i, state: "empty", plantedAt: null })
          )}
        </div>
      </div>

      {/* 페이드 인 키프레임 (상태 전환 시 부드럽게) */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </TooltipProvider>
  );
}
