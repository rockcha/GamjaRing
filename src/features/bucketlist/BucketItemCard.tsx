// src/features/bucketlist/BucketItemCard.tsx
"use client";

import { memo, useMemo, MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { ExternalLink, Check } from "lucide-react";
import type { BucketItem, BucketCategory } from "./types";
import { CATEGORY_META, toneClasses } from "./types";

type Props = {
  item: BucketItem;
  onToggleComplete: (id: number, next: boolean) => void;
  onEdit: (item: BucketItem) => void; // 카드 클릭 시 다이얼로그 오픈
};

function formatDate(dateLike: string | Date) {
  try {
    const d = new Date(dateLike);
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
}

const BucketItemCard = memo(function BucketItemCard({
  item,
  onToggleComplete,
  onEdit,
}: Props) {
  const isDone = !!item.completed;
  const meta = item.category
    ? CATEGORY_META[item.category as BucketCategory]
    : null;
  const tone = meta ? toneClasses(meta.tone) : null;

  const cardClass = useMemo(
    () =>
      cn(
        "group relative w-full h-full rounded-xl border transition-colors duration-200",
        // 카테고리 기반 톤 컬러
        tone?.card ?? "border-slate-200 bg-white/95 dark:bg-slate-900/10",
        // hover/focus 시 살짝 강조
        "hover:shadow-sm focus:outline-none focus-visible:ring-2",
        tone?.ring ?? "focus-visible:ring-slate-300/60",
        // 패딩
        "p-3 sm:p-4",
        // 완료 상태 비주얼 약간 낮춤
        isDone && "opacity-90"
      ),
    [isDone, tone]
  );

  const handleCardClick = () => {
    onEdit(item);
  };

  const stop = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className={cn(cardClass, "cursor-pointer")}
      aria-label={`${item.title}${
        item.due_date ? `, 마감일 ${formatDate(item.due_date)}` : ""
      }`}
      title={item.title}
    >
      {/* 헤더: 제목 + 우측 체크 토글 */}
      <div className="flex items-start gap-2">
        <h3
          className={cn(
            "flex-1 min-w-0 truncate text-[15px] font-semibold text-slate-800",
            "dark:text-slate-100"
          )}
        >
          {item.title}
        </h3>

        {/* 체크 토글 (제목 오른쪽) */}
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            onToggleComplete(item.id, !isDone);
          }}
          aria-pressed={isDone}
          aria-label={isDone ? "완료 해제" : "완료로 표시"}
          className={cn(
            "shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px]",
            "transition-all bg-white/80 backdrop-blur",
            isDone
              ? "border-emerald-300 text-emerald-800"
              : "border-slate-200 text-slate-700 hover:bg-slate-100"
          )}
          onPointerDown={stop}
        >
          <span
            className={cn(
              "grid place-items-center rounded-full border h-4 w-4",
              isDone
                ? "border-emerald-400 bg-emerald-500 text-white"
                : "border-slate-300 bg-white text-transparent"
            )}
          >
            <Check className="h-3 w-3" />
          </span>
          <span className="select-none">{isDone ? "완료" : "미완"}</span>
        </button>
      </div>

      {/* 메타(기간/링크) — 본문보다 먼저 */}
      {(item.due_date || item.link_url) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {item.due_date && (
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-1.5 py-1 text-[11px]",
                "bg-white/80 text-slate-700 dark:text-slate-200",
                tone?.badge ?? "border-slate-200"
              )}
              onClick={stop}
            >
              ⏰ {formatDate(item.due_date)}
            </span>
          )}

          {item.link_url && (
            <a
              href={item.link_url}
              target="_blank"
              rel="noreferrer"
              onClick={stop}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-1.5 py-1 text-[12px]",
                "transition-colors bg-white/80",
                tone?.badge ??
                  "border-slate-200 text-slate-700 hover:bg-slate-100"
              )}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              링크 열기
            </a>
          )}
        </div>
      )}

      {/* 구분선 */}
      {(item.due_date || item.link_url) && (
        <div className="mt-2 border-t border-dashed border-slate-200" />
      )}

      {/* 본문 (기간/링크 다음) */}
      {item.content && (
        <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-[13px] leading-snug text-slate-700 dark:text-slate-200">
          {item.content}
        </p>
      )}
    </div>
  );
});

export default BucketItemCard;
