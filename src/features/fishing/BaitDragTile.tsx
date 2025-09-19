// src/features/fishing/ingredient-section/ui/BaitDragTile.tsx
"use client";

import { cn } from "@/lib/utils";
import { DND_MIME } from "./types";
import { cleanupDragGhost, setEmojiDragImage } from "./utils";

type Props = {
  baitCount: number;
  dragDisabled?: boolean;
};

export default function BaitDragTile({
  baitCount,
  dragDisabled = false,
}: Props) {
  const handleDragStart = (e: React.DragEvent) => {
    if (dragDisabled || baitCount <= 0) {
      e.preventDefault();
      return;
    }
    const payload = JSON.stringify({ type: "bait", emoji: "🐟" });
    e.dataTransfer.setData(DND_MIME, payload);
    e.dataTransfer.effectAllowed = "copy";
    setEmojiDragImage(e, "🐟", 64);
  };

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white p-4 grid place-items-center",
        dragDisabled ? "opacity-60" : ""
      )}
      title="이모지를 낚시터로 드래그해서 사용"
    >
      <button
        draggable={!dragDisabled && baitCount > 0}
        onDragStart={handleDragStart}
        onDragEnd={cleanupDragGhost}
        className={cn(
          "relative w-[96px] h-[96px] rounded-2xl border bg-white shadow-sm grid place-items-center",
          "text-[64px] leading-none select-none",
          dragDisabled
            ? "cursor-not-allowed"
            : "cursor-grab active:cursor-grabbing",
          "border-zinc-200"
        )}
      >
        🐟
        {dragDisabled && (
          <span className="absolute inset-0 bg-white/50 backdrop-blur-[1px]" />
        )}
      </button>
      <div className="mt-2 text-xs text-muted-foreground">
        드래그해서 단건 낚시 시작
      </div>
    </div>
  );
}
