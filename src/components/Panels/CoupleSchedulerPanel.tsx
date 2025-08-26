// // src/pages/couple_scheduler.tsx
// "use client";

// import { useEffect, useMemo, useState, useRef } from "react";
// import { useUser } from "@/contexts/UserContext";
// import { useCoupleContext } from "@/contexts/CoupleContext";

// import SadPotatoGuard from "@/components/SadPotatoGuard";
// import {
//   createCoupleSchedule,
//   deleteCoupleSchedule,
//   getSchedulesByMonth,
//   updateCoupleSchedule,
//   type CoupleSchedule,
//   type ScheduleType,
// } from "@/utils/coupleScheduler";
// import { sendUserNotification } from "@/utils/notification/sendUserNotification";

// // ✅ shadcn/ui
// import { Button } from "../ui/button";
// import { Card, CardContent } from "../ui/card";
// import { Input } from "../ui/input";
// import { Textarea } from "../ui/textarea";
// import {
//   Select,
//   SelectTrigger,
//   SelectContent,
//   SelectItem,
//   SelectValue,
// } from "../ui/select";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogFooter,
//   DialogClose,
// } from "../ui/dialog";
// import { Separator } from "../ui/separator";
// import { ScrollArea } from "../ui/scroll-area";

// import { DialogPortal, DialogOverlay } from "../ui/dialog";
// import * as DialogPrimitive from "@radix-ui/react-dialog";

// // ✅ icons
// import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";

// const TYPE_OPTIONS: ScheduleType[] = ["데이트", "기념일", "기타 일정"];

// // 제목 버튼 색상(타입별)
// const typePillClass: Record<ScheduleType, string> = {
//   데이트:
//     "bg-pink-100 border border-pink-200 text-pink-900 hover:bg-pink-100/90",
//   기념일:
//     "bg-amber-100 border border-amber-200 text-amber-900 hover:bg-amber-100/90",
//   "기타 일정":
//     "bg-blue-100 border border-blue-200 text-blue-900 hover:bg-blue-100/90",
// };

// // 로컬타임 YYYY-MM-DD
// function formatYMD(d: Date) {
//   const y = d.getFullYear();
//   const m = String(d.getMonth() + 1).padStart(2, "0");
//   const day = String(d.getDate()).padStart(2, "0");
//   return `${y}-${m}-${day}`;
// }

// type CoupleLike = { id: string; user1_id: string; user2_id: string };

//   const { user, isCoupled } = useUser();
//   const { couple } = useCoupleContext?.() ?? { couple: null as any };
//   const coupleId = couple?.id ?? user?.partner_id ?? null;

//   const partnerUserId = useMemo(() => {
//     const c = couple as CoupleLike | null;
//     if (!c || !user) return null;
//     return c.user1_id === user.id ? c.user2_id : c.user1_id;
//   }, [couple, user]);

//   const today = new Date();
//   const [cursor, setCursor] = useState(
//     new Date(today.getFullYear(), today.getMonth(), 1)
//   );
//   const [items, setItems] = useState<CoupleSchedule[]>([]);
//   const [loading, setLoading] = useState(false);

//   // Create dialog
//   const [openCreate, setOpenCreate] = useState(false);
//   const [newTitle, setNewTitle] = useState("");
//   const [newType, setNewType] = useState<ScheduleType>("데이트");
//   const [newDate, setNewDate] = useState(formatYMD(today));
//   const [newDesc, setNewDesc] = useState("");

//   // Detail dialog
//   const [openDetail, setOpenDetail] = useState(false);
//   const [selected, setSelected] = useState<CoupleSchedule | null>(null);
//   const [editMode, setEditMode] = useState(false);
//   const [editTitle, setEditTitle] = useState("");
//   const [editType, setEditType] = useState<ScheduleType>("데이트");
//   const [editDate, setEditDate] = useState(formatYMD(today));
//   const [editDesc, setEditDesc] = useState("");

//   const rootRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     if (!coupleId) return;
//     (async () => {
//       setLoading(true);
//       const { data, error } = await getSchedulesByMonth(
//         coupleId,
//         cursor.getFullYear(),
//         cursor.getMonth()
//       );
//       if (!error) setItems(data);
//       setLoading(false);
//     })();
//   }, [coupleId, cursor]);

//   const daysInMonth = useMemo(() => {
//     const year = cursor.getFullYear();
//     const month = cursor.getMonth();
//     const firstDay = new Date(year, month, 1).getDay();
//     const lastDate = new Date(year, month + 1, 0).getDate();

//     const cells: Array<{ date: Date | null }> = [];
//     for (let i = 0; i < firstDay; i++) cells.push({ date: null });
//     for (let d = 1; d <= lastDate; d++)
//       cells.push({ date: new Date(year, month, d) });
//     while (cells.length % 7 !== 0) cells.push({ date: null });
//     return cells;
//   }, [cursor]);

//   const itemsByDate = useMemo(() => {
//     const map = new Map<string, CoupleSchedule[]>();
//     for (const it of items) {
//       const k = it.schedule_date;
//       if (!map.has(k)) map.set(k, []);
//       map.get(k)!.push(it);
//     }
//     return map;
//   }, [items]);

//   const goPrevMonth = () =>
//     setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
//   const goNextMonth = () =>
//     setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));

//   const handleOpenCreate = (date?: string) => {
//     setNewTitle("");
//     setNewType("데이트");
//     setNewDate(date ?? formatYMD(today));
//     setNewDesc("");
//     setOpenCreate(true);
//   };

//   const handleSubmitCreate = async () => {
//     if (!user || !coupleId) return;
//     const { error, data } = await createCoupleSchedule({
//       coupleId,
//       writerId: user.id,
//       writerNickname: user.nickname,
//       title: newTitle.trim(),
//       type: newType,
//       description: newDesc.trim(),
//       scheduleDate: newDate,
//     });
//     if (error) {
//       alert(error.message);
//       return;
//     }
//     setOpenCreate(false);

//     const { data: refreshed } = await getSchedulesByMonth(
//       coupleId,
//       cursor.getFullYear(),
//       cursor.getMonth()
//     );
//     setItems(refreshed || []);

//     if (partnerUserId) {
//       await sendUserNotification({
//         senderId: user.id,
//         receiverId: partnerUserId,
//         type: "일정등록",
//         description: `${user.nickname}님이 '${newTitle}' 일정을 등록했어요. (${newDate}, ${newType})`,
//       });
//     }

//     if (data) {
//       setSelected(data);
//       setEditMode(false);
//       setOpenDetail(true);
//     }
//   };

//   const handleOpenDetail = (it: CoupleSchedule) => {
//     setSelected(it);
//     setEditMode(false);
//     setEditTitle(it.title);
//     setEditType(it.type);
//     setEditDate(it.schedule_date);
//     setEditDesc(it.description);
//     setOpenDetail(true);
//   };

//   const handleSaveEdit = async () => {
//     if (!selected || !user) return;
//     const { error, data } = await updateCoupleSchedule({
//       id: selected.id,
//       title: editTitle.trim(),
//       type: editType,
//       description: editDesc.trim(),
//       scheduleDate: editDate,
//     });
//     if (error) {
//       alert(error.message);
//       return;
//     }
//     setItems((prev) =>
//       prev.map((x) => (x.id === selected.id ? (data as CoupleSchedule) : x))
//     );
//     setSelected(data as CoupleSchedule);
//     setEditMode(false);

//     if (partnerUserId) {
//       await sendUserNotification({
//         senderId: user.id,
//         receiverId: partnerUserId,
//         type: "일정수정",
//         description: `${user.nickname}님이 '${editTitle}' 일정을 수정했어요. (${editDate}, ${editType})`,
//       });
//     }
//   };

//   const handleDelete = async () => {
//     if (!selected || !user) return;
//     if (!confirm("정말 삭제할까요?")) return;
//     const { error } = await deleteCoupleSchedule(selected.id);
//     if (error) {
//       alert(error.message);
//       return;
//     }
//     setItems((prev) => prev.filter((x) => x.id !== selected.id));

//     if (partnerUserId) {
//       await sendUserNotification({
//         senderId: user.id,
//         receiverId: partnerUserId,
//         type: "일정삭제",
//         description: `${user.nickname}님이 '${
//           selected!.title
//         }' 일정을 삭제했어요. (${selected!.schedule_date})`,
//       });
//     }

//     setOpenDetail(false);
//     setSelected(null);
//   };

//   if (!isCoupled || !coupleId) {
//     return (
//       <SadPotatoGuard
//         showRequestButton
//         onRequestClick={() => console.log("요청 보내기")}
//         hint="상대 닉네임으로 커플 요청을 먼저 완료해주세요"
//       />
//     );
//   }

//   const isToday = (date?: Date | null) =>
//     !!date &&
//     date.getFullYear() === today.getFullYear() &&
//     date.getMonth() === today.getMonth() &&
//     date.getDate() === today.getDate();

//   return (
//     <div ref={rootRef} className="mx-auto max-w-5xl relative isolate">
//       {/* 달력 카드 */}
//       <Card className="rounded-xl border-amber-200 bg-amber-50">
//         <CardContent className="p-4 sm:p-6">
//           {/* 헤더 */}
//           <div className="mb-4 flex items-center justify-center gap-10">
//             <Button
//               variant="ghost"
//               onClick={goPrevMonth}
//               className="gap-2 cursor-pointer"
//             >
//               <ChevronLeft className="h-4 w-4" />
//               이전달
//             </Button>

//             <div className="flex flex-col items-center">
//               <div className="mb-2 text-center text-2xl font-semibold text-amber-900">
//                 {cursor.getFullYear()}년 {cursor.getMonth() + 1}월
//               </div>
//               {/* 중앙의 추가 버튼 제거 (FAB로 대체) */}
//             </div>

//             <Button
//               variant="ghost"
//               onClick={goNextMonth}
//               className="gap-2 cursor-pointer"
//             >
//               다음달
//               <ChevronRight className="h-4 w-4" />
//             </Button>
//           </div>

//           {/* 요일 헤더 */}
//           <div className="mb-2 grid grid-cols-7 text-center text-sm font-medium text-amber-800">
//             {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
//               <div key={d} className="py-2">
//                 {d}
//               </div>
//             ))}
//           </div>

//           {/* 달력 그리드 */}
//           <div className="grid grid-cols-7 gap-2">
//             {daysInMonth.map(({ date }, idx) => {
//               const key = date ? formatYMD(date) : `blank-${idx}`;
//               const dayItems = date
//                 ? itemsByDate.get(formatYMD(date)) ?? []
//                 : [];

//               return (
//                 <div
//                   key={key}
//                   className={[
//                     "min-h-[112px] rounded-lg border bg-white p-2",
//                     !date && "opacity-60 bg-muted",
//                   ].join(" ")}
//                 >
//                   {/* 날짜 */}
//                   <div
//                     className={[
//                       "mb-2 text-xs font-semibold",
//                       isToday(date)
//                         ? "text-amber-600"
//                         : "text-muted-foreground",
//                     ].join(" ")}
//                   >
//                     {date ? date.getDate() : ""}
//                   </div>

//                   {/* 일정 목록(제목만, 타입색 배경 버튼) */}
//                   <ScrollArea className="h-[84px]">
//                     <div className="flex flex-col items-center gap-1 pr-1">
//                       {dayItems.slice(0, 4).map((it) => (
//                         <button
//                           key={it.id}
//                           onClick={() => handleOpenDetail(it)}
//                           className={[
//                             "w-[100px] block min-w-0 truncate text-left px-2 py-1 rounded-md text-[12px] font-medium",
//                             "cursor-pointer transition",
//                             typePillClass[it.type],
//                           ].join(" ")}
//                           title={it.title}
//                         >
//                           {it.title}
//                         </button>
//                       ))}
//                       {dayItems.length > 4 && (
//                         <div className="pl-2 text-[11px] text-muted-foreground">
//                           +{dayItems.length - 4} 더보기
//                         </div>
//                       )}
//                     </div>
//                   </ScrollArea>
//                 </div>
//               );
//             })}
//           </div>

//           {/* 로딩 */}
//           {loading && (
//             <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
//               <Loader2 className="h-4 w-4 animate-spin" />
//               불러오는 중…
//             </div>
//           )}
//         </CardContent>
//       </Card>

//       {/* ✅ 우측 하단 FAB(추가) */}
//       <Button
//         onClick={() => handleOpenCreate()}
//         size="icon"
//         className="absolute top-6 right-6 h-10 w-10 rounded-full shadow-lg cursor-pointer bg-amber-800 hover:bg-amber-700"
//         title="일정 추가"
//       >
//         <Plus className="h-6 w-6" />
//       </Button>

//       {/* 생성 다이얼로그 - z 보강 */}
//       <Dialog open={openCreate} onOpenChange={setOpenCreate}>
//         <DialogPortal container={rootRef.current}>
//           <DialogOverlay className="absolute inset-0 bg-black/40" />
//           <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[1000] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg outline-none">
//             <DialogHeader>
//               <DialogTitle className="mb-4">일정 등록 🪶</DialogTitle>
//             </DialogHeader>

//             <div className="grid gap-3">
//               <Input
//                 value={newTitle}
//                 onChange={(e) => setNewTitle(e.target.value)}
//                 placeholder="제목"
//               />

//               <div className="flex gap-3">
//                 <Select
//                   value={newType}
//                   onValueChange={(v) => setNewType(v as ScheduleType)}
//                 >
//                   <SelectTrigger className="w-40 cursor-pointer">
//                     <SelectValue placeholder="유형" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {TYPE_OPTIONS.map((t) => (
//                       <SelectItem key={t} value={t} className="cursor-pointer">
//                         {t}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>

//                 <Input
//                   type="date"
//                   value={newDate}
//                   onChange={(e) => setNewDate(e.target.value)}
//                   className="flex-1"
//                 />
//               </div>

//               <Textarea
//                 value={newDesc}
//                 onChange={(e) => setNewDesc(e.target.value)}
//                 placeholder="설명"
//                 rows={4}
//               />
//             </div>

//             <DialogFooter className="mt-2">
//               <DialogClose asChild>
//                 <Button variant="outline" className="cursor-pointer">
//                   취소
//                 </Button>
//               </DialogClose>
//               <Button onClick={handleSubmitCreate} className="cursor-pointer">
//                 등록
//               </Button>
//             </DialogFooter>
//           </DialogPrimitive.Content>
//         </DialogPortal>
//       </Dialog>

//       {/* 상세/수정 다이얼로그 - z 보강 */}
//       <Dialog open={openDetail} onOpenChange={setOpenDetail}>
//         <DialogPortal container={rootRef.current}>
//           <DialogOverlay className="absolute inset-0 bg-black/40 z-[900]" />
//           <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[1000] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg outline-none">
//             {!editMode && selected ? (
//               <div className="space-y-3">
//                 <div className="flex items-center gap-2">
//                   <div className="text-lg font-semibold">{selected.title}</div>
//                 </div>

//                 <Separator />
//                 <div className="space-y-1 text-sm text-muted-foreground">
//                   <div>
//                     <span className="font-medium text-foreground">날짜:</span>{" "}
//                     {selected.schedule_date}
//                   </div>
//                   <div>
//                     <span className="font-medium text-foreground">작성자:</span>{" "}
//                     {selected.writer_nickname}
//                   </div>
//                   <div>
//                     <span className="font-medium text-foreground">유형:</span>{" "}
//                     {selected.type}
//                   </div>
//                 </div>

//                 <Separator />
//                 <p className="whitespace-pre-wrap text-[15px]">
//                   {selected.description}
//                 </p>

//                 <div className="flex justify-end gap-2 pt-2">
//                   <Button
//                     variant="outline"
//                     onClick={() => setEditMode(true)}
//                     className="cursor-pointer"
//                   >
//                     수정
//                   </Button>
//                   <Button
//                     variant="destructive"
//                     onClick={handleDelete}
//                     className="cursor-pointer"
//                   >
//                     삭제
//                   </Button>
//                 </div>
//               </div>
//             ) : (
//               selected && (
//                 <div className="grid gap-3">
//                   <Input
//                     value={editTitle}
//                     onChange={(e) => setEditTitle(e.target.value)}
//                     placeholder="제목"
//                   />

//                   <div className="flex gap-3">
//                     <Select
//                       value={editType}
//                       onValueChange={(v) => setEditType(v as ScheduleType)}
//                     >
//                       <SelectTrigger className="w-40 cursor-pointer">
//                         <SelectValue placeholder="유형" />
//                       </SelectTrigger>
//                       <SelectContent>
//                         {TYPE_OPTIONS.map((t) => (
//                           <SelectItem
//                             key={t}
//                             value={t}
//                             className="cursor-pointer"
//                           >
//                             {t}
//                           </SelectItem>
//                         ))}
//                       </SelectContent>
//                     </Select>

//                     <Input
//                       type="date"
//                       value={editDate}
//                       onChange={(e) => setEditDate(e.target.value)}
//                       className="flex-1"
//                     />
//                   </div>

//                   <Textarea
//                     value={editDesc}
//                     onChange={(e) => setEditDesc(e.target.value)}
//                     placeholder="설명"
//                     rows={4}
//                   />

//                   <div className="flex justify-end gap-2">
//                     <Button onClick={handleSaveEdit} className="cursor-pointer">
//                       저장
//                     </Button>
//                     <Button
//                       variant="outline"
//                       onClick={() => setEditMode(false)}
//                       className="cursor-pointer"
//                     >
//                       취소
//                     </Button>
//                   </div>
//                 </div>
//               )
//             )}
//           </DialogPrimitive.Content>
//         </DialogPortal>
//       </Dialog>
//     </div>
//   );
// }
