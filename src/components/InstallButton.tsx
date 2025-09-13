import { usePwaInstall } from "./hooks/usePWAInstall";

export default function InstallButton() {
  const { canInstall, promptInstall } = usePwaInstall();
  if (!canInstall) return null;
  return (
    <button
      onClick={promptInstall}
      className="px-3 py-1.5 rounded-lg bg-sky-500 text-white shadow"
    >
      앱 설치
    </button>
  );
}
