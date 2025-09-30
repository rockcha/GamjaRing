"use client";

import { useMemo, useRef, useState } from "react";
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

/* Font Awesome */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faImage,
  faCrown,
  faGripLines,
  faTrashCan,
  faWandMagicSparkles,
  faPlus,
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

export default function FragmentFormPage() {
  const nav = useNavigate();
  const { couple } = useCoupleContext();
  const { user } = useUser();

  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [drafts, setDrafts] = useState<PhotoDraft[]>([]);
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);

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
        isCover: prev.length === 0,
      },
    ]);
  }

  function updateDraft(id: string, patch: Partial<PhotoDraft>) {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
    );
  }

  function removeDraft(id: string) {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }

  function setCover(id: string) {
    setDrafts((prev) => prev.map((d) => ({ ...d, isCover: d.id === id })));
  }

  function onDragStartIdx(i: number) {
    dragFrom.current = i;
    isDragging.current = true;
  }
  function onDragOverIdx(i: number) {
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
      }

      if (coverPath)
        await updateFragment(frag.id, { cover_photo_path: coverPath });

      if (summary.trim()) {
        await upsertSummary({ fragment_id: frag.id, content: summary.trim() });
      }

      toast.success("추억 조각이 생성되었어요!");
      nav(`/memories/${frag.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-8">
      {/* Sticky 툴바: 사진 카드 추가 / 취소 / 만들기 */}
      <div className="sticky top-0 z-30 -mx-6 px-6 py-3 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            onClick={addDraft}
            className="gap-2"
            aria-label="사진 카드 추가"
          >
            <FontAwesomeIcon icon={faPlus} />
            사진 카드 추가
          </Button>
          <Button
            variant="outline"
            onClick={() => history.back()}
            className="gap-2"
          >
            취소
          </Button>
          <Button
            disabled={busy || !canSubmit}
            onClick={handleCreate}
            className="gap-2 bg-gradient-to-r from-pink-400 to-purple-400 text-white hover:from-pink-500 hover:to-purple-500"
          >
            <FontAwesomeIcon icon={faWandMagicSparkles} />
            만들기
          </Button>
        </div>
      </div>

      {/* 기본 정보 카드 */}
      <Card className="p-6 space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="memory-title">제목</Label>
            <div className="relative">
              <Input
                id="memory-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="pl-3 text-base md:text-xl font-semibold"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="memory-date">날짜</Label>
            <div className="relative">
              <Input
                id="memory-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="pl-3"
              />
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          소중한 순간을 저장해요. 대표 사진은 카드에서{" "}
          <span className="inline-flex items-center gap-1">
            <FontAwesomeIcon className="text-pink-400" icon={faCrown} /> 리본
          </span>
          으로 표시돼요.
        </p>
      </Card>

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
                  ? "ring-2 ring-pink-300"
                  : "hover:ring-1 hover:ring-muted-foreground/20",
              ].join(" ")}
            >
              <div className="flex flex-col xl:flex-row gap-6">
                {/* 좌측: 이미지 영역 */}
                <div className="relative group/preview">
                  {/* 드래그 핸들 */}
                  <div className="absolute -left-3 top-3 hidden xl:flex items-center justify-center">
                    <div className="rounded-full bg-muted text-muted-foreground/80 px-2 py-1 shadow-sm cursor-grab">
                      <FontAwesomeIcon icon={faGripLines} />
                    </div>
                  </div>

                  {/* 대표 리본 */}
                  {d.isCover && (
                    <div className="absolute left-3 top-3 z-10 px-3 py-1 rounded-full text-xs font-medium text-white/95 backdrop-blur-sm bg-pink-500/70 ring-1 ring-white/30 shadow-sm">
                      <FontAwesomeIcon className="mr-1" icon={faCrown} />
                      대표 사진
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
                      {/* 하단 그라데이션 + 오버레이 툴바 */}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 rounded-b-xl bg-gradient-to-t from-black/55 to-transparent" />
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
                      const url = file ? URL.createObjectURL(file) : null;
                      updateDraft(d.id, { file, previewUrl: url });
                    }}
                  />
                </div>

                {/* 우측: 캡션/컨트롤 */}
                <div className="flex-1 grid gap-4 min-w-[360px]">
                  <div className="grid gap-1">
                    <Label className="text-[13px] text-muted-foreground">
                      ✏️ 이 사진에 대한 짧은 메모를 남겨보세요
                    </Label>
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
          <div className="grid place-items-center w-7 h-7 rounded-full bg-muted">
            <FontAwesomeIcon
              className="opacity-80"
              icon={faWandMagicSparkles}
            />
          </div>
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
    </div>
  );
}
