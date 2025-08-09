// src/components/DevNotice.tsx
import { useEffect, useMemo, useState } from "react";

type Severity = "info" | "warning" | "critical";

export interface DevNote {
  id: string;
  title: string;
  description?: string;
  linkHref?: string;
  linkLabel?: string;
  severity?: Severity;
  date?: string; // "2025-08-09" 같은 포맷 권장
}

interface Props {
  notes: DevNote[];
  version?: string; // 공지 버전 (닫기 상태 초기화용)
  onlyDev?: boolean; // true면 dev 환경에서만 노출
  dismissible?: boolean; // 닫기 버튼 노출
  defaultOpen?: boolean; // 최초 펼침 상태
  className?: string;
  title?: string; // 상단 큰 타이틀
  subtitle?: string; // 부제
  storageKey?: string; // 로컬스토리지 키 커스텀
}

const sevMap: Record<Severity, string> = {
  info: "bg-blue-100 text-blue-800 border-blue-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  critical: "bg-red-100 text-red-800 border-red-200",
};
const sevDot: Record<Severity, string> = {
  info: "bg-blue-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
};

export default function DevNotice({
  notes,
  version = "v1",
  onlyDev = false,
  dismissible = true,
  defaultOpen = false,
  className = "",
  title = "개발자 공지사항",
  subtitle = "⚠️ 개발자용: 변경/이슈를 공유합니다.",
  storageKey = "dev-notice",
}: Props) {
  // 환경 체크
  const isDev =
    import.meta.env?.MODE === "development" ||
    process.env.NODE_ENV === "development";
  if (onlyDev && !isDev) return null;

  const fullKey = `${storageKey}:${version}`;

  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    const saved = localStorage.getItem(fullKey);
    if (saved === "hidden") setHidden(true);
  }, [fullKey]);

  const total = notes.length;
  const criticalCount = useMemo(
    () => notes.filter((n) => n.severity === "critical").length,
    [notes]
  );

  const handleDismiss = () => {
    setHidden(true);
    localStorage.setItem(fullKey, "hidden");
  };

  const handleRestore = () => {
    setHidden(false);
    localStorage.removeItem(fullKey);
    // 복원 시 접힌 상태로 시작하고 싶다면 아래 주석을 해제
    // setOpen(false);
  };

  // 공지가 없으면 아무것도 노출하지 않음
  if (total === 0) return null;

  // ✅ 닫힌 상태: 아주 작은 플로팅 버튼 표시
  if (hidden) {
    return (
      <button
        type="button"
        onClick={handleRestore}
        className={[
          // 화면 좌하단 작은 플로팅
          "fixed bottom-4 left-4 z-[60]",
          // 버튼 스타일
          "px-2 py-1 text-[11px] rounded-full border shadow-sm",
          "bg-white border-amber-200 text-[#5b3d1d]",
          "hover:bg-amber-50 active:scale-[0.99] transition",
        ].join(" ")}
        aria-label="개발자 노트 다시 열기"
        title="개발자 노트 다시 열기"
      >
        🥔 개발자 노트
      </button>
    );
  }

  // 펼쳐진 상태: 기존 UI 그대로
  return (
    <section
      className={[
        "rounded-xl border bg-white shadow-sm",
        "border-amber-200/70",
        className,
      ].join(" ")}
      role="status"
      aria-live="polite"
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">🥔</span>
            <h3 className="text-base md:text-lg font-bold text-[#3d2b1f] truncate">
              {title}{" "}
              <span className="ml-1 text-xs align-top text-amber-600">
                ({version})
              </span>
            </h3>
          </div>
          {subtitle && (
            <p className="mt-0.5 text-xs md:text-sm text-[#6b533b]">
              {subtitle}
            </p>
          )}
          <p className="mt-1 text-[11px] text-[#8a6b50]">
            총 {total}건{criticalCount ? ` · 긴급 ${criticalCount}건` : ""}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="px-2 py-1 text-xs rounded-md border border-amber-200 hover:bg-amber-50 text-[#5b3d1d] transition"
            aria-expanded={open}
          >
            {open ? "접기" : "펼치기"}
          </button>
          {dismissible && (
            <button
              type="button"
              onClick={handleDismiss}
              className="ml-1 px-2 py-1 text-xs rounded-md border border-red-200 text-red-700 hover:bg-red-50 transition"
              aria-label="공지 숨기기"
            >
              닫기
            </button>
          )}
        </div>
      </div>

      {/* 리스트 */}
      {open && (
        <ul className="px-4 pb-3 space-y-2">
          {notes.map((n) => {
            const sev = n.severity ?? "info";
            return (
              <li
                key={n.id}
                className={[
                  "rounded-lg border px-3 py-2",
                  "flex flex-col gap-1",
                  sevMap[sev],
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${sevDot[sev]}`}
                    />
                    <p className="font-semibold text-sm md:text-base truncate">
                      {n.title}
                    </p>
                  </div>
                  {n.date && (
                    <span className="text-[11px] opacity-80 shrink-0">
                      {n.date}
                    </span>
                  )}
                </div>

                {n.description && (
                  <p className="text-xs md:text-sm leading-snug">
                    {n.description}
                  </p>
                )}

                {n.linkHref && (
                  <a
                    href={n.linkHref}
                    target="_blank"
                    rel="noreferrer"
                    className="self-start mt-0.5 inline-flex items-center gap-1 text-xs underline hover:opacity-80"
                  >
                    {n.linkLabel ?? "자세히 보기"}
                    <span aria-hidden>↗</span>
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
