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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

const TYPE_OPTIONS: ScheduleType[] = ["데이트", "기념일", "기타 일정"];

// 카운트 뱃지 색(작은 점)
const dotClass: Record<ScheduleType, string> = {
  데이트: "bg-pink-500",
  기념일: "bg-amber-500",
  "기타 일정": "bg-blue-500",
};

// Popover 리스트 행의 은은한 배경/테두리 색
const typeRowClass: Record<ScheduleType, string> = {
  데이트: "bg-pink-50 hover:bg-pink-100/60 border-pink-100",
  기념일: "bg-amber-50 hover:bg-amber-100/60 border-amber-100",
  "기타 일정": "bg-blue-50 hover:bg-blue-100/60 border-blue-100",
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
    setNewTitle("");
    setNewType("데이트");
    setNewDate(date ?? formatYMD(today));
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

  // 날짜별 유형 카운트
  const getCounts = (arr: CoupleSchedule[]) => {
    const base: Record<ScheduleType, number> = {
      데이트: 0,
      기념일: 0,
      "기타 일정": 0,
    };
    for (const it of arr) base[it.type]++;
    return base;
  };

  return (
    <main className="mx-auto w-full max-w-screen-lg px-4 md:px-6">
      <Card className="relative bg-white border shadow-sm pt-4">
        {/* 우상단 FAB: 일정 추가 */}
        <Button
          onClick={() => handleOpenCreate()}
          size="icon"
          className="absolute top-4 right-4 h-9 w-9 hover:cursor-pointer"
          title="일정 추가"
          aria-label="일정 추가"
        >
          <CalendarPlus className="h-5 w-5" />
        </Button>

        {/* 월 타이틀만 중앙 정렬 (네비 버튼은 아래 그리드 옆으로 이동) */}
        <div className="flex items-center justify-center">
          <CardTitle className="text-base md:text-lg py-1">
            {cursor.getFullYear()}년 {cursor.getMonth() + 1}월
          </CardTitle>
        </div>

        <CardContent className="p-3 sm:p-4">
          {/* 요일 헤더 */}
          <div className="mb-2 grid grid-cols-7 text-center text-xs sm:text-sm font-medium text-muted-foreground">
            {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>

          {/* 달력 그리드 + 좌우 네비(달력 밖, 세로 중앙) */}
          <div className="relative">
            {/* 왼쪽 네비: 달력 영역 '밖'으로 살짝 빼서 배치 */}
            <div className="hidden sm:flex absolute top-1/2 -translate-y-1/2 -left-10 md:-left-12 lg:-left-14 z-10">
              <Button
                variant="ghost"
                onClick={goPrevMonth}
                className="hover:cursor-pointer rounded-full"
                size="icon"
                aria-label="이전 달"
                title="이전 달"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </div>

            {/* 오른쪽 네비: 달력 영역 '밖'으로 살짝 빼서 배치 */}
            <div className="hidden sm:flex absolute top-1/2 -translate-y-1/2 -right-10 md:-right-12 lg:-right-14 z-10">
              <Button
                variant="ghost"
                onClick={goNextMonth}
                className="hover:cursor-pointer rounded-full"
                size="icon"
                aria-label="다음 달"
                title="다음 달"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {/* 달력 그리드 */}
            <div className="grid grid-cols-7 gap-[6px] sm:gap-1">
              {daysInMonth.map(({ date }, idx) => {
                const key = date ? formatYMD(date) : `blank-${idx}`;
                const dayKey = date ? formatYMD(date) : "";
                const dayItems = date ? itemsByDate.get(dayKey) ?? [] : [];
                const counts = getCounts(dayItems);

                // 빈칸
                if (!date) {
                  return (
                    <div
                      key={key}
                      className="aspect-[5/6] sm:aspect-[4/3] lg:aspect-[16/10] rounded-lg border bg-muted/30"
                    />
                  );
                }

                // 날짜 칸 본문
                const DayCellInner = (
                  <div className="h-full flex flex-col p-1">
                    <div
                      className={[
                        "text-xs font-semibold",
                        isToday(date)
                          ? "text-foreground"
                          : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {date.getDate()}
                    </div>

                    {/* 유형 카운트 */}
                    <div className="mt-1 flex-1 min-h-0">
                      <div className="flex flex-col gap-1">
                        {(
                          ["데이트", "기념일", "기타 일정"] as ScheduleType[]
                        ).map((t) => {
                          const c = counts[t];
                          if (!c) return null;
                          return (
                            <div
                              key={t}
                              className="flex items-center justify-between px-2 py-[3px] text-[10px] leading-none"
                            >
                              <span className="flex items-center gap-1">
                                <span
                                  className={`inline-block h-2.5 w-2.5 rounded-full ${dotClass[t]}`}
                                />
                                {t}
                              </span>
                              <span className="font-semibold">{c}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );

                // Popover: 제목 리스트
                return (
                  <Popover key={key}>
                    <PopoverTrigger asChild>
                      {/* 날짜칸 기본 호버 효과 */}
                      <button
                        className={[
                          "aspect-[5/6] sm:aspect-[4/3] lg:aspect-[16/10]",
                          "rounded-lg border bg-white min-w-0 overflow-hidden text-left",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          "transition hover:bg-amber-50 hover:border-accent hover:shadow-sm",
                        ].join(" ")}
                      >
                        {DayCellInner}
                      </button>
                    </PopoverTrigger>

                    <PopoverContent
                      align="center"
                      className="w-80 p-0 overflow-hidden"
                      sideOffset={8}
                    >
                      <div className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">
                            {dayKey} 일정 목록
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleOpenCreate(dayKey)}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            추가
                          </Button>
                        </div>
                        <Separator className="my-3" />

                        {dayItems.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            일정이 없습니다.
                          </p>
                        ) : (
                          <ScrollArea className="max-h-72 pr-2">
                            <div className="space-y-2">
                              {dayItems.map((it) => (
                                <button
                                  key={it.id}
                                  onClick={() => handleOpenDetail(it)}
                                  className={[
                                    "w-full rounded-md border px-3 py-2 text-left",
                                    // 유형별 은은한 배경/테두리 색
                                    typeRowClass[it.type],
                                    "transition focus:outline-none",
                                  ].join(" ")}
                                  title={it.title}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="truncate font-medium">
                                      {it.title}
                                    </div>
                                    <span className="text-[11px] text-muted-foreground">
                                      {it.type}
                                    </span>
                                  </div>
                                  {it.description?.trim() ? (
                                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                      {it.description}
                                    </p>
                                  ) : null}
                                </button>
                              ))}
                            </div>
                          </ScrollArea>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })}
            </div>
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
