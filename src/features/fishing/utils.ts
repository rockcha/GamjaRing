// src/features/fishing/ingredient-section/utils.ts
import type { Rarity } from "./types";

export const rarityDir = (r: Rarity) =>
  r === "일반"
    ? "common"
    : r === "희귀"
    ? "rare"
    : r === "에픽"
    ? "epic"
    : "legend";

export const rarityEn = (r: Rarity) =>
  r === "일반"
    ? "common"
    : r === "희귀"
    ? "rare"
    : r === "에픽"
    ? "epic"
    : "legendary";

export const RARITY_ORDER: Rarity[] = ["전설", "에픽", "희귀", "일반"];

export const rarityWeight = (r: Rarity) =>
  r === "전설" ? 4 : r === "에픽" ? 3 : r === "희귀" ? 2 : 1;

export const classesByRarity = (r: Rarity) =>
  r === "일반"
    ? {
        card: "bg-neutral-50 border-neutral-200",
        imgBorder: "border-neutral-200",
        metaText: "text-neutral-700/80",
        pill: "border-neutral-200 bg-neutral-50 text-neutral-700",
      }
    : r === "희귀"
    ? {
        card: "bg-sky-50 border-sky-200",
        imgBorder: "border-sky-200",
        metaText: "text-sky-700/80",
        pill: "border-sky-200 bg-sky-50 text-sky-800",
      }
    : r === "에픽"
    ? {
        card: "bg-violet-50 border-violet-200",
        imgBorder: "border-violet-200",
        metaText: "text-violet-700/80",
        pill: "border-violet-200 bg-violet-50 text-violet-800",
      }
    : {
        card: "bg-amber-50 border-amber-200",
        imgBorder: "border-amber-200",
        metaText: "text-amber-700/80",
        pill: "border-amber-300 bg-amber-50 text-amber-900",
      };

export function unwrapRpcRow<T>(data: T | T[] | null): T | null {
  return Array.isArray(data) ? data[0] ?? null : data ?? null;
}

/* 🐟 드래그 고스트 유틸 */
let dragGhostEl: HTMLDivElement | null = null;

export function setEmojiDragImage(
  e: React.DragEvent,
  emoji: string,
  fontPx = 64
) {
  if (dragGhostEl) {
    dragGhostEl.remove();
    dragGhostEl = null;
  }
  const ghost = document.createElement("div");
  ghost.textContent = emoji;
  ghost.style.position = "fixed";
  ghost.style.top = "-1000px";
  ghost.style.left = "-1000px";
  ghost.style.fontSize = `${fontPx}px`;
  ghost.style.lineHeight = "1";
  ghost.style.pointerEvents = "none";
  ghost.style.userSelect = "none";
  ghost.style.background = "transparent";
  document.body.appendChild(ghost);
  dragGhostEl = ghost;
  e.dataTransfer!.setDragImage(ghost, fontPx / 2, fontPx / 2);
}

export function cleanupDragGhost() {
  if (dragGhostEl) {
    dragGhostEl.remove();
    dragGhostEl = null;
  }
}
