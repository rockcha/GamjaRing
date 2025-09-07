"use client";
import usePWAInstall from "./hooks/usePWAInstall";

export default function InstallButton({ className }: { className?: string }) {
  const { supported, promptInstall } = usePWAInstall();
  if (!supported) return null;
  return (
    <button
      onClick={promptInstall}
      className={
        className ??
        "rounded-md bg-sky-600 text-white px-3 py-1.5 text-sm hover:bg-sky-700"
      }
    >
      앱 설치하기
    </button>
  );
}
