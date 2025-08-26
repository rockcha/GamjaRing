// src/pages/CoupleSchedulerPage.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";
import SadPotatoGuard from "@/components/SadPotatoGuard";

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
  DialogContent, // 전역 오버레이
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

// icons
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";

const TYPE_OPTIONS: ScheduleType[] = ["데이트", "기념일", "기타 일정"];

// 타입별 pill 색상 (참고 팔레트)
const typePillClass: Record<ScheduleType, string> = {
  데이트:
    "bg-pink-100 border border-pink-200 text-pink-900 hover:bg-pink-100/90",
  기념일:
    "bg-amber-100 border border-amber-200 text-amber-900 hover:bg-amber-100/90",
  "기타 일정":
    "bg-blue-100 border border-blue-200 text-blue-900 hover:bg-blue-100/90",
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
  const { user, isCoupled } = useUser();
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

  if (!isCoupled || !coupleId) {
    return (
      <main className="mx-auto  w-full max-w-screen-lg px-4 md:px-6 py-6">
        <SadPotatoGuard
          showRequestButton
          onRequestClick={() => console.log("요청 보내기")}
          hint="상대 닉네임으로 커플 요청을 먼저 완료해주세요."
        />
      </main>
    );
  }

  const isToday = (date?: Date | null) =>
    !!date &&
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  return (
    <main className="mx-auto w-full max-w-screen-lg px-4 md:px-6  ">
      {/* 카드 (FAB는 카드 안쪽 우상단) */}
      <Card className="relative bg-white border shadow-sm pt-4">
        <Button
          onClick={() => handleOpenCreate()}
          size="icon"
          className="absolute top-2 right-2 h-9 w-9 rounded-xl shadow-md hover:cursor-pointer bg-[#6b533b] text-white hover:bg-[#5d452e]"
          title="일정 추가"
        >
          <Plus className="h-5 w-5" />
        </Button>

        <div className=" flex justify-center items-center gap-1 ">
          <Button
            variant="ghost"
            onClick={goPrevMonth}
            className=" hover:cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <CardTitle className="text-base md:text-lg">
            {cursor.getFullYear()}년 {cursor.getMonth() + 1}월
          </CardTitle>

          <Button
            variant="ghost"
            onClick={goNextMonth}
            className="gap-2 hover:cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <CardContent className="p-4 sm:p-6">
          {/* 요일 헤더 */}
          <div className="mb-2 grid grid-cols-7 text-center text-sm font-medium text-muted-foreground">
            {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>

          {/* 달력 그리드 — 각 칸은 고정 높이, 내부 리스트만 스크롤 */}
          <div className="grid grid-cols-7 gap-1">
            {daysInMonth.map(({ date }, idx) => {
              const key = date ? formatYMD(date) : `blank-${idx}`;
              const dayItems = date
                ? itemsByDate.get(formatYMD(date)) ?? []
                : [];

              return (
                <div
                  className={[
                    "grid grid-rows-[auto_minmax(0,1fr)]",
                    "h-[90px] sm:h-[82px] md:h-[100px]",
                    "rounded-lg border bg-white p-2",
                    "min-w-0 overflow-hidden", // 🔵 추가
                    !date && "opacity-60",
                  ].join(" ")}
                >
                  {/* 날짜 */}
                  <div
                    className={[
                      "mb-1 text-xs font-semibold",
                      isToday(date)
                        ? "text-foreground"
                        : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {date ? date.getDate() : ""}
                  </div>

                  {/* 리스트 영역(남은 공간 전부) */}
                  <div className="min-h-0 min-w-0">
                    {/* ✅ 한 번에 최대 2개 보이도록 높이 고정 + 내부 스크롤 */}
                    <div
                      className={[
                        "h-14",
                        "w-full max-w-full min-w-0", // 🔵 추가
                        "overflow-y-auto overflow-x-hidden", // 🔵 가로 스크롤 방지
                        "[scrollbar-gutter:stable]", // 🔹(선택) 스크롤바 자리 미리 확보
                        "pr-1 space-y-1.5",
                        "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40",
                      ].join(" ")}
                    >
                      {dayItems.map((it) => (
                        <button
                          key={it.id}
                          onClick={() => handleOpenDetail(it)}
                          title={it.title}
                          className={[
                            "w-full truncate text-left",
                            "h-6 px-2 rounded-md text-[12px] font-medium leading-5",
                            "cursor-pointer transition",
                            typePillClass[it.type],
                          ].join(" ")}
                        >
                          {it.title}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
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

      {/* 전역 오버레이 모달들 */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="mb-2">일정 등록</DialogTitle>
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

      <Dialog open={openDetail} onOpenChange={setOpenDetail}>
        <DialogContent className="sm:max-w-md">
          {!editMode && selected ? (
            <div className="space-y-3">
              <div className="text-lg font-semibold">{selected.title}</div>
              <Separator />
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">날짜:</span>{" "}
                  {selected.schedule_date}
                </div>
                <div>
                  <span className="font-medium text-foreground">작성자:</span>{" "}
                  {selected.writer_nickname}
                </div>
                <div>
                  <span className="font-medium text-foreground">유형:</span>{" "}
                  {selected.type}
                </div>
              </div>
              <Separator />
              <p className="whitespace-pre-wrap text-[15px]">
                {selected.description}
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setEditMode(true)}
                  className="hover:cursor-pointer"
                >
                  수정
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  className="hover:cursor-pointer"
                >
                  삭제
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
