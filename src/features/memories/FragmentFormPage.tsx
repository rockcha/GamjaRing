// src/features/memories/FragmentFormPage.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { createFragment, addCard, upsertSummary, updateFragment } from "./api";
import { uploadMemoryImage } from "./storage";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";

/* shadcn/ui */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";

/* Font Awesome */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faImage,
  faCrown,
  faGripLines,
  faTrashCan,
  faWandMagicSparkles,
  faPlus,
  faCalendarDays,
} from "@fortawesome/free-solid-svg-icons";

type PhotoDraft = {
  id: string;
  file: File | null;
  previewUrl: string | null;
  caption_author: string;
  isCover: boolean;
};

function arrayMove<T>(arr: T[], from: number, to: number) {
  const clone = arr.slice();
  const [item] = clone.splice(from, 1);
  clone.splice(to, 0, item);
  return clone;
}

function DraggableDraft({
  children,
  index,
  onDragStartIdx,
  onDragOverIdx,
  onDropToIdx,
}: {
  children: React.ReactNode;
  index: number;
  onDragStartIdx: (i: number) => void;
  onDragOverIdx: (i: number) => void;
  onDropToIdx: (i: number) => void;
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStartIdx(index)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverIdx(index);
      }}
      onDrop={() => onDropToIdx(index)}
      className="group transition-all duration-150"
    >
      {children}
    </div>
  );
}

/* ----- date helpers ----- */
function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function formatKoreanDateStr(ymd: string) {
  const d = new Date(ymd);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ko-KR", {
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
  const [eventDate, setEventDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  // ✅ 기본 카드 1장 미리 생성(대표 지정)
  const [drafts, setDrafts] = useState<PhotoDraft[]>(() => [
    {
      id: crypto.randomUUID(),
      file: null,
      previewUrl: null,
      caption_author: "",
      isCover: true,
    },
  ]);

  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);

  // date dialog
  const [dateOpen, setDateOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date | undefined>(new Date());

  // DnD
  const dragFrom = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);
  const isDragging = useRef(false);

  const canSubmit = useMemo(() => !!title.trim(), [title]);

  // ✅ 통일된 사용자 식별자
  const currentUid = useMemo(
    () => user?.authId ?? user?.id ?? null,
    [user?.authId, user?.id]
  );

  function addDraft() {
    setDrafts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        file: null,
        previewUrl: null,
        caption_author: "",
        isCover: prev.length === 0, // 첫 장이면 대표
      },
    ]);
  }

  function updateDraft(id: string, patch: Partial<PhotoDraft>) {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
    );
  }

  // ✅ 파일/프리뷰 설정(기존 URL 정리 포함)
  function setDraftFile(id: string, file: File | null) {
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        if (d.previewUrl) {
          try {
            URL.revokeObjectURL(d.previewUrl);
          } catch {}
        }
        const url = file ? URL.createObjectURL(file) : null;
        return { ...d, file, previewUrl: url };
      })
    );
  }

  // ✅ 프리뷰 URL 전체 정리 (언마운트)
  useEffect(() => {
    return () => {
      drafts.forEach((d) => {
        if (d.previewUrl) {
          try {
            URL.revokeObjectURL(d.previewUrl);
          } catch {}
        }
      });
    };
  }, [drafts]);

  // ✅ 대표 삭제 시 자동 승계
  function removeDraft(id: string) {
    setDrafts((prev) => {
      const removed = prev.find((d) => d.id === id);
      const next = prev.filter((d) => d.id !== id);
      if (removed?.previewUrl) {
        try {
          URL.revokeObjectURL(removed.previewUrl);
        } catch {}
      }
      if (removed?.isCover && next.length) {
        next[0] = { ...next[0], isCover: true };
      }
      return next;
    });
  }

  function setCover(id: string) {
    setDrafts((prev) => prev.map((d) => ({ ...d, isCover: d.id === id })));
  }

  function onDragStartIdx(i: number) {
    dragFrom.current = i;
    isDragging.current = true;
  }
  function onDragOverIdx(i: number) {
    // 입력 포커스 중엔 드래그 무시(오작동 방지)
    const el = document.activeElement;
    if (el && /INPUT|TEXTAREA/.test(el.tagName)) return;
    dragOver.current = i;
  }
  function onDropToIdx(i: number) {
    if (!isDragging.current) return;
    const from = dragFrom.current;
    const to = i;
    dragFrom.current = dragOver.current = null;
    isDragging.current = false;
    if (from == null || to == null || from === to) return;
    setDrafts((prev) => arrayMove(prev, from, to));
  }

  async function handleCreate() {
    if (!couple?.id || !canSubmit) return;
    if (!currentUid) {
      toast.error("로그인 정보가 확인되지 않아요. 다시 로그인해 주세요.");
      return;
    }
    setBusy(true);
    try {
      // 1) fragment 생성
      const frag = await createFragment({
        couple_id: couple.id,
        author_id: currentUid,
        title,
        event_date: eventDate,
      });

      // 2) 업로드 + 카드 생성
      let coverPath: string | null = null;
      let order = 0;
      for (const d of drafts) {
        if (!d.file) continue;
        try {
          const up = await uploadMemoryImage({
            coupleId: couple.id,
            fragmentId: frag.id,
            file: d.file,
          });
          await addCard({
            fragment_id: frag.id,
            couple_id: couple.id,
            author_id: currentUid,
            image_path: up.path,
            layout: "photo-left",
            caption_author: d.caption_author || null,
            caption_partner: null,
            order_index: order++,
          });
          if (d.isCover) coverPath = up.path;
        } catch (err) {
          console.error(err);
          toast.error("일부 사진 업로드에 실패했어요. 다시 시도해 주세요.");
        }
      }

      if (coverPath)
        await updateFragment(frag.id, { cover_photo_path: coverPath });

      if (summary.trim()) {
        await upsertSummary({ fragment_id: frag.id, content: summary.trim() });
      }

      // ✅ 알림 전송: 추억조각 등록 (상대가 존재할 때만)
      if (partnerId) {
        try {
          await sendUserNotification({
            senderId: currentUid,
            receiverId: partnerId,
            type: "추억조각 등록",
          });
        } catch (e) {
          console.warn("알림 전송 실패(무시 가능):", e);
        }
      }

      toast.success("추억 조각이 생성되었어요!");
      nav(`/memories/${frag.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-8">
      {/* Sticky 툴바: 1) 제목 + 날짜 / 2) 액션(ghost 통일) */}
      <div className="sticky top-40 z-30 -mx-6 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 bg-background/80 border-b">
        <div className="flex flex-col gap-2">
          {/* 1줄: 제목 + 날짜 버튼 */}
          <div className="flex items-center justify-between gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목"
              className="bg-transparent outline-none text-2xl md:text-4xl font-extrabold tracking-tight min-w-0 w-full truncate"
              aria-label="제목"
            />

            <Button
              variant="default"
              onClick={addDraft}
              className="gap-2"
              aria-label="사진 카드 추가"
            >
              <FontAwesomeIcon icon={faPlus} />
              <span className="hidden sm:inline">사진 카드 추가</span>
            </Button>
          </div>

          {/* 2줄: 액션 버튼들(ghost 통일) */}
          <div className="flex items-center justify-between ">
            <Button
              variant="outline"
              onClick={() => {
                setTempDate(new Date(eventDate));
                setDateOpen(true);
              }}
              className="gap-2"
              title="날짜 선택"
            >
              <FontAwesomeIcon icon={faCalendarDays} />
              <span className="hidden md:inline">
                {formatKoreanDateStr(eventDate)}
              </span>
            </Button>
            <div className="flex gap-1">
              {" "}
              <Button
                variant="outline"
                onClick={() => history.back()}
                className="gap-2"
              >
                취소
              </Button>
              <Button
                variant="outline"
                disabled={busy || !canSubmit}
                onClick={handleCreate}
                className="gap-2"
              >
                {busy ? "저장 중…" : "저장하기"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 날짜 선택 Dialog */}
      <Dialog open={dateOpen} onOpenChange={setDateOpen}>
        <DialogContent className="sm:max-w-md">
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
              className="w-full"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
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
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 사진 카드들 (드래그 정렬 + 시각 피드백) */}
      <div className="grid gap-4">
        {drafts.map((d, idx) => (
          <DraggableDraft
            key={d.id}
            index={idx}
            onDragStartIdx={onDragStartIdx}
            onDragOverIdx={onDragOverIdx}
            onDropToIdx={onDropToIdx}
          >
            <Card
              className={[
                "p-6 space-y-4 transition-all",
                "focus-within:ring-2 focus-within:ring-purple-300",
                isDragging.current ? "opacity-90" : "",
                d.isCover
                  ? "ring-2 ring-amber-300"
                  : "hover:ring-1 hover:ring-muted-foreground/20",
              ].join(" ")}
            >
              <div className="flex flex-col xl:flex-row gap-6">
                {/* 좌측: 이미지 영역 */}
                <div className="relative group/preview">
                  {/* 대표 배지 */}
                  {d.isCover && (
                    <div
                      className="absolute left-3 top-3 flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white/92 shadow-sm ring-1 ring-white/70 backdrop-blur-sm"
                      title="대표 사진"
                      aria-label="대표 사진"
                    >
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 ring-1 ring-amber-200 shadow-sm">
                        <FontAwesomeIcon
                          icon={faCrown}
                          className="text-amber-500"
                        />
                      </span>
                      <span className="text-xs font-medium text-amber-700">
                        대표
                      </span>
                    </div>
                  )}

                  {/* 프리뷰 / 플레이스홀더 */}
                  {d.previewUrl ? (
                    <div className="relative">
                      <img
                        src={d.previewUrl}
                        alt={`preview-${idx + 1}`}
                        className={[
                          "w-full max-w-[520px] h-[340px] object-cover rounded-xl",
                          "transition-transform duration-150 group-hover/preview:scale-[1.01]",
                        ].join(" ")}
                      />
                      {/* 하단 그라데이션 */}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 rounded-b-xl bg-gradient-to-t from-black/55 to-transparent" />
                      {/* 오버레이 툴바 */}
                      <div className="absolute inset-0 hidden items-end justify-between p-3 group-hover/preview:flex">
                        <div className="backdrop-blur-sm bg-black/25 rounded-lg px-2 py-1 text-xs text-white">
                          <span className="opacity-90">미리보기</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={d.isCover ? "default" : "secondary"}
                            className="gap-2 backdrop-blur bg-white/90"
                            onClick={() => setCover(d.id)}
                          >
                            <FontAwesomeIcon icon={faCrown} />
                            대표
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="gap-2 backdrop-blur bg-white/90"
                            onClick={() => removeDraft(d.id)}
                          >
                            <FontAwesomeIcon icon={faTrashCan} />
                            삭제
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full max-w-[520px] h-[340px] rounded-xl bg-muted grid place-items-center text-sm text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <FontAwesomeIcon
                          className="text-2xl opacity-70"
                          icon={faImage}
                        />
                        <span className="opacity-80">아직 사진이 없어요</span>
                      </div>
                    </div>
                  )}

                  {/* 파일 선택 */}
                  <Input
                    type="file"
                    accept="image/*"
                    className="mt-3 cursor-pointer file:cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setDraftFile(d.id, file);
                    }}
                  />
                </div>

                {/* 우측: 캡션/컨트롤 */}
                <div className="flex-1 grid gap-4 min-w-[360px]">
                  <div className="grid gap-1">
                    <Textarea
                      placeholder="예) 벚꽃잎이 눈처럼 흩날리던 날, 네가 웃던 순간"
                      value={d.caption_author}
                      onChange={(e) =>
                        updateDraft(d.id, { caption_author: e.target.value })
                      }
                      rows={4}
                      className="resize-y"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={d.isCover ? "default" : "secondary"}
                      size="sm"
                      className="gap-2"
                      onClick={() => setCover(d.id)}
                    >
                      <FontAwesomeIcon icon={faCrown} />
                      대표 사진으로 지정
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-destructive hover:text-destructive"
                      onClick={() => removeDraft(d.id)}
                    >
                      <FontAwesomeIcon icon={faTrashCan} />
                      삭제
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </DraggableDraft>
        ))}

        {drafts.length === 0 && (
          <Card className="p-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <div className="grid place-items-center w-9 h-9 rounded-full bg-muted">
                <FontAwesomeIcon className="opacity-80" icon={faImage} />
              </div>
              <div>
                사진 카드가 없습니다. 상단의 <b>사진 카드 추가</b> 버튼으로
                시작하세요.
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* 마지막 요약 */}
      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-2 font-medium">
          추억에 대한 메모를 작성해주세요.
        </div>
        <Textarea
          placeholder="그날의 감정을 따뜻하게 남겨보세요."
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={5}
          className="resize-y bg-muted/40"
        />
      </Card>

      {/* 안내 문구 */}
      <p className="text-xs text-muted-foreground">
        사진 카드 순서는 드래그에서 변경할 수 있어요.
      </p>
    </div>
  );
}
