import { useRef, useState } from "react";

export type RecentItem = { title: string; emoji: string };

export default function RecentIngredientsStrip({
  items,
  onChange,
  initialIndex = 0,
}: {
  items: RecentItem[];
  onChange?: (idx: number, item: RecentItem) => void;
  initialIndex?: number;
}) {
  const [idx, setIdx] = useState(initialIndex);
  const start = useRef<{ x: number; y: number } | null>(null);

  const commit = (next: number) => {
    const N = items.length;
    const clamped = (next + N) % N;
    setIdx(clamped);
    onChange?.(clamped, items[clamped]);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!start.current) return;
    const t = e.touches[0];
    const dx = t.clientX - start.current.x;
    const dy = t.clientY - start.current.y;
    if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy)) {
      commit(idx + (dx < 0 ? 1 : -1));
      start.current = null; // 한번만
    }
  };
  const onTouchEnd = () => (start.current = null);

  const cur = items[idx];

  return (
    <div
      className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[61] md:hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex items-center gap-2 rounded-full border bg-white/90 backdrop-blur px-3 py-1.5 shadow">
        <button
          className="px-2 py-1 text-zinc-600"
          onClick={() => commit(idx - 1)}
        >
          ◀
        </button>
        <div className="min-w-28 text-center">
          <span className="text-lg">{cur?.emoji}</span>{" "}
          <span className="text-sm font-medium">{cur?.title}</span>
        </div>
        <button
          className="px-2 py-1 text-zinc-600"
          onClick={() => commit(idx + 1)}
        >
          ▶
        </button>
      </div>
    </div>
  );
}
