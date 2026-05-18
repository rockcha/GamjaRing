// src/features/memories/FragmentFormPage.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Crown,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { useUser } from "@/contexts/UserContext";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import { cn } from "@/lib/utils";

import { addCard, createFragment, updateFragment, upsertSummary } from "./api";
import { uploadMemoryImage } from "./storage";

type PhotoDraft = {
  id: string;
  file: File | null;
  previewUrl: string | null;
  caption_author: string;
  isCover: boolean;
};

function createDraft(isCover = false): PhotoDraft {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    file: null,
    previewUrl: null,
    caption_author: "",
    isCover,
  };
}

function arrayMove<T>(arr: T[], from: number, to: number) {
  const clone = arr.slice();
  const [item] = clone.splice(from, 1);
  clone.splice(to, 0, item);
  return clone;
}

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(ymd: string) {
  const date = new Date(ymd);
  if (Number.isNaN(date.getTime())) return "날짜 선택";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function FragmentFormPage() {
  const nav = useNavigate();
  const { couple, partnerId } = useCoupleContext();
  const { user } = useUser();

  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState(toYMD(new Date()));
  const [drafts, setDrafts] = useState<PhotoDraft[]>(() => [createDraft(true)]);
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date | undefined>(new Date());

  const draftsRef = useRef(drafts);
  const currentUid = useMemo(
    () => user?.authId ?? user?.id ?? null,
    [user?.authId, user?.id],
  );
  const canSubmit = title.trim().length > 0 && !busy;
  const photoCount = drafts.filter((draft) => draft.file).length;

  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  useEffect(() => {
    return () => {
      draftsRef.current.forEach((draft) => {
        if (draft.previewUrl) URL.revokeObjectURL(draft.previewUrl);
      });
    };
  }, []);

  function addDraft() {
    setDrafts((prev) => [...prev, createDraft(prev.length === 0)]);
  }

  function updateDraft(id: string, patch: Partial<PhotoDraft>) {
    setDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)),
    );
  }

  function setDraftFile(id: string, file: File | null) {
    setDrafts((prev) =>
      prev.map((draft) => {
        if (draft.id !== id) return draft;
        if (draft.previewUrl) URL.revokeObjectURL(draft.previewUrl);
        return {
          ...draft,
          file,
          previewUrl: file ? URL.createObjectURL(file) : null,
        };
      }),
    );
  }

  function removeDraft(id: string) {
    setDrafts((prev) => {
      const removed = prev.find((draft) => draft.id === id);
      const next = prev.filter((draft) => draft.id !== id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      if (removed?.isCover && next.length > 0) {
        next[0] = { ...next[0], isCover: true };
      }
      return next;
    });
  }

  function setCover(id: string) {
    setDrafts((prev) =>
      prev.map((draft) => ({ ...draft, isCover: draft.id === id })),
    );
  }

  function moveDraft(from: number, to: number) {
    if (to < 0 || to >= drafts.length || from === to) return;
    setDrafts((prev) => arrayMove(prev, from, to));
  }

  async function handleCreate() {
    if (!couple?.id || !canSubmit) return;
    if (!currentUid) {
      toast.error("로그인 정보를 확인할 수 없어요. 다시 로그인해주세요.");
      return;
    }

    setBusy(true);
    try {
      const fragment = await createFragment({
        couple_id: couple.id,
        author_id: currentUid,
        title: title.trim(),
        event_date: eventDate,
      });

      let coverPath: string | null = null;
      let firstUploadedPath: string | null = null;
      let order = 0;

      for (const draft of drafts) {
        if (!draft.file) continue;

        const uploaded = await uploadMemoryImage({
          coupleId: couple.id,
          fragmentId: fragment.id,
          file: draft.file,
        });

        firstUploadedPath ??= uploaded.path;
        if (draft.isCover) coverPath = uploaded.path;

        await addCard({
          fragment_id: fragment.id,
          couple_id: couple.id,
          author_id: currentUid,
          image_path: uploaded.path,
          layout: "photo-left",
          caption_author: draft.caption_author.trim() || null,
          caption_partner: null,
          order_index: order++,
        });
      }

      const finalCoverPath = coverPath ?? firstUploadedPath;
      if (finalCoverPath) {
        await updateFragment(fragment.id, { cover_photo_path: finalCoverPath });
      }

      if (summary.trim()) {
        await upsertSummary({
          fragment_id: fragment.id,
          content: summary.trim(),
        });
      }

      if (partnerId) {
        try {
          await sendUserNotification({
            senderId: currentUid,
            receiverId: partnerId,
            type: "추억조각 등록",
          });
        } catch (error) {
          console.warn("memory notification failed:", error);
        }
      }

      toast.success("추억 조각을 만들었어요.");
      nav(`/memories/${fragment.id}`);
    } catch (error) {
      console.error(error);
      toast.error("추억 조각을 저장하지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-background pb-28 md:pb-8">
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <Card className="shadow-sm">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-2xl">추억 조각 추가</CardTitle>
                <CardDescription>
                  제목, 날짜, 사진을 차례대로 채워 새 추억을 남겨보세요.
                </CardDescription>
              </div>

              <div className="hidden gap-2 md:flex">
                <Button variant="outline" onClick={() => nav("/memories")}>
                  <ArrowLeft className="mr-2 size-4" />
                  목록
                </Button>
                <Button onClick={handleCreate} disabled={!canSubmit}>
                  {busy ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 size-4" />
                  )}
                  저장
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-2">
              <Label htmlFor="memory-title">제목</Label>
              <Input
                id="memory-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="어떤 추억이었나요?"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label>날짜</Label>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full justify-start gap-2"
                onClick={() => {
                  setTempDate(new Date(eventDate));
                  setDateOpen(true);
                }}
              >
                <CalendarDays className="size-4" />
                {formatDate(eventDate)}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl">사진</CardTitle>
                  <Badge variant="secondary">{photoCount}</Badge>
                </div>
                <CardDescription>
                  대표 사진은 목록에서 먼저 보이는 사진입니다.
                </CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={addDraft}>
                <Plus className="mr-2 size-4" />
                사진 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {drafts.length === 0 ? (
              <EmptyPhotos onAdd={addDraft} />
            ) : (
              drafts.map((draft, index) => (
                <PhotoDraftCard
                  key={draft.id}
                  draft={draft}
                  index={index}
                  total={drafts.length}
                  onFileChange={(file) => setDraftFile(draft.id, file)}
                  onCaptionChange={(value) =>
                    updateDraft(draft.id, { caption_author: value })
                  }
                  onSetCover={() => setCover(draft.id)}
                  onRemove={() => removeDraft(draft.id)}
                  onMoveUp={() => moveDraft(index, index - 1)}
                  onMoveDown={() => moveDraft(index, index + 1)}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">메모</CardTitle>
            <CardDescription>
              사진 전체를 설명하는 짧은 기록을 남길 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={5}
              placeholder="그날의 분위기, 같이 나눈 말, 기억하고 싶은 장면을 적어보세요."
              className="resize-y"
            />
          </CardContent>
        </Card>

        <Card className="hidden shadow-sm md:block">
          <CardContent className="flex items-center justify-end gap-2 p-4">
            <Button variant="outline" onClick={() => nav("/memories")}>
              <ArrowLeft className="mr-2 size-4" />
              목록
            </Button>
            <Button onClick={handleCreate} disabled={!canSubmit}>
              {busy ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              저장
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={addDraft}>
            <ImagePlus className="mr-2 size-4" />
            사진 추가
          </Button>
          <Button onClick={handleCreate} disabled={!canSubmit}>
            {busy ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            저장
          </Button>
        </div>
      </div>

      <Dialog open={dateOpen} onOpenChange={setDateOpen}>
        <DialogContent className="max-w-[min(92vw,520px)]">
          <DialogHeader>
            <DialogTitle>날짜 선택</DialogTitle>
          </DialogHeader>
          <div className="rounded-md border p-2">
            <Calendar
              mode="single"
              selected={tempDate}
              onSelect={setTempDate}
              captionLayout="dropdown-buttons"
              fromYear={2000}
              toYear={2100}
              className="mx-auto"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDateOpen(false)}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setTempDate(new Date())}
            >
              오늘
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (tempDate) setEventDate(toYMD(tempDate));
                setDateOpen(false);
              }}
            >
              적용
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function PhotoDraftCard({
  draft,
  index,
  total,
  onFileChange,
  onCaptionChange,
  onSetCover,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  draft: PhotoDraft;
  index: number;
  total: number;
  onFileChange: (file: File | null) => void;
  onCaptionChange: (value: string) => void;
  onSetCover: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden shadow-sm",
        draft.isCover && "ring-2 ring-primary/30",
      )}
    >
      <div className="grid gap-0 md:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-3 p-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
            {draft.previewUrl ? (
              <img
                src={draft.previewUrl}
                alt={`preview-${index + 1}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <ImagePlus className="size-7" />
                사진을 선택해주세요
              </div>
            )}
            {draft.isCover && (
              <Badge className="absolute left-3 top-3 gap-1">
                <Crown className="size-3" />
                대표
              </Badge>
            )}
          </div>

          <Input
            type="file"
            accept="image/*"
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
            className="cursor-pointer file:cursor-pointer"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4 p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium">사진 {index + 1}</div>
              <div className="text-sm text-muted-foreground">
                {draft.file?.name ?? "파일 미선택"}
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={onMoveUp}
                disabled={index === 0}
                aria-label="위로 이동"
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={onMoveDown}
                disabled={index === total - 1}
                aria-label="아래로 이동"
              >
                <ChevronDown className="size-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`caption-${draft.id}`}>사진 메모</Label>
            <Textarea
              id={`caption-${draft.id}`}
              value={draft.caption_author}
              onChange={(event) => onCaptionChange(event.target.value)}
              rows={4}
              placeholder="이 사진에 남기고 싶은 말을 적어보세요."
              className="resize-y"
            />
          </div>

          <Separator />

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant={draft.isCover ? "default" : "outline"}
              onClick={onSetCover}
              className="gap-2"
            >
              <Crown className="size-4" />
              대표 사진
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onRemove}
              className="gap-2"
            >
              <Trash2 className="size-4" />
              삭제
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function EmptyPhotos({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-md border border-dashed p-8 text-center">
      <ImagePlus className="mx-auto mb-3 size-8 text-muted-foreground" />
      <div className="font-medium">사진이 없습니다</div>
      <p className="mt-1 text-sm text-muted-foreground">
        사진을 추가하면 목록에서 깔끔한 카드로 보입니다.
      </p>
      <Button type="button" variant="outline" className="mt-4" onClick={onAdd}>
        <Plus className="mr-2 size-4" />
        사진 추가
      </Button>
    </div>
  );
}
