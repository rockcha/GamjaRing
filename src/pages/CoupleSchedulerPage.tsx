// src/pages/CoupleSchedulerPage.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  PencilLine,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import AvatarWidget from "@/components/widgets/AvatarWidget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { useUser } from "@/contexts/UserContext";
import { cn } from "@/lib/utils";
import {
  createCoupleSchedule,
  deleteCoupleSchedule,
  getSchedulesByMonth,
  updateCoupleSchedule,
  type CoupleSchedule,
  type ScheduleType,
} from "@/utils/coupleScheduler";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";

const TYPE_OPTIONS: ScheduleType[] = ["데이트", "기념일", "기타 일정"];

const TYPE_META: Record<
  ScheduleType,
  { dot: string; badge: string; soft: string; label: string }
> = {
  데이트: {
    dot: "bg-rose-500",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    soft: "bg-rose-50/70 hover:bg-rose-50",
    label: "데이트",
  },
  기념일: {
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    soft: "bg-amber-50/70 hover:bg-amber-50",
    label: "기념일",
  },
  "기타 일정": {
    dot: "bg-sky-500",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    soft: "bg-sky-50/70 hover:bg-sky-50",
    label: "기타 일정",
  },
};

type CoupleLike = {
  id: string;
  user1_id?: string | null;
  user2_id?: string | null;
};

type FormState = {
  title: string;
  type: ScheduleType;
  date: string;
  description: string;
};

function formatYMD(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonth(date: Date) {
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
}

function makeEmptyForm(date = formatYMD(new Date())): FormState {
  return {
    title: "",
    type: "데이트",
    date,
    description: "",
  };
}

function formFromSchedule(schedule: CoupleSchedule): FormState {
  return {
    title: schedule.title ?? "",
    type: schedule.type,
    date: schedule.schedule_date,
    description: schedule.description ?? "",
  };
}

export default function CoupleSchedulerPage() {
  const { user } = useUser();
  const { couple } = useCoupleContext();

  const coupleId =
    (couple as CoupleLike | null)?.id ?? user?.couple_id ?? null;
  const currentUid = user?.authId ?? user?.id ?? null;
  const currentNickname = user?.nickname ?? "나";

  const partnerUserId = useMemo(() => {
    const c = couple as CoupleLike | null;
    if (!c || !currentUid) return null;
    if (c.user1_id === currentUid) return c.user2_id ?? null;
    if (c.user2_id === currentUid) return c.user1_id ?? null;
    return null;
  }, [couple, currentUid]);

  const today = useMemo(() => new Date(), []);
  const todayYmd = formatYMD(today);

  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [mobileSelectedDate, setMobileSelectedDate] = useState(todayYmd);
  const [items, setItems] = useState<CoupleSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState<CoupleSchedule | null>(null);
  const [createForm, setCreateForm] = useState<FormState>(() =>
    makeEmptyForm(todayYmd),
  );
  const [editForm, setEditForm] = useState<FormState>(() =>
    makeEmptyForm(todayYmd),
  );

  async function reloadSchedules(month = cursor) {
    if (!coupleId) return;

    setLoading(true);
    try {
      const { data, error } = await getSchedulesByMonth(
        coupleId,
        month.getFullYear(),
        month.getMonth(),
      );
      if (error) throw error;
      setItems(data);
    } catch (error: any) {
      console.error("[scheduler] load error:", error);
      toast.error(error?.message || "일정을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reloadSchedules(cursor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coupleId, cursor]);

  useEffect(() => {
    const sameMonth =
      cursor.getFullYear() === today.getFullYear() &&
      cursor.getMonth() === today.getMonth();
    setMobileSelectedDate(sameMonth ? todayYmd : formatYMD(cursor));
  }, [cursor, today, todayYmd]);

  const days = useMemo(() => buildMonthCells(cursor), [cursor]);
  const itemsByDate = useMemo(() => {
    const map = new Map<string, CoupleSchedule[]>();
    items.forEach((item) => {
      const rows = map.get(item.schedule_date) ?? [];
      rows.push(item);
      map.set(item.schedule_date, rows);
    });
    return map;
  }, [items]);
  const mobileSelectedItems = itemsByDate.get(mobileSelectedDate) ?? [];

  function openCreate(date = todayYmd) {
    setCreateForm(makeEmptyForm(date));
    setCreateOpen(true);
  }

  function openDetail(schedule: CoupleSchedule) {
    setSelected(schedule);
    setEditForm(formFromSchedule(schedule));
    setEditMode(false);
    setDetailOpen(true);
  }

  function goMonth(offset: number) {
    setCursor((current) => {
      const next = new Date(current.getFullYear(), current.getMonth() + offset, 1);
      return next;
    });
  }

  function goToday() {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  async function handleCreate() {
    if (!coupleId || !currentUid) return;
    const title = createForm.title.trim();
    if (!title) {
      toast.error("제목을 입력해주세요.");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await createCoupleSchedule({
        coupleId,
        writerId: currentUid,
        writerNickname: currentNickname,
        title,
        type: createForm.type,
        description: createForm.description.trim(),
        scheduleDate: createForm.date,
      });
      if (error) throw error;

      if (data) {
        setItems((prev) =>
          [...prev, data].sort((a, b) =>
            a.schedule_date.localeCompare(b.schedule_date),
          ),
        );
        setSelected(data);
        setEditForm(formFromSchedule(data));
        setDetailOpen(true);
      }

      if (partnerUserId) {
        sendUserNotification({
          senderId: currentUid,
          receiverId: partnerUserId,
          type: "일정등록",
          description: `${currentNickname}님이 '${title}' 일정을 등록했어요.`,
        }).catch((error) => console.warn("schedule notification failed:", error));
      }

      setCreateOpen(false);
      toast.success("일정을 등록했어요.");
    } catch (error: any) {
      console.error("[scheduler] create error:", error);
      toast.error(error?.message || "일정을 등록하지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate() {
    if (!selected || !currentUid) return;
    const title = editForm.title.trim();
    if (!title) {
      toast.error("제목을 입력해주세요.");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await updateCoupleSchedule({
        id: selected.id,
        title,
        type: editForm.type,
        description: editForm.description.trim(),
        scheduleDate: editForm.date,
      });
      if (error) throw error;

      if (data) {
        setItems((prev) =>
          prev
            .map((item) => (item.id === data.id ? data : item))
            .sort((a, b) => a.schedule_date.localeCompare(b.schedule_date)),
        );
        setSelected(data);
        setEditForm(formFromSchedule(data));
      }

      if (partnerUserId) {
        sendUserNotification({
          senderId: currentUid,
          receiverId: partnerUserId,
          type: "일정수정",
          description: `${currentNickname}님이 '${title}' 일정을 수정했어요.`,
        }).catch((error) => console.warn("schedule notification failed:", error));
      }

      setEditMode(false);
      toast.success("일정을 수정했어요.");
    } catch (error: any) {
      console.error("[scheduler] update error:", error);
      toast.error(error?.message || "일정을 수정하지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected || !currentUid) return;
    const target = selected;

    setSaving(true);
    try {
      const { error } = await deleteCoupleSchedule(target.id);
      if (error) throw error;

      setItems((prev) => prev.filter((item) => item.id !== target.id));
      setDetailOpen(false);
      setSelected(null);

      if (partnerUserId) {
        sendUserNotification({
          senderId: currentUid,
          receiverId: partnerUserId,
          type: "일정삭제",
          description: `${currentNickname}님이 '${target.title}' 일정을 삭제했어요.`,
        }).catch((error) => console.warn("schedule notification failed:", error));
      }

      toast.success("일정을 삭제했어요.");
    } catch (error: any) {
      console.error("[scheduler] delete error:", error);
      toast.error(error?.message || "일정을 삭제하지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-background">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <Card className="shadow-sm">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-2xl">커플 스케줄러</CardTitle>
                  <Badge variant="secondary">
                    {items.length.toLocaleString("ko-KR")}
                  </Badge>
                </div>
                <CardDescription>
                  함께 챙길 데이트, 기념일, 중요한 일정을 한 달 단위로 정리합니다.
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => goMonth(-1)}>
                  <ChevronLeft className="size-4" />
                </Button>
                <Button variant="outline" onClick={goToday}>
                  오늘
                </Button>
                <div className="min-w-32 text-center text-lg font-semibold">
                  {formatMonth(cursor)}
                </div>
                <Button variant="outline" size="icon" onClick={() => goMonth(1)}>
                  <ChevronRight className="size-4" />
                </Button>
                <Button onClick={() => openCreate(todayYmd)}>
                  <Plus className="mr-2 size-4" />
                  일정 추가
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="md:hidden">
              <MobileScheduleView
                days={days}
                selectedDate={mobileSelectedDate}
                selectedItems={mobileSelectedItems}
                todayYmd={todayYmd}
                itemsByDate={itemsByDate}
                onSelectDate={setMobileSelectedDate}
                onCreate={() => openCreate(mobileSelectedDate)}
                onOpen={openDetail}
              />
            </div>

            <div className="hidden md:block">
              <div className="mb-3 grid grid-cols-7 text-center text-sm font-medium text-muted-foreground">
                {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                  <div key={day} className="py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {days.map((cell, index) => {
                  if (!cell.date) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="min-h-36 rounded-md border border-dashed bg-muted/20 lg:min-h-40"
                      />
                    );
                  }

                  const ymd = formatYMD(cell.date);
                  return (
                    <DayCell
                      key={ymd}
                      date={cell.date}
                      today={ymd === todayYmd}
                      items={itemsByDate.get(ymd) ?? []}
                      onCreate={() => openCreate(ymd)}
                      onOpen={openDetail}
                    />
                  );
                })}
              </div>
            </div>

            {loading && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                일정을 불러오는 중입니다.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-[min(92vw,560px)]">
          <DialogHeader>
            <DialogTitle>일정 추가</DialogTitle>
            <DialogDescription>
              제목, 날짜, 종류를 입력해서 새 일정을 등록합니다.
            </DialogDescription>
          </DialogHeader>
          <ScheduleForm value={createForm} onChange={setCreateForm} />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setEditMode(false);
        }}
      >
        <DialogContent className="max-w-[min(92vw,600px)]">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <AvatarWidget
                    type={
                      (selected as any).writer === currentUid ? "user" : "partner"
                    }
                    size="sm"
                    enableMenu={false}
                  />
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="truncate">
                      {editMode ? "일정 수정" : selected.title}
                    </DialogTitle>
                    {!editMode && (
                      <DialogDescription className="mt-1">
                        {formatDate(selected.schedule_date)}
                      </DialogDescription>
                    )}
                  </div>
                  {!editMode && <TypeBadge type={selected.type} />}
                </div>
              </DialogHeader>

              {editMode ? (
                <ScheduleForm value={editForm} onChange={setEditForm} />
              ) : (
                <div className="space-y-4">
                  <div className="rounded-md border bg-muted/30 p-4">
                    <div className="mb-2 text-sm font-medium">메모</div>
                    <p className="min-h-20 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                      {selected.description?.trim() || "메모가 없습니다."}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    작성자 {selected.writer_nickname || "알 수 없음"}
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2">
                {editMode ? (
                  <>
                    <Button variant="outline" onClick={() => setEditMode(false)}>
                      취소
                    </Button>
                    <Button onClick={handleUpdate} disabled={saving}>
                      {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                      저장
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={saving}
                    >
                      <Trash2 className="mr-2 size-4" />
                      삭제
                    </Button>
                    <Button variant="outline" onClick={() => setEditMode(true)}>
                      <PencilLine className="mr-2 size-4" />
                      수정
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}

function ScheduleForm({
  value,
  onChange,
}: {
  value: FormState;
  onChange: (next: FormState) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="space-y-2">
        <Label htmlFor="schedule-title">제목</Label>
        <Input
          id="schedule-title"
          value={value.title}
          onChange={(event) =>
            onChange({ ...value, title: event.target.value })
          }
          placeholder="어떤 일정인가요?"
          className="h-11"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
        <div className="space-y-2">
          <Label>종류</Label>
          <Select
            value={value.type}
            onValueChange={(type) =>
              onChange({ ...value, type: type as ScheduleType })
            }
          >
            <SelectTrigger className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((type) => (
                <SelectItem key={type} value={type}>
                  {TYPE_META[type].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="schedule-date">날짜</Label>
          <Input
            id="schedule-date"
            type="date"
            value={value.date}
            onChange={(event) =>
              onChange({ ...value, date: event.target.value })
            }
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="schedule-description">메모</Label>
        <Textarea
          id="schedule-description"
          value={value.description}
          onChange={(event) =>
            onChange({ ...value, description: event.target.value })
          }
          rows={5}
          placeholder="장소, 준비물, 기억할 내용을 적어보세요."
          className="resize-y"
        />
      </div>
    </div>
  );
}

function DayCell({
  date,
  today,
  items,
  onCreate,
  onOpen,
}: {
  date: Date;
  today: boolean;
  items: CoupleSchedule[];
  onCreate: () => void;
  onOpen: (item: CoupleSchedule) => void;
}) {
  return (
    <div
      className={cn(
        "flex min-h-28 flex-col overflow-hidden rounded-md border bg-card sm:min-h-36 lg:min-h-40",
        today && "ring-2 ring-primary/60",
      )}
    >
      <button
        type="button"
        onClick={onCreate}
        className={cn(
          "flex items-center justify-between border-b px-2 py-2 text-left transition-colors hover:bg-muted",
          today && "bg-primary/5",
        )}
      >
        <span className="text-sm font-semibold tabular-nums">
          {date.getDate()}
        </span>
        <div className="flex items-center gap-1">
          {items.slice(0, 3).map((item) => (
            <span
              key={item.id}
              className={cn("size-1.5 rounded-full", TYPE_META[item.type].dot)}
            />
          ))}
          {items.length > 0 && (
            <span className="text-xs text-muted-foreground">{items.length}</span>
          )}
          <Plus className="hidden size-3.5 text-muted-foreground sm:block" />
        </div>
      </button>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-1 p-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpen(item)}
              className={cn(
                "w-full rounded-md border px-2 py-2 text-left text-xs transition-colors",
                TYPE_META[item.type].soft,
              )}
              title={item.title}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    TYPE_META[item.type].dot,
                  )}
                />
                <span className="truncate font-medium">{item.title}</span>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function MobileScheduleView({
  days,
  selectedDate,
  selectedItems,
  todayYmd,
  itemsByDate,
  onSelectDate,
  onCreate,
  onOpen,
}: {
  days: Array<{ date: Date | null }>;
  selectedDate: string;
  selectedItems: CoupleSchedule[];
  todayYmd: string;
  itemsByDate: Map<string, CoupleSchedule[]>;
  onSelectDate: (date: string) => void;
  onCreate: () => void;
  onOpen: (item: CoupleSchedule) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
        {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
          <div key={day} className="py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((cell, index) => {
          if (!cell.date) {
            return <div key={`empty-mobile-${index}`} className="aspect-square" />;
          }

          const ymd = formatYMD(cell.date);
          const dayItems = itemsByDate.get(ymd) ?? [];
          const selected = selectedDate === ymd;
          const isToday = todayYmd === ymd;

          return (
            <button
              key={ymd}
              type="button"
              onClick={() => onSelectDate(ymd)}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-1 rounded-md border text-sm transition-colors",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted",
                isToday && !selected && "border-primary/60",
              )}
              aria-pressed={selected}
            >
              <span className="font-medium tabular-nums">{cell.date.getDate()}</span>
              <span className="flex h-1.5 items-center gap-0.5">
                {dayItems.slice(0, 3).map((item) => (
                  <span
                    key={item.id}
                    className={cn(
                      "size-1 rounded-full",
                      selected ? "bg-primary-foreground" : TYPE_META[item.type].dot,
                    )}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-md border bg-background">
        <div className="flex items-center justify-between gap-3 border-b p-3">
          <div>
            <div className="font-medium">{formatDate(selectedDate)}</div>
            <div className="text-xs text-muted-foreground">
              {selectedItems.length > 0
                ? `${selectedItems.length}개의 일정`
                : "등록된 일정이 없습니다"}
            </div>
          </div>
          <Button size="sm" onClick={onCreate}>
            <Plus className="mr-1.5 size-4" />
            추가
          </Button>
        </div>

        <div className="max-h-[42vh] overflow-y-auto p-3">
          {selectedItems.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              이 날짜에 일정을 추가해보세요.
            </div>
          ) : (
            <div className="space-y-2">
              {selectedItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpen(item)}
                  className={cn(
                    "w-full rounded-md border p-3 text-left transition-colors",
                    TYPE_META[item.type].soft,
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {item.title}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {TYPE_META[item.type].label}
                      </div>
                    </div>
                    <TypeBadge type={item.type} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: ScheduleType }) {
  return (
    <Badge variant="outline" className={cn("shrink-0", TYPE_META[type].badge)}>
      {TYPE_META[type].label}
    </Badge>
  );
}

function buildMonthCells(cursor: Date) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ date: Date | null }> = [];

  for (let index = 0; index < firstDay; index++) cells.push({ date: null });
  for (let day = 1; day <= lastDate; day++) {
    cells.push({ date: new Date(year, month, day) });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null });
  while (cells.length < 42) cells.push({ date: null });

  return cells;
}
