// src/features/memories/FragmentDetailPage.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";

/* -------- FontAwesome -------- */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeart,
  faListUl,
  faFloppyDisk,
  faSpinner,
  faCamera,
  faTrash,
  faCrown,
} from "@fortawesome/free-solid-svg-icons";

/* ============== 유틸 ============== */
function arrayMove<T>(arr: T[], from: number, to: number) {
  const clone = arr.slice();
  const [item] = clone.splice(from, 1);
  clone.splice(to, 0, item);
  return clone;
}

/** 간단 디바운스 */
function debounce<T extends (...a: any[]) => any>(fn: T, delay = 600) {
  let t: any;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

/** 일정 시간 표시 후 꺼지는 '저장됨' 플래그 */
function useSavedFlag() {
  const [saved, setSaved] = useState(false);
  const timer = useRef<any>(null);
  const showSaved = () => {
    setSaved(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 1200);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return { saved, showSaved };
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
  savingAuthor,
  savingPartner,
  savedAuthor,
  savedPartner,
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
  savingAuthor: boolean;
  savingPartner: boolean;
  savedAuthor: boolean;
  savedPartner: boolean;
}) {
  const myId = String(currentUserId ?? "").trim();
  const authorId = String(card.author_id ?? "").trim();
  const isAuthor = myId !== "" && authorId !== "" && myId === authorId;

  const canEditAuthor = isAuthor;
  const canEditPartner = !isAuthor;

  return (
    <Card className="p-6">
      <div className="flex flex-col xl:flex-row gap-6">
        <div className="relative">
          {/* ✅ 왕관(대표 버튼): 대표면 금색 포커스 */}
          <button
            type="button"
            className={`absolute left-2 top-2 z-10 rounded-full h-9 px-3
              bg-black/60 hover:bg-black/70 text-white border border-white/40
              backdrop-blur-sm shadow-sm text-xs font-medium flex items-center gap-2
              ${isCover ? "ring-2 ring-amber-400" : ""}`}
            onClick={onSetCover}
            title="이 사진을 대표로 설정"
          >
            <FontAwesomeIcon
              icon={faCrown}
              className={isCover ? "text-amber-300" : "text-white"}
            />
            {isCover ? "대표 사진" : "대표로"}
          </button>

          <img
            src={publicUrl(card.image_path)}
            alt="memory"
            className="w-full max-w-[520px] h-[340px] object-cover rounded-xl"
            loading="lazy"
          />
        </div>

        <div className="flex-1 grid gap-5 min-w-[360px]">
          {/* 내 캡션 (항상 위) */}
          <div className="grid gap-1">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium text-slate-500">
                {myName}의 캡션
              </Label>
              {savingAuthor && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <FontAwesomeIcon icon={faSpinner} spin /> 저장중…
                </span>
              )}
              {savedAuthor && !savingAuthor && (
                <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                  <FontAwesomeIcon icon={faFloppyDisk} />
                  저장됨
                </span>
              )}
            </div>
            <Textarea
              value={authorValue}
              onChange={(e) => canEditAuthor && onChangeAuthor(e.target.value)}
              disabled={!canEditAuthor}
              placeholder={
                canEditAuthor
                  ? "이 사진에 대해서 설명해주세요!"
                  : "작성자만 수정할 수 있어요"
              }
              rows={4}
              className="resize-y leading-6"
            />
          </div>

          {/* 상대 닉네임 캡션 */}
          <div className="grid gap-1">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-medium text-slate-500">
                {partnerName}의 캡션
              </Label>
              {savingPartner && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <FontAwesomeIcon icon={faSpinner} spin /> 저장중…
                </span>
              )}
              {savedPartner && !savingPartner && (
                <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                  <FontAwesomeIcon icon={faFloppyDisk} />
                  저장됨
                </span>
              )}
            </div>
            <Textarea
              value={partnerValue}
              onChange={(e) =>
                canEditPartner && onChangePartner(e.target.value)
              }
              disabled={!canEditPartner}
              placeholder={
                canEditPartner
                  ? "사진에 대한 내 생각을 남겨줘!"
                  : "상대가 나중에 작성할 수 있어요"
              }
              rows={4}
              className="resize-y leading-6"
            />
          </div>

          <div className="flex justify-end">
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

  // 컨텍스트
  const { couple, partnerId } = useCoupleContext();
  const { user } = useUser();

  // 통일된 현재 사용자 식별자 (Auth UID 우선, 없으면 profile id)
  const currentUid = useMemo(
    () => (user?.authId ?? user?.id) || null,
    [user?.authId, user?.id]
  );

  // 닉네임
  const myName = useMemo(() => user?.nickname ?? "나", [user?.nickname]);
  const [partnerName, setPartnerName] = useState<string>("연인");

  // 파트너 닉네임 로드
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

  // ====== 자동 저장 상태(제목/날짜/요약)
  const [title, setTitle] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const { saved: savedTitle, showSaved: flashSavedTitle } = useSavedFlag();

  const [eventDate, setEventDate] = useState<string>("");
  const [savingDate, setSavingDate] = useState(false);
  const { saved: savedDate, showSaved: flashSavedDate } = useSavedFlag();

  const [summary, setSummary] = useState("");
  const [savingSummary, setSavingSummary] = useState(false);
  const { saved: savedSummary, showSaved: flashSavedSummary } = useSavedFlag();

  // ====== 카드 캡션 로컬 상태 + 저장 상태
  const [cardTexts, setCardTexts] = useState<
    Record<string, { author: string; partner: string }>
  >({});
  const [savingCardAuthor, setSavingCardAuthor] = useState<
    Record<string, boolean>
  >({});
  const [savingCardPartner, setSavingCardPartner] = useState<
    Record<string, boolean>
  >({});
  const [savedCardAuthor, setSavedCardAuthor] = useState<
    Record<string, boolean>
  >({});
  const [savedCardPartner, setSavedCardPartner] = useState<
    Record<string, boolean>
  >({});

  // 작성자 이름(현재 사용자와 비교)
  const authorName = useMemo(() => {
    if (!frag) return "작성자";
    const fAuthor = String(frag.author_id ?? "").trim();
    const me = String(currentUid ?? "").trim();
    if (fAuthor && me && fAuthor === me) return myName;
    return partnerName;
  }, [frag, currentUid, myName, partnerName]);

  // 삭제 다이얼로그
  const [confirmOpen, setConfirmOpen] = useState<null | {
    type: "fragment" | "card";
    id?: string;
  }>(null);

  // 하트 이펙트
  const [boom, setBoom] = useState(false);
  const boomTimer = useRef<number | null>(null);

  // 파일 선택(숨김) + 헤더 버튼으로 트리거
  const fileRef = useRef<HTMLInputElement | null>(null);

  // DnD refs
  const dragFrom = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);
  const isDragging = useRef(false);

  // ===== 데이터 로드
  async function loadAll() {
    if (!id) return;
    const [f, sum] = await Promise.all([getFragment(id), getSummary(id)]);
    setFrag(f);
    setTitle(f.title);
    setEventDate(f.event_date);
    setSummary(sum?.content ?? "");
    const all = await listCards(id, 1000, 0);
    setCards(all);
    const init: Record<string, { author: string; partner: string }> = {};
    all.forEach((c) => {
      init[c.id] = {
        author: c.caption_author ?? "",
        partner: c.caption_partner ?? "",
      };
    });
    setCardTexts(init);
  }

  useEffect(() => {
    loadAll();
    return () => {
      if (boomTimer.current) window.clearTimeout(boomTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ===== 자동 저장 디바운스 함수들
  const debouncedSaveTitle = useMemo(
    () =>
      debounce(async (value: string) => {
        if (!frag) return;
        setSavingTitle(true);
        try {
          const updated = await updateFragment(frag.id, { title: value });
          setFrag(updated);
          flashSavedTitle();
        } finally {
          setSavingTitle(false);
        }
      }, 600),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [frag?.id]
  );

  const debouncedSaveDate = useMemo(
    () =>
      debounce(async (value: string) => {
        if (!frag) return;
        setSavingDate(true);
        try {
          const updated = await updateFragment(frag.id, { event_date: value });
          setFrag(updated);
          flashSavedDate();
        } finally {
          setSavingDate(false);
        }
      }, 600),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [frag?.id]
  );

  const debouncedSaveSummary = useMemo(
    () =>
      debounce(async (value: string) => {
        if (!frag) return;
        setSavingSummary(true);
        try {
          await upsertSummary({ fragment_id: frag.id, content: value });
          flashSavedSummary();
        } finally {
          setSavingSummary(false);
        }
      }, 800),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [frag?.id]
  );

  const debouncedSaveCardAuthor = useMemo(() => {
    const cache: Record<string, (v: string) => void> = {};
    return (cardId: string) => {
      if (!cache[cardId]) {
        cache[cardId] = debounce(async (value: string) => {
          setSavingCardAuthor((m) => ({ ...m, [cardId]: true }));
          try {
            await updateCard(cardId, { caption_author: value });
            setSavedCardAuthor((m) => ({ ...m, [cardId]: true }));
            setTimeout(
              () =>
                setSavedCardAuthor((m) => {
                  const { [cardId]: _, ...rest } = m;
                  return rest;
                }),
              1200
            );
          } finally {
            setSavingCardAuthor((m) => ({ ...m, [cardId]: false }));
          }
        }, 600);
      }
      return cache[cardId];
    };
  }, []);

  const debouncedSaveCardPartner = useMemo(() => {
    const cache: Record<string, (v: string) => void> = {};
    return (cardId: string) => {
      if (!cache[cardId]) {
        cache[cardId] = debounce(async (value: string) => {
          setSavingCardPartner((m) => ({ ...m, [cardId]: true }));
          try {
            await updateCard(cardId, { caption_partner: value });
            setSavedCardPartner((m) => ({ ...m, [cardId]: true }));
            setTimeout(
              () =>
                setSavedCardPartner((m) => {
                  const { [cardId]: _, ...rest } = m;
                  return rest;
                }),
              1200
            );
          } finally {
            setSavingCardPartner((m) => ({ ...m, [cardId]: false }));
          }
        }, 600);
      }
      return cache[cardId];
    };
  }, []);

  // ===== 순서 반영
  async function persistOrder(next: MemoryCard[]) {
    await Promise.all(
      next.map((c, idx) =>
        c.order_index !== idx
          ? updateCard(c.id, { order_index: idx })
          : Promise.resolve(c)
      )
    );
    toast.success("사진 카드 순서를 저장했어요");
  }

  function onDragStartIdx(i: number) {
    dragFrom.current = i;
    isDragging.current = true;
  }
  function onDragOverIdx(i: number) {
    dragOver.current = i;
  }
  async function onDropToIdx(i: number) {
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
    await persistOrder(next);
  }

  // ===== 액션들
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
      setCardTexts((m) => ({
        ...m,
        [created.id]: { author: "", partner: "" },
      }));
      return arr;
    });
    toast.success("사진 카드가 추가되었어요");
  }

  async function setCover(path: string) {
    if (!frag) return;
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
    boomTimer.current = window.setTimeout(() => setBoom(false), 600);
  }

  /** ✅ 조각(프래그먼트) 삭제: 모든 카드 파일 삭제 후 조각 삭제 */
  async function confirmDeleteFragment() {
    if (!id) return;
    try {
      // 1) 현재 로드된 카드들의 스토리지 이미지 모두 삭제
      const paths = cards.map((c) => c.image_path).filter(Boolean);
      if (paths.length > 0) {
        await Promise.allSettled(paths.map((p) => removeMemoryImage(p)));
      }

      // 2) 조각 삭제
      await deleteFragment(id);

      toast.success("추억 조각과 모든 사진을 삭제했어요");
      setConfirmOpen(null); // ✅ 다이얼로그 닫기
      nav("/memories");
    } catch (e) {
      console.error(e);
      toast.error("삭제 중 오류가 발생했어요. 다시 시도해 주세요.");
    }
  }

  /** ✅ 카드 삭제: 파일 삭제 → 카드 레코드 삭제 → 커버면 null 처리 */
  async function confirmDeleteCard(cardId: string) {
    const target = cards.find((c) => c.id === cardId);
    if (!target) {
      setConfirmOpen(null);
      return;
    }

    try {
      // 1) 파일 삭제
      await removeMemoryImage(target.image_path);

      // 2) DB 카드 삭제
      await deleteCard(cardId);

      // 3) 로컬 상태 갱신
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      setCardTexts((m) => {
        const { [cardId]: _, ...rest } = m;
        return rest;
      });

      // 4) 대표 사진이었으면 cover_photo_path = null
      if (frag && frag.cover_photo_path === target.image_path) {
        const updated = await updateFragment(frag.id, {
          cover_photo_path: null,
        });
        setFrag(updated);
      }

      toast.success("사진 카드(파일 포함)를 삭제했어요");
      setConfirmOpen(null); // ✅ 다이얼로그 닫기
    } catch (e) {
      console.error(e);
      toast.error("삭제 중 오류가 발생했어요. 다시 시도해 주세요.");
    }
  }

  /* ===== sticky offset (페이지 레이아웃에서 이미 설정) ===== */
  const STICKY_TOP = "top-40 md:top-40";

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-8">
      {frag && (
        <>
          {/* ✅ STICKY 헤더: 하트 · 제목 · 날짜 · 버튼들 정리 */}
          <div
            className={`sticky ${STICKY_TOP} z-30 -mx-6 px-6 py-3
            bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70
            border-b`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* 좌측: 하트 + 카운트 + 제목 + 날짜 */}
              <div className="flex items-center gap-4 min-w-0">
                {/* 하트 버튼(둥근) */}
                <div className="relative">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-full"
                    onClick={addHeart}
                    aria-label="좋아요"
                    title={`좋아요 ${frag.hearts}`}
                  >
                    <FontAwesomeIcon icon={faHeart} />
                  </Button>
                  {boom && (
                    <span className="pointer-events-none absolute inset-0 grid place-items-center">
                      <span className="animate-heart-burst text-2xl">🎔</span>
                    </span>
                  )}
                </div>
                <span className="text-sm text-slate-600 w-8">
                  {frag.hearts}
                </span>

                {/* 제목(완전 자동 저장) */}
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      debouncedSaveTitle(e.target.value);
                    }}
                    className="bg-transparent outline-none text-2xl md:text-4xl font-extrabold tracking-tight min-w-0"
                  />
                  {savingTitle && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <FontAwesomeIcon icon={faSpinner} spin /> 저장중…
                    </span>
                  )}
                  {savedTitle && !savingTitle && (
                    <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                      <FontAwesomeIcon icon={faFloppyDisk} />
                      저장됨
                    </span>
                  )}
                </div>

                {/* 날짜 (데스크톱) */}
                <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground shrink-0 ml-2">
                  <Label className="text-muted-foreground">날짜</Label>
                  <Input
                    type="date"
                    value={eventDate}
                    onChange={(e) => {
                      setEventDate(e.target.value);
                      debouncedSaveDate(e.target.value);
                    }}
                    className="h-9 w-[190px]"
                  />
                  {savingDate && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <FontAwesomeIcon icon={faSpinner} spin /> 저장중…
                    </span>
                  )}
                  {savedDate && !savingDate && (
                    <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                      <FontAwesomeIcon icon={faFloppyDisk} />
                      저장됨
                    </span>
                  )}
                </div>
              </div>

              {/* 우측 액션: 깔끔한 아이콘 버튼 그룹 */}
              <div className="flex items-center gap-2">
                {/* 사진 추가 */}
                <div>
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
                  <Button
                    onClick={() => fileRef.current?.click()}
                    className="gap-2"
                  >
                    <FontAwesomeIcon icon={faCamera} />
                    사진 추가
                  </Button>
                </div>

                {/* 목록으로 */}
                <Button
                  variant="secondary"
                  onClick={() => nav("/memories")}
                  className="gap-2"
                >
                  <FontAwesomeIcon icon={faListUl} />
                  목록
                </Button>

                {/* 삭제 */}
                <Button
                  variant="ghost"
                  onClick={() => setConfirmOpen({ type: "fragment" })}
                  className="gap-2"
                >
                  <FontAwesomeIcon icon={faTrash} />
                  삭제
                </Button>
              </div>
            </div>

            {/* 작성 메타 + 모바일 날짜 */}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <div className="md:hidden flex items-center gap-2">
                <Label className="text-muted-foreground">날짜</Label>
                <Input
                  type="date"
                  value={eventDate}
                  onChange={(e) => {
                    setEventDate(e.target.value);
                    debouncedSaveDate(e.target.value);
                  }}
                  className="h-8 w-[170px]"
                />
                {savingDate && (
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <FontAwesomeIcon icon={faSpinner} spin /> 저장중…
                  </span>
                )}
                {savedDate && !savingDate && (
                  <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                    <FontAwesomeIcon icon={faFloppyDisk} />
                    저장됨
                  </span>
                )}
              </div>
              <span>작성자: {authorName}</span>
              <span>·</span>
              <span>작성일: {new Date(frag.created_at).toLocaleString()}</span>
            </div>
          </div>
        </>
      )}

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
              onDragStartIdx={(i) => {
                // for accessibility feel
                void i;
              }}
              onDragOverIdx={() => {}}
              onDropToIdx={(i) => {
                const from = idx;
                if (from === i) return;
                // 외부 DnD 핸들러 사용
              }}
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
                  debouncedSaveCardAuthor(c.id)(v);
                }}
                onChangePartner={(v) => {
                  if (isAuthor) return; // 상대만 수정
                  setCardTexts((m) => ({
                    ...m,
                    [c.id]: { ...(m[c.id] ?? { author: "" }), partner: v },
                  }));
                  debouncedSaveCardPartner(c.id)(v);
                }}
                onSetCover={() => setCover(c.image_path)}
                isCover={frag?.cover_photo_path === c.image_path}
                onAskDelete={() => setConfirmOpen({ type: "card", id: c.id })}
                savingAuthor={!!savingCardAuthor[c.id]}
                savingPartner={!!savingCardPartner[c.id]}
                savedAuthor={!!savedCardAuthor[c.id]}
                savedPartner={!!savedCardPartner[c.id]}
              />
            </DraggableRow>
          );
        })}
      </div>

      {/* 추억 정리글 (완전 자동 저장) */}
      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-2">
          <div className="font-medium">마지막 추억 정리</div>
          {savingSummary && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <FontAwesomeIcon icon={faSpinner} spin /> 저장중…
            </span>
          )}
          {savedSummary && !savingSummary && (
            <span className="text-[11px] text-emerald-600 flex items-center gap-1">
              <FontAwesomeIcon icon={faFloppyDisk} />
              저장됨
            </span>
          )}
        </div>
        <Textarea
          value={summary}
          onChange={(e) => {
            setSummary(e.target.value);
            debouncedSaveSummary(e.target.value);
          }}
          rows={6}
          className="resize-y"
          placeholder="사진 없이 글로 정리해도 좋아요."
        />
      </Card>

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

      {/* 하트 이펙트 */}
      <style>{`
@keyframes heart-burst {
  0%   { transform: scale(0.6); opacity: 0; }
  30%  { transform: scale(1.2); opacity: .9; }
  100% { transform: scale(1.8); opacity: 0; }
}
.animate-heart-burst { animation: heart-burst 600ms ease-out forwards; }
`}</style>
    </div>
  );
}
