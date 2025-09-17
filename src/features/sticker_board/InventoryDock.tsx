"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { InventoryRow } from "./types";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"; // shadcn

type Props = {
  items: InventoryRow[];
  onStartDrag: (
    title: string,
    seed?: { clientX: number; clientY: number }
  ) => void;
};

// 토글 값 타입
type ViewType = "image" | "emoji";

export default function InventoryDock({ items, onStartDrag }: Props) {
  const [view, setView] = useState<ViewType>("image");

  const [pressing, setPressing] = useState<string | null>(null);
  const pressTimer = useRef<number | null>(null);
  const startPt = useRef<{ x: number; y: number } | null>(null);
  const started = useRef(false);

  const HOLD_MS = 180;
  const MOVE_PX = 6;

  // 선택된 뷰 & 수량>0 필터
  const visible = useMemo(
    () => items.filter((it) => it.qty > 0 && it.type === view),
    [items, view]
  );

  useEffect(() => {
    const onUp = () => {
      if (pressTimer.current) {
        clearTimeout(pressTimer.current);
        pressTimer.current = null;
      }
      setPressing(null);
      startPt.current = null;
      started.current = false;
      document.body.style.cursor = "";
    };
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("blur", onUp);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("blur", onUp);
    };
  }, []);

  return (
    <aside className="w-72 h-full overflow-auto bg-white/80 backdrop-blur border-l p-3">
      {/* 헤더: 제목 + 토글 */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-semibold">내 스티커</h3>
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => {
            if (v === "image" || v === "emoji") setView(v);
          }}
          className="h-8"
        >
          <ToggleGroupItem value="image" className="px-2">
            이미지
          </ToggleGroupItem>
          <ToggleGroupItem value="emoji" className="px-2">
            이모지
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {view === "image" ? "이미지 스티커가 없어요." : "이모지가 없어요."}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {visible.map((row) => (
            <ItemButton
              key={`${view}:${row.title}`}
              row={row}
              onStartDrag={onStartDrag}
              pressing={pressing}
              setPressing={setPressing}
              pressTimer={pressTimer}
              startPt={startPt}
              started={started}
              HOLD_MS={HOLD_MS}
              MOVE_PX={MOVE_PX}
            />
          ))}
        </div>
      )}
    </aside>
  );
}

/* ─────────────────────────────
 * 프레젠테이셔널 + 드래그 시작 핸들링
 * ───────────────────────────── */
function ItemButton(props: {
  row: InventoryRow;
  onStartDrag: Props["onStartDrag"];
  pressing: string | null;
  setPressing: (v: string | null) => void;
  pressTimer: React.MutableRefObject<number | null>;
  startPt: React.MutableRefObject<{ x: number; y: number } | null>;
  started: React.MutableRefObject<boolean>;
  HOLD_MS: number;
  MOVE_PX: number;
}) {
  const {
    row,
    onStartDrag,
    pressing,
    setPressing,
    pressTimer,
    startPt,
    started,
    HOLD_MS,
    MOVE_PX,
  } = props;

  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        setPressing(row.title);
        started.current = false;
        startPt.current = { x: e.clientX, y: e.clientY };
        (e.currentTarget as any).releasePointerCapture?.(e.pointerId);

        // 롱프레스 시작 → 전역 고스트 seed 전달
        pressTimer.current = window.setTimeout(() => {
          if (!started.current) {
            started.current = true;
            document.body.style.cursor = "grabbing";
            onStartDrag(row.title, { clientX: e.clientX, clientY: e.clientY });
          }
        }, HOLD_MS);
      }}
      onPointerMove={(e) => {
        if (!pressing || started.current) return;
        const s = startPt.current;
        if (!s) return;
        const dx = Math.abs(e.clientX - s.x);
        const dy = Math.abs(e.clientY - s.y);
        if (dx > MOVE_PX || dy > MOVE_PX) {
          started.current = true;
          if (pressTimer.current) clearTimeout(pressTimer.current);
          document.body.style.cursor = "grabbing";
          onStartDrag(pressing, { clientX: e.clientX, clientY: e.clientY });
        }
      }}
      onDragStart={(e) => e.preventDefault()}
      className="relative aspect-square rounded-lg border bg-white hover:shadow select-none"
      title={`${row.title} x${row.qty}`}
    >
      {row.type === "image" ? (
        <img
          src={row.url ?? ""}
          className="w-full h-full object-contain p-2 pointer-events-none"
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          alt={row.title}
        />
      ) : (
        <div
          className="grid place-items-center text-3xl select-none"
          draggable={false}
        >
          {row.emoji}
        </div>
      )}
      <span className="absolute right-1 bottom-1 text-xs bg-black/70 text-white rounded px-1">
        x{row.qty}
      </span>
    </button>
  );
}
