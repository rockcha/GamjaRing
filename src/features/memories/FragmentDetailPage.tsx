// src/features/memories/FragmentDetailPage.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

import { useNavigate, useParams } from "react-router-dom";
import {
  getFragment,
  listCards,
  addCard,
  updateCard,
  getSummary,
  upsertSummary,
  heartPlus,
  updateFragment,
  deleteFragment,
  deleteCard,
} from "./api";
import type { Fragment, MemoryCard } from "./types";
import { uploadMemoryImage, publicUrl, removeMemoryImage } from "./storage";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { useUser } from "@/contexts/UserContext";
import supabase from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";

/* Icons */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCamera,
  faTrash,
  faCrown,
  faFloppyDisk,
  faSpinner,
  faBackward,
  faBackwardStep,
} from "@fortawesome/free-solid-svg-icons";
import {
  MoreVertical,
  CalendarDays,
  List as ListIcon,
  Trash2,
  SkipBack,
  StepBack,
  SendToBack,
} from "lucide-react";

/* ============== 유틸 ============== */
function arrayMove<T>(arr: T[], from: number, to: number) {
  const clone = arr.slice();
  const [item] = clone.splice(from, 1);
  clone.splice(to, 0, item);
  return clone;
}

function toDateFromYMD(ymd: string): Date | null {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map((v) => parseInt(v, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* ============== DnD 래퍼 ============== */
function DraggableRow({
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
  const [dragging, setDragging] = useState(false);
  return (
    <div
      draggable
      onDragStart={() => {
        onDragStartIdx(index);
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverIdx(index);
      }}
      onDrop={() => onDropToIdx(index)}
      className={`group transition-transform ${
        dragging ? "scale-[.99] opacity-90" : "scale-100"
      }`}
    >
      {children}
    </div>
  );
}

/* ============== 우측 툴바 컴포넌트 ============== */
function ToolbarRight({
  dateText,
  onOpenDate,
  onSave,
  saving,
  onPickFile,
  onGoList,
  onDeleteFragment,
}: {
  dateText: string;
  onOpenDate: () => void;
  onSave: () => void;
  saving: boolean;
  onPickFile: () => void;
  onGoList: () => void;
  onDeleteFragment: () => void;
}) {
  return (
    <TooltipProvider delayDuration={80}>
      <div className="flex items-center gap-2">
        {/* 날짜: secondary, md미만 아이콘-only */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onOpenDate}
              className="inline-flex items-center gap-2 h-10 px-3 rounded-md bg-secondary text-secondary-foreground hover:opacity-90 transition-colors group max-md:px-2"
              aria-label="날짜 선택"
              title={dateText}
            >
              <CalendarDays className="size-4 shrink-0" />
              <span className="hidden md:inline">{dateText}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>날짜 선택</TooltipContent>
        </Tooltip>

        {/* 구분선으로 Primary와 보조를 나눔 */}
        <Separator orientation="vertical" className="h-6" />

        {/* Primary: 저장하기 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-2 h-10 px-3 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-colors"
              aria-label="저장하기"
            >
              {saving ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="size-4" spin />
                  <span className="hidden sm:inline">저장중…</span>
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faFloppyDisk} className="size-4" />
                  <span className="hidden sm:inline">저장하기</span>
                </>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>변경 사항 저장</TooltipContent>
        </Tooltip>

        {/* 기타/위험 작업: kebab */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted"
              aria-label="더보기"
            >
              <MoreVertical className="size-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {/* ✅ 사진 추가: 삭제 위쪽에 배치 */}
            <DropdownMenuItem onClick={onGoList}>
              <FontAwesomeIcon icon={faBackwardStep} className="mr-2" />
              뒤로가기
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onPickFile}>
              <FontAwesomeIcon icon={faCamera} className="mr-2" />
              사진 추가
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDeleteFragment}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 size-4" />
              삭제하기
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}

/* ============== 사진 카드 ============== */
function PhotoRow({
  card,
  currentUserId,
  myName,
  partnerName,
  authorValue,
  partnerValue,
  onChangeAuthor,
  onChangePartner,
  onSetCover,
  isCover,
  onAskDelete,
}: {
  card: MemoryCard;
  currentUserId?: string | null;
  myName: string;
  partnerName: string;
  authorValue: string;
  partnerValue: string;
  onChangeAuthor: (v: string) => void;
  onChangePartner: (v: string) => void;
  onSetCover: () => void;
  isCover: boolean;
  onAskDelete: () => void;
}) {
  const myId = String(currentUserId ?? "").trim();
  const authorId = String(card.author_id ?? "").trim();
  const isAuthor = myId !== "" && authorId !== "" && myId === authorId;

  const authorLabel = isAuthor ? myName : partnerName;
  const partnerLabel = isAuthor ? partnerName : myName;

  const canEditAuthor = isAuthor;
  const canEditPartner = !isAuthor;

  return (
    <Card className="p-6">
      <div className="flex flex-col xl:flex-row gap-6">
        {/* 이미지 영역 (오버레이 버튼 유지/효과만) */}
        <div className="relative">
          <img
            src={publicUrl(card.image_path)}
            alt="memory"
            className="w-full max-w-[520px] h-[340px] object-cover rounded-xl"
            loading="lazy"
          />
          {isCover && (
            <div
              className="absolute left-3 top-3 flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white/92 shadow-sm ring-1  bg-white ring-white/70 backdrop-blur-sm"
              title="대표 사진"
              aria-label="대표 사진"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 ring-1 ring-amber-200 shadow-sm">
                <FontAwesomeIcon icon={faCrown} className="text-amber-500" />
              </span>
              <span className="text-xs font-medium text-amber-700">대표</span>
            </div>
          )}
        </div>

        {/* 우측: 캡션 + 액션 */}
        <div className="flex-1 grid gap-5 min-w-[360px]">
          {/* 작성자 캡션 */}
          <div className="grid gap-1">
            <Label className="text-xs font-medium text-slate-500">
              {authorLabel}의 캡션
            </Label>
            <Textarea
              value={authorValue}
              onChange={(e) => canEditAuthor && onChangeAuthor(e.target.value)}
              disabled={!canEditAuthor}
              placeholder={
                canEditAuthor
                  ? "이 사진에 대한 설명을 적어주세요."
                  : "작성자만 수정할 수 있어요."
              }
              rows={4}
              className="resize-y leading-6"
            />
          </div>

          {/* 비작성자 캡션 */}
          <div className="grid gap-1">
            <Label className="text-xs font-medium text-slate-500">
              {partnerLabel}의 캡션
            </Label>
            <Textarea
              value={partnerValue}
              onChange={(e) =>
                canEditPartner && onChangePartner(e.target.value)
              }
              disabled={!canEditPartner}
              placeholder={
                canEditPartner
                  ? "사진에 대한 내 생각을 남겨보세요."
                  : "상대가 작성할 수 있어요."
              }
              rows={4}
              className="resize-y leading-6"
            />
          </div>

          {/* 액션: 대표 지정 / 카드 삭제 */}
          <div className="flex items-center justify-between">
            <Button
              variant={isCover ? "default" : "secondary"}
              size="sm"
              onClick={onSetCover}
              className="gap-2"
              title="대표 사진으로 지정"
              aria-label="대표 사진으로 지정"
            >
              <FontAwesomeIcon icon={faCrown} />
              {isCover ? "대표 사진" : "대표로 지정"}
            </Button>

            <Button variant="ghost" size="sm" onClick={onAskDelete}>
              <FontAwesomeIcon icon={faTrash} className="mr-2" />
              사진 카드 삭제
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ============== 페이지 ============== */
export default function FragmentDetailPage() {
  const nav = useNavigate();
  const { id } = useParams();

  const { couple, partnerId } = useCoupleContext();
  const { user } = useUser();

  const currentUid = useMemo(
    () => (user?.id ?? user?.authId) || null,
    [user?.id, user?.authId]
  );

  const myName = useMemo(() => user?.nickname ?? "나", [user?.nickname]);
  const [partnerName, setPartnerName] = useState<string>("연인");

  useEffect(() => {
    let mounted = true;
    async function loadPartnerNickname() {
      if (!partnerId) {
        if (mounted) setPartnerName("연인");
        return;
      }
      const { data, error } = await supabase
        .from("users")
        .select("nickname")
        .eq("id", partnerId)
        .maybeSingle();
      if (!mounted) return;
      if (error || !data) setPartnerName("연인");
      else setPartnerName(data.nickname || "연인");
    }
    loadPartnerNickname();
    return () => {
      mounted = false;
    };
  }, [partnerId]);

  const [frag, setFrag] = useState<Fragment | null>(null);
  const [cards, setCards] = useState<MemoryCard[]>([]);

  // 로컬 상태 (자동저장 제거)
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState<string>("");
  const [summary, setSummary] = useState("");

  // 초기 스냅샷(Dirty 계산용)
  const [initialTitle, setInitialTitle] = useState("");
  const [initialEventDate, setInitialEventDate] = useState<string>("");
  const [initialSummary, setInitialSummary] = useState("");
  const [initialCardTexts, setInitialCardTexts] = useState<
    Record<string, { author: string; partner: string }>
  >({});
  const [initialOrderMap, setInitialOrderMap] = useState<
    Record<string, number>
  >({});

  // 캡션 로컬 상태 (자동저장 제거)
  const [cardTexts, setCardTexts] = useState<
    Record<string, { author: string; partner: string }>
  >({});

  // 날짜 Dialog
  const [dateOpen, setDateOpen] = useState(false);

  // 삭제 다이얼로그
  const [confirmOpen, setConfirmOpen] = useState<null | {
    type: "fragment" | "card";
    id?: string;
  }>(null);

  // 하트 이펙트 (+1)
  const [boom, setBoom] = useState(false);
  const [plusOne, setPlusOne] = useState(false);
  const boomTimer = useRef<number | null>(null);
  const plusTimer = useRef<number | null>(null);

  // 파일 선택 ref
  const fileRef = useRef<HTMLInputElement | null>(null);

  // DnD refs
  const dragFrom = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);
  const isDragging = useRef(false);

  // 저장 버튼 상태
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // 데이터 로드
  async function loadAll() {
    if (!id) return;
    const [f, sum] = await Promise.all([getFragment(id), getSummary(id)]);
    setFrag(f);
    setTitle(f.title);
    setEventDate(f.event_date);
    setSummary(sum?.content ?? "");
    const all = await listCards(id, 1000, 0);
    setCards(all);

    const initText: Record<string, { author: string; partner: string }> = {};
    const initOrder: Record<string, number> = {};
    all.forEach((c, idx) => {
      initText[c.id] = {
        author: c.caption_author ?? "",
        partner: c.caption_partner ?? "",
      };
      initOrder[c.id] = idx;
    });

    // 초기 스냅샷 저장
    setInitialTitle(f.title);
    setInitialEventDate(f.event_date);
    setInitialSummary(sum?.content ?? "");
    setInitialCardTexts(initText);
    setInitialOrderMap(initOrder);

    // 로컬 편집 상태 세팅
    setCardTexts(initText);

    // 초기엔 dirty 아님
    setDirty(false);
  }

  useEffect(() => {
    loadAll();
    return () => {
      if (boomTimer.current) window.clearTimeout(boomTimer.current);
      if (plusTimer.current) window.clearTimeout(plusTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Dirty 계산
  useEffect(() => {
    if (!frag) return;
    let changed = false;

    if (title !== initialTitle) changed = true;
    if (eventDate !== initialEventDate) changed = true;
    if (summary !== initialSummary) changed = true;

    // 캡션 비교
    if (!changed) {
      for (const c of cards) {
        const cur = cardTexts[c.id] ?? { author: "", partner: "" };
        const init = initialCardTexts[c.id] ?? { author: "", partner: "" };
        if (cur.author !== init.author || cur.partner !== init.partner) {
          changed = true;
          break;
        }
      }
    }

    // 순서 비교
    if (!changed) {
      for (let idx = 0; idx < cards.length; idx++) {
        const c = cards[idx];
        if (initialOrderMap[c.id] !== idx) {
          changed = true;
          break;
        }
      }
    }

    setDirty(changed);
  }, [
    title,
    eventDate,
    summary,
    cardTexts,
    cards,
    initialTitle,
    initialEventDate,
    initialSummary,
    initialCardTexts,
    initialOrderMap,
    frag,
  ]);

  // DnD (이제 즉시 저장 X, 로컬 순서만 변경 → 저장 버튼에서 반영)
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

    const next = arrayMove(cards, from, to).map((c, idx) => ({
      ...c,
      order_index: idx,
    }));
    setCards(next);
  }

  // 액션들
  async function handleAddCard(file: File) {
    if (!couple?.id || !id) return;
    if (!currentUid) {
      toast.error("로그인 정보를 확인할 수 없어요.");
      return;
    }
    const up = await uploadMemoryImage({
      coupleId: couple.id,
      fragmentId: id,
      file,
    });
    const nextIndex = cards.length;
    const created = await addCard({
      fragment_id: id,
      couple_id: couple.id,
      author_id: currentUid,
      image_path: up.path,
      layout: "photo-left",
      caption_author: null,
      caption_partner: null,
      order_index: nextIndex,
    });

    setCards((prev) => {
      const arr = [...prev, created];
      return arr.map((c, idx) => ({ ...c, order_index: idx }));
    });
    setCardTexts((m) => ({
      ...m,
      [created.id]: { author: "", partner: "" },
    }));

    // 새 카드 추가 → 아직 저장 전 상태지만 DB엔 생성됨(이미지/카드 생성 자체는 즉시)
    // 순서/캡션/제목/요약 등은 Save에서 한번에 반영
    toast.success("사진 카드가 추가되었어요");
  }

  async function setCover(path: string) {
    if (!frag) return;
    // 대표 사진은 즉시 반영 (요청에 제한 없었음)
    const updated = await updateFragment(frag.id, { cover_photo_path: path });
    setFrag(updated);
    toast.success("대표 사진을 변경했어요");
  }

  async function addHeart() {
    if (!id || !frag) return;
    const next = await heartPlus(id);
    setFrag({ ...frag, hearts: next });

    setBoom(true);
    if (boomTimer.current) window.clearTimeout(boomTimer.current);
    boomTimer.current = window.setTimeout(() => setBoom(false), 450);

    setPlusOne(true);
    if (plusTimer.current) window.clearTimeout(plusTimer.current);
    plusTimer.current = window.setTimeout(() => setPlusOne(false), 650);
  }

  async function confirmDeleteFragment() {
    if (!id) return;
    try {
      const paths = cards.map((c) => c.image_path).filter(Boolean);
      if (paths.length > 0) {
        await Promise.allSettled(paths.map((p) => removeMemoryImage(p)));
      }
      await deleteFragment(id);
      toast.success("추억 조각과 모든 사진을 삭제했어요");
      setConfirmOpen(null);
      nav("/memories");
    } catch (e) {
      console.error(e);
      toast.error("삭제 중 오류가 발생했어요. 다시 시도해 주세요.");
    }
  }

  async function confirmDeleteCard(cardId: string) {
    const target = cards.find((c) => c.id === cardId);
    if (!target) {
      setConfirmOpen(null);
      return;
    }
    try {
      await removeMemoryImage(target.image_path);
      await deleteCard(cardId);
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      setCardTexts((m) => {
        const { [cardId]: _, ...rest } = m;
        return rest;
      });
      if (frag && frag.cover_photo_path === target.image_path) {
        const updated = await updateFragment(frag.id, {
          cover_photo_path: null,
        });
        setFrag(updated);
      }
      toast.success("사진 카드(파일 포함)를 삭제했어요");
      setConfirmOpen(null);
    } catch (e) {
      console.error(e);
      toast.error("삭제 중 오류가 발생했어요. 다시 시도해 주세요.");
    }
  }

  // ⚠️ 단축키 전면 제거 (요청)
  // useEffect(() => { ... }, [])  // 삭제

  const STICKY_TOP = "top-40 md:top-40";
  const dateText =
    eventDate && toDateFromYMD(eventDate)
      ? toDateFromYMD(eventDate)!.toLocaleDateString()
      : "날짜 선택";

  // 저장 버튼(한 번에 반영)
  async function handleSaveAll() {
    if (!frag) return;
    try {
      setSaving(true);

      const updates: Partial<Fragment> = {};
      if (title !== initialTitle) updates.title = title;
      if (eventDate !== initialEventDate) updates.event_date = eventDate;

      const ops: Promise<any>[] = [];

      if (Object.keys(updates).length > 0) {
        ops.push(updateFragment(frag.id, updates));
      }

      if (summary !== initialSummary) {
        ops.push(upsertSummary({ fragment_id: frag.id, content: summary }));
      }

      // 캡션 변경 반영
      for (const c of cards) {
        const cur = cardTexts[c.id] ?? { author: "", partner: "" };
        const init = initialCardTexts[c.id] ?? { author: "", partner: "" };
        const cardUpdate: Partial<MemoryCard> = {};
        if (cur.author !== init.author) cardUpdate.caption_author = cur.author;
        if (cur.partner !== init.partner)
          cardUpdate.caption_partner = cur.partner;
        if (Object.keys(cardUpdate).length > 0) {
          ops.push(updateCard(c.id, cardUpdate));
        }
      }

      // 순서 반영
      for (let idx = 0; idx < cards.length; idx++) {
        const c = cards[idx];
        if (initialOrderMap[c.id] !== idx) {
          ops.push(updateCard(c.id, { order_index: idx }));
        }
      }

      await Promise.all(ops);

      // 저장 완료 후 초기 스냅샷 갱신
      const refreshed = await listCards(frag.id, 1000, 0);
      setCards(refreshed);

      const newInitTexts: Record<string, { author: string; partner: string }> =
        {};
      const newInitOrder: Record<string, number> = {};
      refreshed.forEach((c, idx) => {
        newInitTexts[c.id] = {
          author: c.caption_author ?? "",
          partner: c.caption_partner ?? "",
        };
        newInitOrder[c.id] = idx;
      });

      setInitialTitle(title);
      setInitialEventDate(eventDate);
      setInitialSummary(summary);
      setInitialCardTexts(newInitTexts);
      setInitialOrderMap(newInitOrder);

      setDirty(false);
      toast.success("변경 사항을 저장했어요");
    } catch (e) {
      console.error(e);
      toast.error("저장 중 오류가 발생했어요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] p-6 space-y-8">
      {frag && (
        <>
          {/* ✅ Sticky 툴바 (저장 버튼 추가 / 사진추가 이동) */}
          <div
            className={`sticky ${STICKY_TOP} z-30 -mx-6 px-6 h-14 grid grid-cols-[auto_1fr_auto] items-center gap-3
            bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/65 rounded-xl
            border-b shadow-[0_1px_0_rgba(0,0,0,0.03)]`}
          >
            {/* 좌: 하트/카운트 */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full text-xl"
                  onClick={addHeart}
                  aria-label="좋아요"
                  title={`좋아요 ${frag.hearts}`}
                >
                  <span className="pointer-events-none select-none">❤️</span>
                </Button>
                {boom && (
                  <span className="pointer-events-none absolute inset-0 grid place-items-center">
                    <span className="animate-heart-burst text-2xl">❤️</span>
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="text-base md:text-lg text-slate-700 tabular-nums">
                  {frag.hearts}
                </span>
                {plusOne && (
                  <span className="absolute -right-6 -top-2 text-red-500 text-sm animate-plus-one">
                    +1
                  </span>
                )}
              </div>
            </div>

            {/* 중: 제목 (자동저장 제거) */}
            <div className="min-w-0 flex items-center gap-2 ml-6 ">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목"
                className="bg-transparent outline-none text-xl md:text-2xl font-extrabold tracking-tight min-w-0 w-full truncate"
                aria-label="제목"
              />
              {/* Dirty 표시(선택) */}
              {dirty && !saving && (
                <span className="text-[11px] text-amber-600 whitespace-nowrap">
                  변경 사항 있음
                </span>
              )}
              {saving && (
                <span className="text-xs text-slate-400 flex items-center gap-1 whitespace-nowrap">
                  <FontAwesomeIcon icon={faSpinner} spin /> 저장중…
                </span>
              )}
            </div>

            {/* 우: 정리된 액션 (저장/달력/메뉴) */}
            <ToolbarRight
              dateText={dateText}
              onOpenDate={() => setDateOpen(true)}
              onSave={handleSaveAll}
              saving={saving}
              onPickFile={() => fileRef.current?.click()}
              onGoList={() => nav("/memories")}
              onDeleteFragment={() => setConfirmOpen({ type: "fragment" })}
            />
          </div>

          {/* 메타줄 (2차 정보) */}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>
              작성자:{" "}
              {String(frag.author_id ?? "") === String(currentUid ?? "")
                ? myName
                : partnerName}
            </span>
            <span>·</span>
            <span>작성일: {new Date(frag.created_at).toLocaleString()}</span>
          </div>
        </>
      )}

      {/* 숨겨진 파일 input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          if (file) handleAddCard(file);
          if (fileRef.current) fileRef.current.value = "";
        }}
      />

      {/* 카드 리스트 */}
      <div className="grid gap-5">
        {cards.map((c, idx) => {
          const myId = String(currentUid ?? "").trim();
          const authorId = String(c.author_id ?? "").trim();
          const isAuthor = myId !== "" && authorId !== "" && myId === authorId;

          return (
            <DraggableRow
              key={c.id}
              index={idx}
              onDragStartIdx={onDragStartIdx}
              onDragOverIdx={onDragOverIdx}
              onDropToIdx={onDropToIdx}
            >
              <PhotoRow
                card={c}
                currentUserId={currentUid}
                myName={myName}
                partnerName={partnerName}
                authorValue={cardTexts[c.id]?.author ?? ""}
                partnerValue={cardTexts[c.id]?.partner ?? ""}
                onChangeAuthor={(v) => {
                  if (!isAuthor) return;
                  setCardTexts((m) => ({
                    ...m,
                    [c.id]: { ...(m[c.id] ?? { partner: "" }), author: v },
                  }));
                }}
                onChangePartner={(v) => {
                  if (isAuthor) return;
                  setCardTexts((m) => ({
                    ...m,
                    [c.id]: { ...(m[c.id] ?? { author: "" }), partner: v },
                  }));
                }}
                onSetCover={() => setCover(c.image_path)}
                isCover={frag?.cover_photo_path === c.image_path}
                onAskDelete={() => setConfirmOpen({ type: "card", id: c.id })}
              />
            </DraggableRow>
          );
        })}
      </div>

      {/* 추억 정리글 (자동저장 제거) */}
      <Card className="p-6 space-y-3">
        <div className="font-medium">메모하기</div>
        <Textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={6}
          className="resize-y"
          placeholder="사진 없이 글로 정리해도 좋아요."
        />
      </Card>

      {/* 날짜 Dialog + 큰 달력 */}
      <Dialog open={dateOpen} onOpenChange={setDateOpen}>
        <DialogContent className="max-w-[720px]">
          <DialogHeader>
            <DialogTitle>날짜 선택</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Calendar
              mode="single"
              selected={toDateFromYMD(eventDate) ?? new Date()}
              onSelect={(d) => {
                if (!d) return;
                const ymd = toYMD(d);
                setEventDate(ymd);
                setDateOpen(false);
              }}
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

      {/* 삭제 확인 다이얼로그 */}
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
                : "사진 카드를 삭제할까요?"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {confirmOpen?.type === "fragment"
              ? "이 조각의 모든 사진과 정리글이 함께 삭제됩니다. 되돌릴 수 없어요."
              : "이 사진 카드가 삭제됩니다. 되돌릴 수 없어요."}
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(null)}>
              취소
            </Button>
            {confirmOpen?.type === "fragment" ? (
              <Button variant="destructive" onClick={confirmDeleteFragment}>
                삭제
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={() =>
                  confirmOpen?.id && confirmDeleteCard(confirmOpen.id!)
                }
              >
                삭제
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 이펙트 스타일 */}
      <style>{`
@keyframes heart-burst {
  0%   { transform: scale(0.6); opacity: 0; }
  30%  { transform: scale(1.2); opacity: .9; }
  100% { transform: scale(1.8) translateY(-6px); opacity: 0; }
}
.animate-heart-burst { animation: heart-burst 450ms ease-out forwards; }

@keyframes plus-one-pop {
  0%   { transform: translateY(6px); opacity: 0; }
  30%  { transform: translateY(-2px); opacity: 1; }
  100% { transform: translateY(-14px); opacity: 0; }
}
.animate-plus-one { animation: plus-one-pop 650ms ease-out forwards; }
`}</style>
    </div>
  );
}
