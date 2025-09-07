"use client";
import { Download } from "lucide-react"; // lucide-react 아이콘
import usePWAInstall from "./hooks/usePWAInstall";

export default function InstallButton({ className }: { className?: string }) {
  const { supported, promptInstall } = usePWAInstall();
  if (!supported) return null;

  return (
    <button
      onClick={promptInstall}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-lg  px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-50 hover:border-sky-400 transition-colors"
      }
    >
      <Download className="w-4 h-4 text-sky-600" />
      설치하기
    </button>
  );
}
