"use client";
import { Download } from "lucide-react";
import usePWAInstall from "./hooks/usePWAInstall";
import { cx } from "class-variance-authority"; // 없어도 됨. 아래서 간단히 대체 가능

type Variant = "sky" | "neutral" | "outline";
type Size = "sm" | "md" | "lg";

export default function InstallButton({
  className,
  label = "설치하기",
  variant = "sky",
  size = "md",
  disabled,
}: {
  className?: string;
  label?: string;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
}) {
  const { supported, promptInstall } = usePWAInstall();
  if (!supported) return null;

  const base =
    "group inline-flex items-center gap-2 rounded-xl border backdrop-blur-sm transition-all " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
    "disabled:opacity-60 disabled:pointer-events-none";

  const variants: Record<Variant, string> = {
    sky: "bg-white/70 border-sky-200 text-sky-700 hover:bg-white/90 hover:shadow-sm hover:border-sky-300 focus-visible:ring-sky-400",
    neutral:
      "bg-white/70 border-zinc-200 text-zinc-800 hover:bg-white/90 hover:shadow-sm hover:border-zinc-300 focus-visible:ring-zinc-400",
    outline:
      "bg-transparent border-zinc-300 text-zinc-800 hover:bg-zinc-50/60 hover:shadow-sm focus-visible:ring-zinc-400",
  };

  const sizes: Record<Size, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-3.5 py-2 text-sm",
    lg: "px-4 py-2.5 text-base",
  };

  return (
    <button
      type="button"
      aria-label={label}
      onClick={promptInstall}
      disabled={disabled}
      className={cx(base, variants[variant], sizes[size], className)}
    >
      <Download
        className="h-4 w-4 text-current transition-transform duration-200 group-hover:-translate-y-0.5"
        aria-hidden
      />
      <span className="font-medium">{label}</span>
    </button>
  );
}
