// src/features/bucketlist/components/BucketItemCard.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ExternalLink,
  Pencil,
  Trash2,
  CalendarDays,
  Link as LinkIcon,
  Check,
  User2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BucketItem } from "./types";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatDate(d?: string | null) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
  } catch {
    return d;
  }
}

export default function BucketItemCard({
  item,
  me,
  onToggleComplete,
  onEdit,
  onDelete,
}: {
  item: BucketItem;
  me: string;
  onToggleComplete: (id: number, next: boolean) => void | Promise<void>;
  onEdit: (item: BucketItem) => void;
  onDelete: (id: number) => void | Promise<void>;
}) {
  const due = formatDate(item.due_date);
  const isMine = item.author_id === me;

  const [popping, setPopping] = useState(false);
  const [open, setOpen] = useState(false);

  const timeoutRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const toggleComplete = async (next: boolean) => {
    if (next) {
      setPopping(true);
      timeoutRef.current = window.setTimeout(() => {
        onToggleComplete(item.id, next);
        setTimeout(() => setPopping(false), 600);
      }, 140);
    } else {
      onToggleComplete(item.id, next);
    }
  };

  const handleHeaderToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleComplete(!item.completed);
  };

  const handleEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onEdit(item);
  };

  const handleDelete = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onDelete(item.id);
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -8 }}
        transition={{ duration: 0.18 }}
        className="w-full"
      >
        <Card
          onClick={() => setOpen(true)}
          className={cn(
            "relative w-full cursor-pointer rounded-lg border p-4 shadow-sm transition",
            "border-slate-200 bg-white hover:shadow-md hover:-translate-y-[1px]",
            "active:scale-[0.99]"
          )}
          role="button"
          aria-label={`${item.title} 상세 보기`}
        >
          {/* 헤더: 제목 + 작성자 / 완료 버튼 */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h3
                  className={cn(
                    "font-semibold text-base leading-snug truncate",
                    item.completed ? "text-slate-700" : "text-slate-900"
                  )}
                  title={item.title}
                >
                  {item.title}
                </h3>

                {/* 작성자 라벨(제목 우측 작게) */}
                <span
                  className="shrink-0 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600"
                  title={`작성자: ${isMine ? "나" : "상대"}`}
                >
                  <User2 className="w-3.5 h-3.5" />
                  {isMine ? "나" : "상대"}
                </span>
              </div>

              {/* 카드에는 날짜 뱃지 없이 미니멀 유지 (디테일에서 명확히 표시) */}
            </div>

            {/* ✅ 완료 버튼 (미니멀 체크박스 + 라벨) */}
            <button
              onClick={handleHeaderToggleClick}
              className={cn(
                "relative inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs",
                item.completed
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50",
                "active:scale-[0.98] transition"
              )}
              aria-pressed={item.completed}
              aria-label={item.completed ? "미완료로 표시" : "완료로 표시"}
              title="완료 버튼"
            >
              <span className="select-none">
                {item.completed ? "완료됨" : "완료"}
              </span>
              <span
                className={cn(
                  "grid place-items-center h-4 w-4 rounded-[2px] border transition",
                  item.completed
                    ? "bg-white/95 text-emerald-600 border-transparent"
                    : "bg-white border-slate-300"
                )}
              >
                {item.completed ? <Check className="w-3.5 h-3.5" /> : null}
              </span>

              {/* 팝 이펙트 */}
              {popping && (
                <div className="pointer-events-none absolute inset-0">
                  {[..."✨💫🫧🌟"].map((emo, i) => (
                    <motion.span
                      key={i}
                      className="absolute left-1/2 top-1/2"
                      initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
                      animate={{
                        opacity: [0, 1, 0],
                        scale: [0.5, 1, 0.8],
                        x: Math.cos((i / 4) * Math.PI * 2) * 18,
                        y: Math.sin((i / 4) * Math.PI * 2) * 18,
                      }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      style={{ translateX: "-50%", translateY: "-50%" }}
                    >
                      {emo}
                    </motion.span>
                  ))}
                </div>
              )}
            </button>
          </div>
        </Card>
      </motion.div>

      {/* ============ 상세 Dialog (미니멀) ============ */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg w-[min(96vw,720px)]">
          <DialogHeader>
            <DialogTitle
              className={cn(
                "text-[16px] font-semibold",
                item.completed && "text-slate-700"
              )}
            >
              {item.title}
            </DialogTitle>
          </DialogHeader>

          {/* 정보 섹션: 제한 날짜 */}
          <div className="rounded-xl border bg-white p-3">
            <div className="flex items-center gap-2 text-[12px] text-slate-700">
              <CalendarDays className="w-4 h-4" />
              <span className="font-medium">제한 날짜</span>
              <span className="text-slate-400">|</span>
              <span className={cn(due ? "text-slate-800" : "text-slate-400")}>
                {due ?? "없음"}
              </span>
            </div>
          </div>

          {/* 내용 섹션 */}
          <div className="rounded-xl border bg-white p-3">
            {item.content && item.content.trim().length > 0 ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-800">
                {item.content}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">내용이 없습니다.</p>
            )}
            {/* 링크가 있으면 하단에 칩 */}
            {item.link_url && (
              <>
                <Separator className="my-3" />
                <a
                  href={item.link_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100 transition"
                  title={item.link_url}
                >
                  <LinkIcon className="w-3.5 h-3.5 mr-1" />
                  관련 링크
                </a>
              </>
            )}
          </div>

          {/* 버튼: 수정 / 삭제 / 닫기 */}
          <DialogFooter className="sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit();
                }}
              >
                <Pencil className="w-4 h-4" />
                수정
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
              >
                <Trash2 className="w-4 h-4" />
                삭제
              </Button>
            </div>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
