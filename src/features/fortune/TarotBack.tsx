"use client";
import { Sparkles } from "lucide-react";

export default function TarotBack({
  w,
  h,
}: {
  w?: number | string;
  h?: number | string;
}) {
  return (
    <div
      className="relative rounded-3xl border bg-gradient-to-br from-purple-100 to-rose-100"
      style={{ width: w ?? "100%", height: h ?? "100%" }}
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(#ffffff88 1px, transparent 1px), radial-gradient(#ffffff66 1px, transparent 1px)",
          backgroundSize: "12px 12px, 24px 24px",
          backgroundPosition: "0 0, 12px 12px",
        }}
      />
      <div className="absolute inset-3 rounded-2xl border border-white/70 shadow-inner" />
      <div className="absolute inset-6 rounded-xl border border-white/50" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="h-14 w-14 rounded-full bg-white/80 shadow flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-purple-500" />
        </div>
      </div>
    </div>
  );
}
