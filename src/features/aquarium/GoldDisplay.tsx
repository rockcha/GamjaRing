// src/components/GoldDisplay.tsx
"use client";
import { Coins } from "lucide-react";

export default function GoldDisplay({ gold }: { gold: number }) {
  return (
    <div
      className="
        inline-flex items-center gap-2 px-3 py-1.5
        rounded-full bg-amber-100 text-amber-900 border border-amber-300
        transition-all duration-200
        hover:bg-amber-200 hover:shadow-md cursor-default
      "
    >
      <Coins className="w-4 h-4 text-amber-600" />
      <span className="text-sm font-semibold">골드</span>
      <span className="text-sm">{gold}</span>
    </div>
  );
}
