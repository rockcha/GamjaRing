// src/pages/CoupleSchedulerPage.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";
import {
  createCoupleSchedule,
  deleteCoupleSchedule,
  getSchedulesByMonth,
  updateCoupleSchedule,
  type CoupleSchedule,
  type ScheduleType,
} from "@/utils/coupleScheduler";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";

// shadcn
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// icons
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  PencilLine,
  Trash2,
  CalendarDays,
  Plus,
} from "lucide-react";

// 작성자 표시
import AvatarWidget from "@/components/widgets/AvatarWidget";

// utils
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/*────────────────────────────────────────────────────────┐
 | Config
 └────────────────────────────────────────────────────────*/
const TYPE_OPTIONS: ScheduleType[] = ["데이트", "기념일", "기타 일정"];

const TYPE_STYLE: Record<ScheduleType, string> = {
  데이트: "bg-pink-50  text-pink-900/80",
  기념일: "bg-amber-50  text-amber-900/80",
  "기타 일정": "bg-blue-50  text-blue-900/80",
};

const DOT_BG: Record<ScheduleType, string> = {
  데이트: "bg-pink-500",
  기념일: "bg-amber-500",
  "기타 일정": "bg-blue-500",
};

const TYPE_TONES = {
  데이트: { ring: "ring-pink-200", text: "text-pink-900/80", bg: "bg-pink-50" },
  기념일: {
    ring: "ring-amber-200",
    text: "text-amber-900/80",
    bg: "bg-amber-50",
  },
  "기타 일정": {
    ring: "ring-blue-200",
    text: "text-blue-900/80",
    bg: "bg-blue-50",
  },
} as const;

// YYYY-MM-DD
function formatYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// random temp id for optimistic UI
const tempId = () => `temp_${Math.random().toString(36).slice(2, 10)}`;

/*────────────────────────────────────────────────────────┐
 | Month-Pill Navigator (중앙 고정)
 | - 모바일: 하단 중앙(FAB)
 | - 데스크톱: 상단 중앙
 └────────────────────────────────────────────────────────*/
function MonthPillNav({
  cursor,
  onPrev,
  onNext,
  onPick,
  onToday,
}: {
  cursor: Date;
  onPrev: () => void;
  onNext: () => void;
  onPick: (yy: number, mm0: number) => void;
  onToday: () => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const y = cursor.getFullYear();
  const m0 = cursor.getMonth();

  // 모바일 스와이프
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    let startX = 0;
    let isDown = false;
    const down = (e: PointerEvent) => {
      isDown = true;
      startX = e.clientX;
    };
    const up = (e: PointerEvent) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      if (dx > 60) onPrev();
      if (dx < -60) onNext();
      isDown = false;
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", () => (isDown = false));
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", () => (isDown = false));
    };
  }, [onPrev, onNext]);

  const YEARS = Array.from({ length: 9 }, (_, i) => y - 4 + i);
  const MONTHS = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div
      className={cn(
        "fixed inset-x-0 z-50 flex justify-center pointer-events-none",
        "top-[calc(env(safe-area-inset-top)+0.75rem)]"
      )}
      aria-label="월 네비게이션 영역"
    >
      <div
        ref={wrapperRef}
        className="pointer-events-auto rounded-full border bg-white/95
                   backdrop-blur supports-[backdrop-filter]:bg-white/70
                   shadow-[0_10px_30px_-20px_rgba(0,0,0,.35)]
                   flex items-center gap-1 p-1"
      >
        <Button
          variant="ghost"
          size="icon"
          aria-label="이전 달"
          onClick={onPrev}
          className="rounded-full min-h-10 min-w-10"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              title="월/연도 선택"
              className="rounded-full gap-2 min-h-10 px-4 border-dashed"
            >
              <CalendarDays className="h-4 w-4" />
              <span className="tabular-nums font-medium">
                {y}.{String(m0 + 1).padStart(2, "0")}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px]" sideOffset={8}>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-3 text-xs text-muted-foreground">
                연도
              </div>
              <div className="col-span-3 grid grid-cols-3 gap-2">
                {YEARS.map((yy) => (
                  <Button
                    key={yy}
                    variant={yy === y ? "default" : "outline"}
                    className="h-9"
                    onClick={() => onPick(yy, m0)}
                  >
                    {yy}
                  </Button>
                ))}
              </div>
              <div className="col-span-3 mt-2 text-xs text-muted-foreground">
                월
              </div>
              <div className="col-span-3 grid grid-cols-6 gap-1">
                {MONTHS.map((mm) => (
                  <Button
                    key={mm}
                    variant={mm === m0 ? "default" : "outline"}
                    className="h-9"
                    onClick={() => onPick(y, mm)}
                  >
                    {mm + 1}
                  </Button>
                ))}
              </div>
              <div className="col-span-3 mt-2">
                <Button
                  variant="secondary"
                  className="w-full h-9"
                  onClick={onToday}
                >
                  오늘로
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          size="icon"
          aria-label="다음 달"
          onClick={onNext}
          className="rounded-full min-h-10 min-w-10"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

/*────────────────────────────────────────────────────────┐
 | Page
 └────────────────────────────────────────────────────────*/

type CoupleLike = { id: string; user1_id: string; user2_id: string };

export default function CoupleSchedulerPage() {
  const { user } = useUser();
  const { couple } = useCoupleContext();
  const coupleId =
    (couple as CoupleLike | null)?.id ?? user?.partner_id ?? null;

  const partnerUserId = useMemo(() => {
    const c = couple as CoupleLike | null;
    if (!c || !user) return null;
    return c.user1_id === user.id ? c.user2_id : c.user1_id;
  }, [couple, user]);

  const today = new Date();
  const [cursor, setCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [items, setItems] = useState<CoupleSchedule[]>([]);
  const [loading, setLoading] = useState(false);

  // Create dialog
  const [openCreate, setOpenCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<ScheduleType>("데이트");
  const [newDate, setNewDate] = useState(formatYMD(today));
  const [newDesc, setNewDesc] = useState("");

  // Detail dialog
  const [openDetail, setOpenDetail] = useState(false);
  const [selected, setSelected] = useState<CoupleSchedule | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState<ScheduleType>("데이트");
  const [editDate, setEditDate] = useState(formatYMD(today));
  const [editDesc, setEditDesc] = useState("");

  // fetch
  useEffect(() => {
    if (!coupleId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await getSchedulesByMonth(
        coupleId,
        cursor.getFullYear(),
        cursor.getMonth()
      );
      if (!error) setItems(data);
      setLoading(false);
    })();
  }, [coupleId, cursor]);

  const daysInMonth = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    const cells: Array<{ date: Date | null }> = [];
    for (let i = 0; i < firstDay; i++) cells.push({ date: null });
    for (let d = 1; d <= lastDate; d++)
      cells.push({ date: new Date(year, month, d) });
    while (cells.length % 7 !== 0) cells.push({ date: null });
    return cells;
  }, [cursor]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CoupleSchedule[]>();
    for (const it of items) {
      const k = it.schedule_date;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    return map;
  }, [items]);

  const goPrevMonth = () =>
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const goNextMonth = () =>
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));

  const handleOpenCreate = (date?: string) => {
    const base = date ?? formatYMD(today);
    setNewTitle("");
    setNewType("데이트");
    setNewDate(base);
    setNewDesc("");
    setOpenCreate(true);
  };

  /*──────────────── Optimistic Create ────────────────*/
  const handleSubmitCreate = async () => {
    if (!user || !coupleId) return;

    const optimistic: CoupleSchedule = {
      id: tempId(),
      couple_id: coupleId,
      writer_id: user.id,
      writer_nickname: user.nickname,
      title: newTitle.trim() || "(제목 없음)",
      type: newType,
      description: newDesc.trim(),
      schedule_date: newDate,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any;

    setItems((prev) => [optimistic, ...prev]);
    setOpenCreate(false);
    toast.success("일정 임시 등록 완료");

    try {
      const { error, data } = await createCoupleSchedule({
        coupleId,
        writerId: user.id,
        writerNickname: user.nickname,
        title: optimistic.title,
        type: optimistic.type,
        description: optimistic.description,
        scheduleDate: optimistic.schedule_date,
      });
      if (error) throw error;

      setItems((prev) =>
        prev.map((x) => (x.id === optimistic.id ? (data as CoupleSchedule) : x))
      );

      if (partnerUserId) {
        await sendUserNotification({
          senderId: user.id,
          receiverId: partnerUserId,
          type: "일정등록",
          description: `${user.nickname}님이 '${optimistic.title}' 일정을 등록했어요. (${optimistic.schedule_date}, ${optimistic.type})`,
        });
      }

      if (data) {
        setSelected(data as CoupleSchedule);
        setEditMode(false);
        setOpenDetail(true);
      }
    } catch (e: any) {
      setItems((prev) => prev.filter((x) => x.id !== optimistic.id));
      toast.error(e?.message || "등록 실패");
    }
  };

  const handleOpenDetail = (it: CoupleSchedule) => {
    setSelected(it);
    setEditMode(false);
    setEditTitle(it.title);
    setEditType(it.type);
    setEditDate(it.schedule_date);
    setEditDesc(it.description);
    setOpenDetail(true);
  };

  /*──────────────── Optimistic Update ────────────────*/
  const handleSaveEdit = async () => {
    if (!selected || !user) return;

    const before = selected;
    const nextLocal: CoupleSchedule = {
      ...before,
      title: editTitle.trim(),
      type: editType,
      description: editDesc.trim(),
      schedule_date: editDate,
    } as CoupleSchedule;

    setItems((prev) => prev.map((x) => (x.id === before.id ? nextLocal : x)));
    setSelected(nextLocal);
    setEditMode(false);
    toast.success("수정 반영");

    try {
      const { error, data } = await updateCoupleSchedule({
        id: before.id,
        title: nextLocal.title,
        type: nextLocal.type,
        description: nextLocal.description,
        scheduleDate: nextLocal.schedule_date,
      });
      if (error) throw error;

      setItems((prev) =>
        prev.map((x) => (x.id === before.id ? (data as CoupleSchedule) : x))
      );
      setSelected(data as CoupleSchedule);

      if (partnerUserId) {
        await sendUserNotification({
          senderId: user.id,
          receiverId: partnerUserId,
          type: "일정수정",
          description: `${user.nickname}님이 '${nextLocal.title}' 일정을 수정했어요. (${nextLocal.schedule_date}, ${nextLocal.type})`,
        });
      }
    } catch (e: any) {
      setItems((prev) => prev.map((x) => (x.id === before.id ? before : x)));
      setSelected(before);
      setEditMode(true);
      toast.error(e?.message || "수정 실패, 되돌렸습니다");
    }
  };

  /*──────────────── Optimistic Delete ────────────────*/
  const handleDelete = async () => {
    if (!selected || !user) return;
    const target = selected;
    const keep = items;

    setItems((prev) => prev.filter((x) => x.id !== target.id));
    setOpenDetail(false);
    toast.message("삭제 반영", { description: "네트워크 확인 중" });

    try {
      const { error } = await deleteCoupleSchedule(target.id);
      if (error) throw error;

      if (partnerUserId) {
        await sendUserNotification({
          senderId: user.id,
          receiverId: partnerUserId,
          type: "일정삭제",
          description: `${user.nickname}님이 '${target.title}' 일정을 삭제했어요. (${target.schedule_date})`,
        });
      }
    } catch (e: any) {
      setItems(keep);
      toast.error(e?.message || "삭제 실패, 되돌렸습니다");
    }
  };

  const isToday = (date?: Date | null) =>
    !!date &&
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  return (
    <main className="mx-auto w-full max-w-screen-2xl px-3 md:px-8 pb-20 md:pb-8">
      {/* 중앙 Month-Pill 네비 (반응형 위치) */}
      <MonthPillNav
        cursor={cursor}
        onPrev={goPrevMonth}
        onNext={goNextMonth}
        onToday={() =>
          setCursor(
            new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          )
        }
        onPick={(yy, mm0) => setCursor(new Date(yy, mm0, 1))}
      />

      <Card className="relative bg-white border shadow-sm pt-3 md:pt-4">
        {/* 페이지 타이틀 영역 (센터) */}
        <div className="flex items-center justify-center px-4">
          <CardTitle className="text-base md:text-lg py-1">
            {cursor.getFullYear()}년 {cursor.getMonth() + 1}월
          </CardTitle>
        </div>

        <CardContent className="p-2 md:p-4">
          {/* 요일 헤더 */}
          <div className="mb-2 md:mb-3 grid grid-cols-7 text-center text-xs md:text-sm font-medium text-muted-foreground">
            {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
              <div key={d} className="py-1.5 md:py-2">
                {d}
              </div>
            ))}
          </div>

          {/* 큰 달력: 7열 × 6행 — 고정 높이(화면별) */}
          <div
            className={cn(
              "grid grid-cols-7 gap-1 md:gap-2",
              "[grid-template-rows:repeat(6,118px)]",
              "sm:[grid-template-rows:repeat(6,132px)]",
              "md:[grid-template-rows:repeat(6,156px)]",
              "lg:[grid-template-rows:repeat(6,180px)]"
            )}
          >
            {daysInMonth.map(({ date }, idx) => {
              if (!date) {
                return (
                  <div
                    key={`blank-${idx}`}
                    className="rounded-lg border bg-stone-50/70 border-dashed"
                  />
                );
              }

              const key = formatYMD(date);
              const dayItems = itemsByDate.get(key) ?? [];

              return (
                <DayCell
                  key={key}
                  date={date}
                  isToday={isToday(date)}
                  items={dayItems}
                  onAddQuick={handleOpenCreate}
                  onOpenDetail={handleOpenDetail}
                />
              );
            })}
          </div>

          {loading && (
            <div className="mt-3 md:mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              불러오는 중…
            </div>
          )}
        </CardContent>
      </Card>

      {/* ───────── Create Dialog ───────── */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="fixed sm:max-w-xl left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <DialogHeader>
            <DialogTitle className="mb-1 leading-snug">일정 등록</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="제목"
              className="min-h-10"
            />
            <div className="flex gap-3">
              <Select
                value={newType}
                onValueChange={(v) => setNewType(v as ScheduleType)}
              >
                <SelectTrigger className="w-40 cursor-pointer min-h-10">
                  <SelectValue placeholder="유형" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t} className="cursor-pointer">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="flex-1 min-h-10"
              />
            </div>
            <Textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="설명"
              rows={5}
            />
          </div>

          <DialogFooter className="mt-3">
            <DialogClose asChild>
              <Button variant="outline" className="min-h-10 min-w-20">
                취소
              </Button>
            </DialogClose>
            <Button onClick={handleSubmitCreate} className="min-h-10 min-w-20">
              등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────── Detail/Edit Dialog (깔끔 & 예쁜 카드 스타일) ───────── */}
      <Dialog open={openDetail} onOpenChange={setOpenDetail}>
        <DialogContent className="fixed sm:max-w-lg left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 p-0 overflow-hidden rounded-2xl border shadow-2xl">
          {selected && (
            <div className="relative">
              {/* 상단 배경 스트립 */}
              <div className="h-2 w-full bg-gradient-to-r from-amber-200/60 via-stone-200/40 to-amber-200/60" />

              {/* 헤더 */}
              <div className="px-5 pt-4 pb-3 bg-white">
                <div className="flex items-center gap-3">
                  {(() => {
                    const writerId = (selected as any)?.writer_id as
                      | string
                      | undefined;
                    const authorIsMe = writerId
                      ? writerId === user?.id
                      : selected.writer_nickname === user?.nickname;
                    return (
                      <AvatarWidget
                        type={authorIsMe ? "user" : "partner"}
                        size="sm"
                      />
                    );
                  })()}
                  <div className="min-w-0">
                    <DialogTitle className="truncate text-lg font-semibold leading-tight">
                      {selected.title}
                    </DialogTitle>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className="rounded-full px-2 py-0.5 text-[11px] tabular-nums"
                      >
                        {selected.schedule_date}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px]",
                          TYPE_TONES[selected.type]?.text,
                          "border-muted-foreground/30"
                        )}
                      >
                        {selected.type}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* 우측 상단 액션(오버레이) */}
                <div className="absolute right-3 bottom-3 flex gap-1">
                  {!editMode ? (
                    <>
                      <Button
                        variant="default"
                        size="icon"
                        title="수정"
                        onClick={() => setEditMode(true)}
                        className="rounded-lg min-h-9 min-w-9"
                      >
                        <PencilLine className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        title="삭제"
                        onClick={handleDelete}
                        className="rounded-lg min-h-9 min-w-9"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        className="rounded-lg h-9 px-4"
                      >
                        저장
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditMode(false)}
                        className="rounded-lg h-9 px-4"
                      >
                        취소
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* 본문 */}
              <div className="px-5 pb-5 pt-2 bg-white">
                {!editMode ? (
                  <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                    <p className="whitespace-pre-wrap text-[15px] leading-6 text-stone-800">
                      {selected.description?.trim() || "메모가 비어 있어요."}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="제목"
                      className="min-h-11"
                    />
                    <div className="flex gap-3">
                      <Select
                        value={editType}
                        onValueChange={(v) => setEditType(v as ScheduleType)}
                      >
                        <SelectTrigger className="w-40 min-h-11">
                          <SelectValue placeholder="유형" />
                        </SelectTrigger>
                        <SelectContent>
                          {TYPE_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="flex-1 min-h-11"
                      />
                    </div>
                    <Textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={6}
                      placeholder="메모"
                      className="leading-6"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

/*────────────────────────────────────────────────────────┐
 | DayCell: 달력 칸 내부
 | - 오늘 칸 테두리 글로우
 | - 제목만 표시(설명 숨김)
 | - 빈 문구 제거
 | - 고정 높이 + 내부 스크롤
 └────────────────────────────────────────────────────────*/
function DayCell({
  date,
  isToday,
  items,
  onAddQuick,
  onOpenDetail,
}: {
  date: Date;
  isToday: boolean;
  items: CoupleSchedule[];
  onAddQuick: (ymd: string) => void;
  onOpenDetail: (it: CoupleSchedule) => void;
}) {
  const ymd = formatYMD(date);
  const densityDots = Math.min(3, items.length);

  return (
    <div
      className={cn(
        "relative rounded-lg border bg-white overflow-hidden flex flex-col min-h-0",
        // ✨ 오늘 칸 하이라이트: ring + soft glow shadow
        isToday
          ? "ring-2 ring-emerald-400/70 shadow-[0_0_0_3px_rgba(16,185,129,.25)]"
          : ""
      )}
    >
      {/* 날짜 헤더 (클릭시 빠른 추가) */}
      <button
        onClick={() => onAddQuick(ymd)}
        className={cn(
          "group flex items-center justify-between px-2 py-2 border-b",
          isToday ? "bg-emerald-50" : "bg-muted/20",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
        title={`${ymd} 일정 추가`}
        aria-label={`${ymd} 일정 추가`}
      >
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            isToday ? "text-emerald-800" : "text-foreground"
          )}
        >
          {date.getDate()}
        </span>
        <div className="flex items-center gap-1">
          {Array.from({ length: densityDots }).map((_, i) => (
            <span
              key={i}
              className="inline-block size-1.5 rounded-full bg-amber-500/60"
            />
          ))}
          {items.length > 0 && (
            <span className="text-[11px] md:text-xs text-muted-foreground">
              {items.length}개
            </span>
          )}
          <span className="ml-1 hidden md:inline-block text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition">
            <Plus className="h-3.5 w-3.5" />
          </span>
        </div>
      </button>

      {/* 일정 리스트 (칸 내부 스크롤) */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {/* ⛔ 빈 문구 제거: items.length===0 면 그냥 비워둠 */}
          {items.map((it) => (
            <button
              key={it.id}
              onClick={() => onOpenDetail(it)}
              className={cn(
                "w-full text-left px-2 py-2 text-[12px] md:text-xs rounded-md",
                "hover:brightness-[.98] active:scale-[.99] transition border",

                TYPE_STYLE[it.type]
              )}
              title={it.title}
              aria-label={`${it.type} - ${it.title}`}
              style={{ minHeight: 40 }}
            >
              <div className="flex items-center justify-center gap-1.5">
                {/* ✅ 제목만 표시 */}
                <span className="truncate font-medium">{it.title}</span>
              </div>
              {/* 설명은 숨김 */}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
