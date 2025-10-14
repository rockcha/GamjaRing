// src/features/bucketlist/components/BucketFormDialog.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link as LinkIcon, CalendarDays } from "lucide-react";
import type { BucketItem, BucketCategory } from "./types";
import { CATEGORY_META, CATEGORY_ORDER, toneClasses } from "./types";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmit: (payload: {
    title: string;
    content?: string | null;
    link_url?: string | null;
    category?: BucketCategory | null;
    due_date?: string | null; // "YYYY-MM-DD"
  }) => Promise<void>;
  initial?: Partial<BucketItem>; // 수정 모드용
};

export default function BucketFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initial,
}: Props) {
  // ✅ 기본 카테고리를 '일상'으로 고정 (선택 안 함 옵션 제거)
  const [category, setCategory] = useState<BucketCategory>("일상");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<string>("");
  const [link, setLink] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setCategory((initial?.category as BucketCategory) ?? "일상");
    setTitle(initial?.title ?? "");
    setContent(initial?.content ?? "");
    setLink(initial?.link_url ?? "");
    setDueDate(initial?.due_date ?? "");
  }, [open, initial]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await onSubmit({
      title: title.trim(),
      content: content.trim() || null,
      link_url: link.trim() || null,
      category, // 항상 존재(‘일상’ 기본)
      due_date: dueDate || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-[min(96vw,720px)]">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "버킷 수정" : "버킷 추가"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* ✅ 1) 유형 먼저 */}
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-2">
              {CATEGORY_ORDER.map((c) => {
                const meta = CATEGORY_META[c];
                const tone = toneClasses(meta.tone);
                const active = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition",
                      active
                        ? `${tone.softBg} ${tone.ring} ring-2`
                        : "bg-white hover:bg-slate-50",
                      tone.card.split(" ").find((k) => k.startsWith("border-"))
                    )}
                    aria-pressed={active}
                  >
                    <span className="text-base">{meta.emoji}</span>
                    {c}
                  </button>
                );
              })}
            </div>
            {/* 카테별 설명 */}
            <p className="mt-1 text-xs text-muted-foreground">
              {CATEGORY_META[category].desc}
            </p>
          </div>

          {/* ✅ 2) 제목 */}
          <div className="grid gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력해주세요"
            />
          </div>

          {/* 3) 내용 */}
          <div className="grid gap-2">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="간단한 메모를 적어주세요"
              rows={4}
            />
          </div>

          {/* 4) 날짜/링크 */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label className="inline-flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                제한 날짜
              </Label>
              <Input
                type="date"
                value={dueDate || ""}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label className="inline-flex items-center gap-2">
                <LinkIcon className="w-4 h-4" />
                관련 링크
              </Label>
              <Input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https:// ..."
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit}>
            {initial?.id ? "수정" : "추가"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
