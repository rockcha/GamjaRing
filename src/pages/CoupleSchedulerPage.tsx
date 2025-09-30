// src/pages/CoupleSchedulerPage.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

// icons
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  PencilLine,
  Trash2,
  CalendarPlus,
  Plus,
} from "lucide-react";

// 작성자 표시
import AvatarWidget from "@/components/widgets/AvatarWidget";

// utils
import { cn } from "@/lib/utils";

const TYPE_OPTIONS: ScheduleType[] = ["데이트", "기념일", "기타 일정"];

// 유형 색상(칸에 나오는 일정 pill 스타일)
const TYPE_STYLE: Record<ScheduleType, string> = {
  데이트: "bg-pink-50 ring-1 ring-pink-200 text-pink-900/80",
  기념일: "bg-amber-50 ring-1 ring-amber-200 text-amber-900/80",
  "기타 일정": "bg-blue-50 ring-1 ring-blue-200 text-blue-900/80",
};

// 작은 점(아이콘용)
const dotBg: Record<ScheduleType, string> = {
  데이트: "bg-pink-500",
  기념일: "bg-amber-500",
  "기타 일정": "bg-blue-500",
};

// YYYY-MM-DD
function formatYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type CoupleLike = { id: string; user1_id: string; user2_id: string };

export default function CoupleSchedulerPage() {
  const { user } = useUser();
  const { couple } = useCoupleContext?.() ?? { couple: null as any };
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

  const handleSubmitCreate = async () => {
    if (!user || !coupleId) return;
    const { error, data } = await createCoupleSchedule({
      coupleId,
      writerId: user.id,
      writerNickname: user.nickname,
      title: newTitle.trim(),
      type: newType,
      description: newDesc.trim(),
      scheduleDate: newDate,
    });
    if (error) {
      alert(error.message);
      return;
    }
    setOpenCreate(false);

    const { data: refreshed } = await getSchedulesByMonth(
      coupleId,
      cursor.getFullYear(),
      cursor.getMonth()
    );
    setItems(refreshed || []);

    if (partnerUserId) {
      await sendUserNotification({
        senderId: user.id,
        receiverId: partnerUserId,
        type: "일정등록",
        description: `${user.nickname}님이 '${newTitle}' 일정을 등록했어요. (${newDate}, ${newType})`,
      });
    }

    if (data) {
      setSelected(data);
      setEditMode(false);
      setOpenDetail(true);
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

  const handleSaveEdit = async () => {
    if (!selected || !user) return;
    const { error, data } = await updateCoupleSchedule({
      id: selected.id,
      title: editTitle.trim(),
      type: editType,
      description: editDesc.trim(),
      scheduleDate: editDate,
    });
    if (error) {
      alert(error.message);
      return;
    }
    setItems((prev) =>
      prev.map((x) => (x.id === selected.id ? (data as CoupleSchedule) : x))
    );
    setSelected(data as CoupleSchedule);
    setEditMode(false);

    if (partnerUserId) {
      await sendUserNotification({
        senderId: user.id,
        receiverId: partnerUserId,
        type: "일정수정",
        description: `${user.nickname}님이 '${editTitle}' 일정을 수정했어요. (${editDate}, ${editType})`,
      });
    }
  };

  const handleDelete = async () => {
    if (!selected || !user) return;
    if (!confirm("정말 삭제할까요?")) return;
    const { error } = await deleteCoupleSchedule(selected.id);
    if (error) {
      alert(error.message);
      return;
    }
    setItems((prev) => prev.filter((x) => x.id !== selected.id));

    if (partnerUserId) {
      await sendUserNotification({
        senderId: user.id,
        receiverId: partnerUserId,
        type: "일정삭제",
        description: `${user.nickname}님이 '${
          selected!.title
        }' 일정을 삭제했어요. (${selected!.schedule_date})`,
      });
    }

    setOpenDetail(false);
    setSelected(null);
  };

  const isToday = (date?: Date | null) =>
    !!date &&
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  return (
    <main className="mx-auto w-full max-w-screen-2xl px-4 md:px-8">
      <Card className="relative bg-white border shadow-sm pt-4">
        {/* 우상단 FAB: 일정 추가 */}
        <Button
          onClick={() => handleOpenCreate()}
          size="icon"
          className="absolute top-4 right-20 h-9 w-9 hover:cursor-pointer"
          title="일정 추가"
          aria-label="일정 추가"
        >
          <CalendarPlus className="h-5 w-5" />
        </Button>

        {/* 월 타이틀 + 네비 */}
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              onClick={goPrevMonth}
              size="icon"
              aria-label="이전 달"
              title="이전 달"
              className="rounded-full"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>

          <CardTitle className="text-base md:text-lg py-1">
            {cursor.getFullYear()}년 {cursor.getMonth() + 1}월
          </CardTitle>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              onClick={goNextMonth}
              size="icon"
              aria-label="다음 달"
              title="다음 달"
              className="rounded-full"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <CardContent className="p-3 md:p-4">
          {/* 요일 헤더 */}
          <div className="mb-3 grid grid-cols-7 text-center text-xs md:text-sm font-medium text-muted-foreground">
            {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>

          {/* 큰 달력: 7열 × 6행, 각 행 최소 높이 넉넉히 */}
          <div
            className={cn(
              "grid grid-cols-7 gap-1 md:gap-2",
              "[grid-template-rows:repeat(6,minmax(140px,1fr))]",
              "md:[grid-template-rows:repeat(6,minmax(160px,1fr))]",
              "lg:[grid-template-rows:repeat(6,minmax(180px,1fr))]"
            )}
          >
            {daysInMonth.map(({ date }, idx) => {
              if (!date) {
                return (
                  <div
                    key={`blank-${idx}`}
                    className="rounded-lg border bg-muted/30"
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
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
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
            <DialogTitle className="mb-2 leading-snug pb-1">
              일정 등록
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="제목"
            />
            <div className="flex gap-3">
              <Select
                value={newType}
                onValueChange={(v) => setNewType(v as ScheduleType)}
              >
                <SelectTrigger className="w-40 cursor-pointer">
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
                className="flex-1"
              />
            </div>
            <Textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="설명"
              rows={4}
            />
          </div>

          <DialogFooter className="mt-3">
            <DialogClose asChild>
              <Button variant="outline" className="hover:cursor-pointer">
                취소
              </Button>
            </DialogClose>
            <Button
              onClick={handleSubmitCreate}
              className="hover:cursor-pointer"
            >
              등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────── Detail/Edit Dialog ───────── */}
      <Dialog open={openDetail} onOpenChange={setOpenDetail}>
        <DialogContent className="fixed sm:max-w-xl left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {!editMode && selected ? (
            <div className="space-y-3">
              <DialogHeader>
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
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
                  <DialogTitle className="text-center truncate leading-snug pb-1">
                    {selected.title}
                  </DialogTitle>
                  <div className="h-10 w-10" aria-hidden />
                </div>
              </DialogHeader>

              <Separator />
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">날짜:</span>{" "}
                  {selected.schedule_date}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">유형:</span>
                  <span className="text-[11px]">{selected.type}</span>
                </div>
              </div>
              <Separator />
              <p className="whitespace-pre-wrap text-[15px]">
                {selected.description?.trim() || "내용 없음."}
              </p>

              <div className="absolute right-3 bottom-3 flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label="수정"
                  title="수정"
                  className="hover:cursor-pointer active:scale-95 transition"
                  onClick={() => setEditMode(true)}
                >
                  <PencilLine className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  aria-label="삭제"
                  title="삭제"
                  className="hover:cursor-pointer active:scale-95 transition"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            selected && (
              <div className="grid gap-3">
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="제목"
                />
                <div className="flex gap-3">
                  <Select
                    value={editType}
                    onValueChange={(v) => setEditType(v as ScheduleType)}
                  >
                    <SelectTrigger className="w-40 cursor-pointer">
                      <SelectValue placeholder="유형" />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map((t) => (
                        <SelectItem
                          key={t}
                          value={t}
                          className="cursor-pointer"
                        >
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="flex-1"
                  />
                </div>
                <Textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="설명"
                  rows={4}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    onClick={handleSaveEdit}
                    className="hover:cursor-pointer"
                  >
                    저장
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditMode(false)}
                    className="hover:cursor-pointer"
                  >
                    취소
                  </Button>
                </div>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

/* ───────────────── DayCell: 달력 칸 내부에서 일정 바로 노출 ───────────────── */
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

  return (
    <div className="rounded-lg border bg-white overflow-hidden flex flex-col">
      {/* 날짜 헤더 (클릭시 빠른추가) */}
      <button
        onClick={() => onAddQuick(ymd)}
        className={cn(
          "flex items-center justify-between px-2 py-1.5 border-b",
          isToday ? "bg-green-100" : "bg-muted/20",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
        title={`${ymd} 일정 추가`}
        aria-label={`${ymd} 일정 추가`}
      >
        <span
          className={cn(
            "text-xs md:text-sm font-semibold tabular-nums",
            isToday ? "text-primary" : "text-foreground"
          )}
        >
          {date.getDate()}
        </span>
        <span className="text-[10px] md:text-xs text-muted-foreground">
          {items.length ? `${items.length}개` : ""}
        </span>
      </button>

      {/* 일정 리스트 (칸 내부 스크롤) */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1.5">
          {items.length === 0 ? (
            <div className="text-[11px] md:text-xs text-muted-foreground/70">
              일정 없음
            </div>
          ) : (
            items.map((it) => (
              <button
                key={it.id}
                onClick={() => onOpenDetail(it)}
                className={cn(
                  "w-full text-left  px-2 py-1.5 text-[11px] md:text-xs ",
                  "hover:brightness-[.97] active:scale-[.99] transition",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  TYPE_STYLE[it.type]
                )}
                title={it.title}
                aria-label={`${it.type} - ${it.title}`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "inline-block size-2 rounded-full shrink-0",
                      dotBg[it.type]
                    )}
                  />
                  <span className="truncate font-medium">{it.title}</span>
                </div>
                {it.description?.trim() ? (
                  <div className="mt-0.5 text-[10px] opacity-70 line-clamp-2">
                    {it.description}
                  </div>
                ) : null}
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
