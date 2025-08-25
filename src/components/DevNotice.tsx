// src/components/DevNotice.tsx
import { useEffect, useMemo, useState } from "react";

// ✅ shadcn/ui (요청: ./ui 경로)
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";

type Severity = "info" | "warning" | "critical";

export interface DevNote {
  id: string;
  title: string;
  description?: string;
  linkHref?: string;
  linkLabel?: string;
  severity?: Severity;
  date?: string; // "2025-08-09"
}

interface Props {
  notes: DevNote[];
  version?: string;
  onlyDev?: boolean;
  dismissible?: boolean;
  defaultOpen?: boolean;
  className?: string;
  title?: string;
  subtitle?: string;
  storageKey?: string;
}

const sevMap: Record<Severity, string> = {
  info: "bg-blue-50 text-blue-800 border-blue-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  critical: "bg-red-50 text-red-800 border-red-200",
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
  subtitle = "⚠️  변경/이슈를 공유합니다.",
  storageKey = "dev-notice",
}: Props) {
  // 환경 체크
  const isDev =
    (import.meta as any)?.env?.MODE === "development" ||
    process.env.NODE_ENV === "development";
  if (onlyDev && !isDev) return null;

  const fullKey = `${storageKey}:${version}`;

  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    const saved =
      typeof window !== "undefined" ? localStorage.getItem(fullKey) : null;
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
    setOpen(false);
  };

  if (total === 0) return null;

  // ✅ 최소화 상태: 플로팅 버튼
  if (hidden) {
    return (
      <Button
        onClick={handleRestore}
        variant="outline"
        className="fixed left-4 bottom-4 z-50 rounded-full bg-amber-50 border-amber-700 shadow-lg px-4 py-2 text-[#3d2b1f] gap-2"
        title="개발자 노트 다시 열기"
      >
        📢 <span className="font-semibold">개발자 공지사항</span>
      </Button>
    );
  }

  // ✅ 펼친 상태
  return (
    <Card
      role="status"
      aria-live="polite"
      className={["bg-amber-50 border-amber-200", className].join(" ")}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">📢</span>
              <CardTitle className="truncate text-[#3d2b1f]">
                {title}
                <span className="ml-1 text-xs align-top text-amber-600">
                  ({version})
                </span>
              </CardTitle>
            </div>
            {subtitle && (
              <CardDescription className="mt-1">{subtitle}</CardDescription>
            )}
            <p className="mt-1 text-[11px] text-[#8a6b50]">
              총 {total}건{criticalCount ? ` · 긴급 ${criticalCount}건` : ""}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="px-2"
              title={open ? "접기" : "펼치기"}
            >
              {open ? "🔼" : "🔽"}
            </Button>
            {dismissible && (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={handleDismiss}
                title="공지 숨기기"
              >
                최소화
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {open && (
        <>
          <Separator className="mb-2" />
          <CardContent>
            <ul className="space-y-2">
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
                        <Badge
                          variant="outline"
                          className="text-[10px] md:text-[11px]"
                        >
                          {n.date}
                        </Badge>
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
                        {n.linkLabel ?? "자세히 보기"}{" "}
                        <span aria-hidden>↗</span>
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </>
      )}
    </Card>
  );
}
