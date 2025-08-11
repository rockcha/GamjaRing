// src/pages/couple_scheduler.tsx
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

const TYPE_OPTIONS: ScheduleType[] = ["데이트", "기념일", "기타 일정"];

const typeBadgeClass: Record<ScheduleType, string> = {
  데이트: "bg-pink-100 border-pink-300 text-pink-800",
  기념일: "bg-amber-100 border-amber-300 text-amber-800",
  "기타 일정": "bg-blue-100 border-blue-300 text-blue-800",
};

type CoupleLike = { id: string; user1_id: string; user2_id: string };

// 수정 (로컬타임 기준)
function formatYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export default function CoupleSchedulerPage() {
  const { user, isCoupled } = useUser();
  const { couple } = useCoupleContext?.() ?? { couple: null as any };

  const coupleId = couple?.id ?? user?.partner_id ?? null;

  // 파트너 사용자 ID (알림용)
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

  // Create modal/form
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<ScheduleType>("데이트");
  const [newDate, setNewDate] = useState(formatYMD(today));
  const [newDesc, setNewDesc] = useState("");

  // Detail Overlay
  const [showDetail, setShowDetail] = useState(false);
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
    const firstDay = new Date(year, month, 1).getDay(); // 0:Sun
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
    setShowCreate(true);
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
    setShowCreate(false);

    // refresh
    const { data: refreshed } = await getSchedulesByMonth(
      coupleId,
      cursor.getFullYear(),
      cursor.getMonth()
    );
    setItems(refreshed || []);

    // 알림
    if (partnerUserId) {
      await sendUserNotification({
        senderId: user.id,
        receiverId: partnerUserId,
        type: "일정등록",
        description: `${user.nickname}님이 '${newTitle}' 일정을 등록했어요. (${newDate}, ${newType})`,
      });
    }
    // 방금 등록한 항목 선택(선택 사항)
    if (data) {
      setSelected(data);
      setEditMode(false);
      setShowDetail(true);
    }
  };

  const openDetail = (it: CoupleSchedule) => {
    setSelected(it);
    setEditMode(false);
    setEditTitle(it.title);
    setEditType(it.type);
    setEditDate(it.schedule_date);
    setEditDesc(it.description);
    setShowDetail(true);
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
    // local 업데이트
    setItems((prev) =>
      prev.map((x) => (x.id === selected.id ? (data as CoupleSchedule) : x))
    );
    setSelected(data as CoupleSchedule);
    setEditMode(false);

    // 알림
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
    // local 제거
    setItems((prev) => prev.filter((x) => x.id !== selected.id));

    // 알림
    if (partnerUserId) {
      await sendUserNotification({
        senderId: user.id,
        receiverId: partnerUserId,
        type: "일정삭제",
        description: `${user.nickname}님이 '${selected.title}' 일정을 삭제했어요. (${selected.schedule_date})`,
      });
    }

    setShowDetail(false);
    setSelected(null);
  };

  if (!isCoupled || !coupleId) {
    return (
      <SadPotatoGuard
        showRequestButton
        onRequestClick={() => console.log("요청 보내기")}
        hint="상대 닉네임으로 커플 요청을 먼저 완료해주세요"
      />
    );
  }

  return (
    <div className="border-4 border-[#e6d7c6]  rounded-xl bg-amber-50 max-w-5xl mx-auto px-4 py-4 ">
      {/* 헤더 */}
      <div className="text-2xl flex justify-center font-semibold text-[#5b3d1d] mb-2">
        {cursor.getFullYear()}년 {cursor.getMonth() + 1}월
      </div>
      <div className="flex items-center justify-between "></div>
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={goPrevMonth}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          ← 이전달
        </button>

        <button
          onClick={() => handleOpenCreate()}
          className="rounded-xl border  bg-amber-300 px-4 py-2 text-[#3d2b1f] font-medium transition-transform hover:scale-[1.04] active:scale-[0.98]"
        >
          + 일정 추가
        </button>
        <button
          onClick={goNextMonth}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
        >
          다음달 →
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 text-center text-sm font-medium text-[#6b533b] mb-2">
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>

      {/* 달력 그리드 */}
      <div className="grid grid-cols-7 gap-2">
        {daysInMonth.map(({ date }, idx) => {
          const key = date ? formatYMD(date) : `blank-${idx}`;
          const dayItems = date ? itemsByDate.get(formatYMD(date)) ?? [] : [];
          const isToday =
            !!date &&
            date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate();

          return (
            <div
              key={key}
              className={[
                "min-h-[96px] rounded-xl border-2 bg-white p-2 flex flex-col",
                date ? "opacity-100" : "opacity-60 bg-gray-50",
              ].join(" ")}
            >
              {/* 날짜 */}
              <div
                className={[
                  "mb-1 text-xs font-semibold",
                  isToday ? "text-amber-600" : "text-gray-500",
                ].join(" ")}
              >
                {date ? date.getDate() : ""}
              </div>

              {/* 배지 목록 (title만 표시) */}
              <div className="flex flex-col gap-1 overflow-hidden">
                {dayItems.slice(0, 3).map((it) => (
                  <button
                    key={it.id}
                    onClick={() => openDetail(it)}
                    className={[
                      "truncate text-left px-2 py-1 rounded-lg border text-[12px] font-medium",
                      typeBadgeClass[it.type],
                      "hover:brightness-95",
                    ].join(" ")}
                    title={`${it.type} - ${it.title}`}
                  >
                    {it.title}
                  </button>
                ))}
                {dayItems.length > 3 && (
                  <div className="text-[11px] text-gray-500">
                    +{dayItems.length - 3} 더보기
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="mt-4 text-sm text-gray-500">불러오는 중…</div>
      )}

      {/* 생성 모달 */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">일정 등록</h3>
              <button
                onClick={() => setShowCreate(false)}
                className="text-sm text-gray-500 hover:text-black"
              >
                ✕
              </button>
            </div>
            <div className="grid gap-3">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="제목"
                className="w-full rounded-lg border px-3 py-2"
              />
              <div className="flex gap-3">
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as ScheduleType)}
                  className="rounded-lg border px-3 py-2"
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="rounded-lg border px-3 py-2"
                />
              </div>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="설명"
                rows={4}
                className="w-full rounded-lg border px-3 py-2"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleSubmitCreate}
                  className="rounded-lg border px-3 py-1.5 text-sm bg-[#fdf6ee] border-amber-300 hover:brightness-95"
                >
                  등록
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 상세/수정 오버레이 */}
      {showDetail && selected && (
        <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">
                {editMode ? "일정 수정" : "일정 상세"}
              </h3>
              <button
                onClick={() => {
                  setShowDetail(false);
                  setEditMode(false);
                }}
                className="text-sm text-gray-500 hover:text-black"
              >
                ✕
              </button>
            </div>

            {!editMode ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold text-[#3d2b1f]">
                    {selected.title}
                  </div>
                  <div
                    className={[
                      "px-2 py-0.5 rounded-lg border text-xs",
                      typeBadgeClass[selected.type],
                    ].join(" ")}
                  >
                    {selected.type}
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  날짜: {selected.schedule_date}
                </div>
                <div className="text-sm text-gray-600">
                  작성자: {selected.writer_nickname}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-[15px] text-[#3d2b1f]">
                  {selected.description}
                </p>

                <div className="mt-4 flex gap-2 justify-end">
                  <button
                    onClick={() => setEditMode(true)}
                    className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    수정
                  </button>
                  <button
                    onClick={handleDelete}
                    className="rounded-lg border px-3 py-1.5 text-sm text-red-700 border-red-200 hover:bg-red-50"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="제목"
                  className="w-full rounded-lg border px-3 py-2"
                />
                <div className="flex gap-3">
                  <select
                    value={editType}
                    onChange={(e) =>
                      setEditType(e.target.value as ScheduleType)
                    }
                    className="rounded-lg border px-3 py-2"
                  >
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="rounded-lg border px-3 py-2"
                  />
                </div>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="설명"
                  rows={4}
                  className="w-full rounded-lg border px-3 py-2"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleSaveEdit}
                    className="rounded-lg border px-3 py-1.5 text-sm bg-[#fdf6ee] border-amber-300 hover:brightness-95"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
