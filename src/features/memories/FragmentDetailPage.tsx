// src/features/memories/FragmentDetailPage.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Crown,
  ImagePlus,
  Loader2,
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
  DialogDescription,
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
import { cn } from "@/lib/utils";
import supabase from "@/lib/supabase";

import {
  addCard,
  deleteCard,
  deleteFragment,
  getFragment,
  getSummary,
  listCards,
  updateCard,
  updateFragment,
  upsertSummary,
} from "./api";
import { publicUrl, removeMemoryImage, uploadMemoryImage } from "./storage";
import type { Fragment, MemoryCard } from "./types";

type CardTextMap = Record<string, { author: string; partner: string }>;
type ConfirmState = null | { type: "fragment" | "card"; id?: string };

function arrayMove<T>(arr: T[], from: number, to: number) {
  const clone = arr.slice();
  const [item] = clone.splice(from, 1);
  clone.splice(to, 0, item);
  return clone;
}

function toDateFromYMD(ymd: string): Date | undefined {
  if (!ymd) return undefined;
  const [year, month, day] = ymd.split("-").map((v) => Number.parseInt(v, 10));
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function toYMD(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(ymd: string) {
  const date = toDateFromYMD(ymd);
  if (!date) return "날짜 선택";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FragmentDetailPage() {
  const nav = useNavigate();
  const { id } = useParams();
  const { couple, partnerId } = useCoupleContext();
  const { user } = useUser();

  const currentUid = useMemo(
    () => user?.authId ?? user?.id ?? null,
    [user?.authId, user?.id],
  );
  const myName = user?.nickname || "나";

  const [partnerName, setPartnerName] = useState("상대방");
  const [loading, setLoading] = useState(true);
  const [frag, setFrag] = useState<Fragment | null>(null);
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [summary, setSummary] = useState("");
  const [initialTitle, setInitialTitle] = useState("");
  const [initialEventDate, setInitialEventDate] = useState("");
  const [initialSummary, setInitialSummary] = useState("");
  const [initialCardTexts, setInitialCardTexts] = useState<CardTextMap>({});
  const [initialOrderMap, setInitialOrderMap] = useState<Record<string, number>>(
    {},
  );
  const [cardTexts, setCardTexts] = useState<CardTextMap>({});
  const [dateOpen, setDateOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState<ConfirmState>(null);
  const [saving, setSaving] = useState(false);
  const [addingPhoto, setAddingPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadPartnerNickname() {
      if (!partnerId) {
        if (mounted) setPartnerName("상대방");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("nickname")
        .eq("id", partnerId)
        .maybeSingle();

      if (!mounted) return;
      setPartnerName(error || !data ? "상대방" : data.nickname || "상대방");
    }

    loadPartnerNickname();
    return () => {
      mounted = false;
    };
  }, [partnerId]);

  async function loadAll() {
    if (!id) return;
    setLoading(true);
    try {
      const [fragment, summaryRow, cardRows] = await Promise.all([
        getFragment(id),
        getSummary(id),
        listCards(id, 1000, 0),
      ]);
      const texts: CardTextMap = {};
      const orderMap: Record<string, number> = {};

      cardRows.forEach((card, index) => {
        texts[card.id] = {
          author: card.caption_author ?? "",
          partner: card.caption_partner ?? "",
        };
        orderMap[card.id] = index;
      });

      setFrag(fragment);
      setCards(cardRows);
      setTitle(fragment.title);
      setEventDate(fragment.event_date);
      setSummary(summaryRow?.content ?? "");
      setCardTexts(texts);
      setInitialTitle(fragment.title);
      setInitialEventDate(fragment.event_date);
      setInitialSummary(summaryRow?.content ?? "");
      setInitialCardTexts(texts);
      setInitialOrderMap(orderMap);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const dirty = useMemo(() => {
    if (!frag) return false;
    if (title !== initialTitle) return true;
    if (eventDate !== initialEventDate) return true;
    if (summary !== initialSummary) return true;

    for (const card of cards) {
      const current = cardTexts[card.id] ?? { author: "", partner: "" };
      const initial = initialCardTexts[card.id] ?? { author: "", partner: "" };
      if (current.author !== initial.author) return true;
      if (current.partner !== initial.partner) return true;
    }

    return cards.some((card, index) => initialOrderMap[card.id] !== index);
  }, [
    cardTexts,
    cards,
    eventDate,
    frag,
    initialCardTexts,
    initialEventDate,
    initialOrderMap,
    initialSummary,
    initialTitle,
    summary,
    title,
  ]);

  async function handleAddCard(file: File) {
    if (!couple?.id || !id) return;
    if (!currentUid) {
      toast.error("로그인 정보를 확인할 수 없어요.");
      return;
    }

    setAddingPhoto(true);
    try {
      const uploaded = await uploadMemoryImage({
        coupleId: couple.id,
        fragmentId: id,
        file,
      });
      const created = await addCard({
        fragment_id: id,
        couple_id: couple.id,
        author_id: currentUid,
        image_path: uploaded.path,
        layout: "photo-left",
        caption_author: null,
        caption_partner: null,
        order_index: cards.length,
      });

      setCards((prev) => [...prev, created]);
      setCardTexts((prev) => ({
        ...prev,
        [created.id]: { author: "", partner: "" },
      }));

      if (!frag?.cover_photo_path) {
        const updated = await updateFragment(created.fragment_id, {
          cover_photo_path: created.image_path,
        });
        setFrag(updated);
      }

      toast.success("사진을 추가했어요.");
    } catch (error) {
      console.error(error);
      toast.error("사진을 추가하지 못했어요. 다시 시도해주세요.");
    } finally {
      setAddingPhoto(false);
    }
  }

  async function handleSetCover(path: string) {
    if (!frag) return;
    try {
      const updated = await updateFragment(frag.id, { cover_photo_path: path });
      setFrag(updated);
      toast.success("대표 사진을 변경했어요.");
    } catch (error) {
      console.error(error);
      toast.error("대표 사진을 변경하지 못했어요.");
    }
  }

  function moveCard(from: number, to: number) {
    if (to < 0 || to >= cards.length || from === to) return;
    setCards((prev) =>
      arrayMove(prev, from, to).map((card, index) => ({
        ...card,
        order_index: index,
      })),
    );
  }

  async function handleSaveAll() {
    if (!frag) return;

    setSaving(true);
    try {
      const ops: Promise<unknown>[] = [];
      const fragmentPatch: Partial<Fragment> = {};

      if (title !== initialTitle) fragmentPatch.title = title.trim();
      if (eventDate !== initialEventDate) fragmentPatch.event_date = eventDate;
      if (Object.keys(fragmentPatch).length > 0) {
        ops.push(updateFragment(frag.id, fragmentPatch));
      }

      if (summary !== initialSummary) {
        ops.push(upsertSummary({ fragment_id: frag.id, content: summary }));
      }

      cards.forEach((card, index) => {
        const current = cardTexts[card.id] ?? { author: "", partner: "" };
        const initial = initialCardTexts[card.id] ?? {
          author: "",
          partner: "",
        };
        const patch: Partial<MemoryCard> = {};

        if (current.author !== initial.author) {
          patch.caption_author = current.author.trim() || null;
        }
        if (current.partner !== initial.partner) {
          patch.caption_partner = current.partner.trim() || null;
        }
        if (initialOrderMap[card.id] !== index) {
          patch.order_index = index;
        }
        if (Object.keys(patch).length > 0) ops.push(updateCard(card.id, patch));
      });

      await Promise.all(ops);
      await loadAll();
      toast.success("변경사항을 저장했어요.");
    } catch (error) {
      console.error(error);
      toast.error("저장 중 오류가 발생했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteFragment() {
    if (!id) return;
    try {
      const paths = cards.map((card) => card.image_path).filter(Boolean);
      await Promise.allSettled(paths.map((path) => removeMemoryImage(path)));
      await deleteFragment(id);
      toast.success("추억 조각을 삭제했어요.");
      setConfirmOpen(null);
      nav("/memories");
    } catch (error) {
      console.error(error);
      toast.error("삭제 중 오류가 발생했어요.");
    }
  }

  async function confirmDeleteCard(cardId: string) {
    const target = cards.find((card) => card.id === cardId);
    if (!target) {
      setConfirmOpen(null);
      return;
    }

    try {
      await removeMemoryImage(target.image_path);
      await deleteCard(cardId);
      setCards((prev) => prev.filter((card) => card.id !== cardId));
      setCardTexts((prev) => {
        const { [cardId]: _removed, ...rest } = prev;
        return rest;
      });

      if (frag?.cover_photo_path === target.image_path) {
        const nextCover =
          cards.find((card) => card.id !== cardId)?.image_path ?? null;
        const updated = await updateFragment(frag.id, {
          cover_photo_path: nextCover,
        });
        setFrag(updated);
      }

      toast.success("사진을 삭제했어요.");
      setConfirmOpen(null);
    } catch (error) {
      console.error(error);
      toast.error("삭제 중 오류가 발생했어요.");
    }
  }

  const authorName =
    String(frag?.author_id ?? "") === String(currentUid ?? "")
      ? myName
      : partnerName;

  if (loading) {
    return (
      <main className="min-h-[100dvh] bg-background">
        <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>추억 조각을 불러오는 중</CardTitle>
              <CardDescription>잠시만 기다려주세요.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
    );
  }

  if (!frag) {
    return (
      <main className="min-h-[100dvh] bg-background">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>추억 조각을 찾을 수 없습니다</CardTitle>
              <CardDescription>목록으로 돌아가 다시 확인해주세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => nav("/memories")}>목록으로</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-background pb-28 md:pb-8">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          if (file) handleAddCard(file);
          if (fileRef.current) fileRef.current.value = "";
        }}
      />

      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <Card className="shadow-sm">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-2xl">추억 조각 상세</CardTitle>
                  {dirty && <Badge variant="secondary">수정됨</Badge>}
                </div>
                <CardDescription>
                  사진, 날짜, 메모를 한 곳에서 정리하고 저장할 수 있습니다.
                </CardDescription>
              </div>

              <div className="hidden gap-2 md:flex">
                <Button variant="outline" onClick={() => nav("/memories")}>
                  <ArrowLeft className="mr-2 size-4" />
                  목록
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  disabled={addingPhoto}
                >
                  {addingPhoto ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <ImagePlus className="mr-2 size-4" />
                  )}
                  사진 추가
                </Button>
                <Button onClick={handleSaveAll} disabled={saving || !dirty}>
                  {saving ? (
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
                className="h-11"
                placeholder="제목을 입력해주세요."
              />
            </div>

            <div className="space-y-2">
              <Label>날짜</Label>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full justify-start gap-2"
                onClick={() => setDateOpen(true)}
              >
                <CalendarDays className="size-4" />
                {formatDate(eventDate)}
              </Button>
            </div>

            <div className="text-sm text-muted-foreground md:col-span-2">
              작성자 {authorName}
              {frag.created_at ? ` · 작성일 ${formatDateTime(frag.created_at)}` : ""}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl">사진</CardTitle>
                  <Badge variant="secondary">{cards.length}</Badge>
                </div>
                <CardDescription>
                  대표 사진과 순서를 정하고, 각 사진의 메모를 남길 수 있습니다.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={addingPhoto}
              >
                {addingPhoto ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <ImagePlus className="mr-2 size-4" />
                )}
                사진 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {cards.length === 0 ? (
              <EmptyPhotos onAdd={() => fileRef.current?.click()} />
            ) : (
              cards.map((card, index) => (
                <PhotoCard
                  key={card.id}
                  card={card}
                  index={index}
                  total={cards.length}
                  currentUserId={currentUid}
                  myName={myName}
                  partnerName={partnerName}
                  texts={cardTexts[card.id] ?? { author: "", partner: "" }}
                  isCover={frag.cover_photo_path === card.image_path}
                  onTextChange={(next) =>
                    setCardTexts((prev) => ({
                      ...prev,
                      [card.id]: {
                        ...(prev[card.id] ?? { author: "", partner: "" }),
                        ...next,
                      },
                    }))
                  }
                  onSetCover={() => handleSetCover(card.image_path)}
                  onDelete={() => setConfirmOpen({ type: "card", id: card.id })}
                  onMoveUp={() => moveCard(index, index - 1)}
                  onMoveDown={() => moveCard(index, index + 1)}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">메모</CardTitle>
            <CardDescription>
              사진 전체에 대한 짧은 기록을 남길 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={6}
              placeholder="그날의 분위기, 기억하고 싶은 말, 함께 남기고 싶은 내용을 적어보세요."
              className="resize-y"
            />
          </CardContent>
        </Card>

        <Card className="hidden shadow-sm md:block">
          <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
            <Button
              variant="destructive"
              onClick={() => setConfirmOpen({ type: "fragment" })}
            >
              <Trash2 className="mr-2 size-4" />
              삭제
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => nav("/memories")}>
                <ArrowLeft className="mr-2 size-4" />
                목록
              </Button>
              <Button onClick={handleSaveAll} disabled={saving || !dirty}>
                {saving ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                저장
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={addingPhoto}
          >
            {addingPhoto ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <ImagePlus className="mr-2 size-4" />
            )}
            사진 추가
          </Button>
          <Button onClick={handleSaveAll} disabled={saving || !dirty}>
            {saving ? (
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
              selected={toDateFromYMD(eventDate) ?? new Date()}
              onSelect={(date) => {
                if (!date) return;
                setEventDate(toYMD(date));
                setDateOpen(false);
              }}
              captionLayout="dropdown-buttons"
              fromYear={2000}
              toYear={2100}
              className="mx-auto"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDateOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!confirmOpen}
        onOpenChange={(open) => {
          if (!open) setConfirmOpen(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmOpen?.type === "fragment"
                ? "추억 조각을 삭제할까요?"
                : "사진을 삭제할까요?"}
            </DialogTitle>
            <DialogDescription>
              {confirmOpen?.type === "fragment"
                ? "이 추억 조각의 사진과 메모가 함께 삭제됩니다. 되돌릴 수 없습니다."
                : "선택한 사진이 삭제됩니다. 되돌릴 수 없습니다."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmOpen?.type === "fragment") {
                  confirmDeleteFragment();
                } else if (confirmOpen?.id) {
                  confirmDeleteCard(confirmOpen.id);
                }
              }}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function PhotoCard({
  card,
  index,
  total,
  currentUserId,
  myName,
  partnerName,
  texts,
  isCover,
  onTextChange,
  onSetCover,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  card: MemoryCard;
  index: number;
  total: number;
  currentUserId: string | null;
  myName: string;
  partnerName: string;
  texts: { author: string; partner: string };
  isCover: boolean;
  onTextChange: (next: Partial<{ author: string; partner: string }>) => void;
  onSetCover: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const isAuthor =
    String(currentUserId ?? "").trim() === String(card.author_id ?? "").trim();
  const authorLabel = isAuthor ? myName : partnerName;
  const partnerLabel = isAuthor ? partnerName : myName;

  return (
    <Card className="overflow-hidden shadow-sm">
      <CardContent className="grid gap-4 p-4 md:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
            <img
              src={publicUrl(card.image_path)}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
            {isCover && (
              <Badge className="absolute left-3 top-3 gap-1">
                <Crown className="size-3.5" />
                대표
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={isCover ? "secondary" : "outline"}
              onClick={onSetCover}
              disabled={isCover}
            >
              <Crown className="mr-2 size-4" />
              대표
            </Button>
            <Button type="button" variant="outline" onClick={onDelete}>
              <Trash2 className="mr-2 size-4" />
              삭제
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-end">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onMoveUp}
                disabled={index === 0}
              >
                위로
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onMoveDown}
                disabled={index === total - 1}
              >
                아래로
              </Button>
            </div>
          </div>

          <Separator />

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`author-caption-${card.id}`}>
                {authorLabel} 메모
              </Label>
              <Textarea
                id={`author-caption-${card.id}`}
                value={texts.author}
                onChange={(event) =>
                  isAuthor && onTextChange({ author: event.target.value })
                }
                disabled={!isAuthor}
                rows={5}
                placeholder={
                  isAuthor
                    ? "이 사진에 남기고 싶은 말을 적어보세요."
                    : "작성자만 수정할 수 있습니다."
                }
                className="resize-y"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`partner-caption-${card.id}`}>
                {partnerLabel} 메모
              </Label>
              <Textarea
                id={`partner-caption-${card.id}`}
                value={texts.partner}
                onChange={(event) =>
                  !isAuthor && onTextChange({ partner: event.target.value })
                }
                disabled={isAuthor}
                rows={5}
                placeholder={
                  !isAuthor
                    ? "이 사진에 대한 생각을 남겨보세요."
                    : "상대방만 수정할 수 있습니다."
                }
                className="resize-y"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyPhotos({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      className={cn(
        "rounded-md border border-dashed p-8 text-center",
        "text-muted-foreground",
      )}
    >
      <ImagePlus className="mx-auto mb-3 size-8" />
      <div className="font-medium text-foreground">사진이 없습니다</div>
      <p className="mt-1 text-sm">사진을 추가해서 추억을 채워보세요.</p>
      <Button type="button" variant="outline" className="mt-4" onClick={onAdd}>
        <ImagePlus className="mr-2 size-4" />
        사진 추가
      </Button>
    </div>
  );
}
