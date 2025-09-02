// src/components/MyPartnerAnswersCard.tsx
import { useEffect, useState, useRef, useCallback } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { GetQuestionById } from "@/utils/GetQuestionById";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Separator } from "./ui/separator";

import { sendUserNotification } from "@/utils/notification/sendUserNotification";

interface AnswerItem {
  question_id: number;
  content: string;
  created_at: string;
  emoji_type_id: number | null; // ✅ 추가
}
interface AnswerWithQuestion extends AnswerItem {
  questionText: string;
}

type EmojiRow = { id: number; char: string };

const ITEMS_PER_PAGE = 4;

export default function MyPartnerAnswersCard() {
  const { user } = useUser();

  const [answers, setAnswers] = useState<AnswerWithQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // emoji id -> char 매핑(리스트 표시용)
  const [emojiMap, setEmojiMap] = useState<Record<number, string>>({});

  // dialog
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupTitle, setPopupTitle] = useState("");
  const [popupContent, setPopupContent] = useState("");
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null);

  // reaction dropdown
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojis, setEmojis] = useState<EmojiRow[]>([]);
  const emojiBtnRef = useRef<HTMLButtonElement | null>(null);
  const emojiMenuRef = useRef<HTMLDivElement | null>(null);

  // 파트너 답변 불러오기 (+ 이모지 매핑 로드)
  useEffect(() => {
    const fetchPartnerAnswers = async () => {
      if (!user?.partner_id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("answer")
        .select("question_id, content, created_at, emoji_type_id") // ✅ emoji_type_id 함께 조회
        .eq("user_id", user.partner_id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ 파트너 답변 불러오기 실패:", error.message);
        setLoading(false);
        return;
      }

      const enriched = await Promise.all(
        (data ?? []).map(async (item) => {
          const questionText = await GetQuestionById(item.question_id);
          return { ...item, questionText: questionText ?? "" };
        })
      );

      setAnswers(enriched);
      setCurrentPage(1);
      setLoading(false);

      // ✅ 이모지 매핑 로드
      const ids = Array.from(
        new Set(
          (data ?? [])
            .map((r) => r.emoji_type_id)
            .filter((v): v is number => typeof v === "number")
        )
      );
      if (ids.length) {
        const { data: emojiRows, error: eErr } = await supabase
          .from("emoji_type")
          .select("id, char")
          .in("id", ids);
        if (!eErr && emojiRows) {
          const map: Record<number, string> = {};
          for (const row of emojiRows) map[row.id] = row.char;
          setEmojiMap((prev) => ({ ...prev, ...map }));
        }
      }
    };

    fetchPartnerAnswers();
  }, [user?.partner_id]);

  // 모달 처음 열릴 때 전체 이모지 목록 로드(이미 있으면 스킵)
  useEffect(() => {
    const fetchEmojis = async () => {
      if (!popupOpen) return;
      if (emojis.length > 0) return;
      const { data, error } = await supabase
        .from("emoji_type")
        .select("id, char")
        .order("id", { ascending: true });
      if (!error && data) setEmojis(data as EmojiRow[]);
    };
    fetchEmojis();
  }, [popupOpen, emojis.length]);

  // 외부 클릭/ESC 시 드롭다운 닫기
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        emojiOpen &&
        !emojiBtnRef.current?.contains(t) &&
        !emojiMenuRef.current?.contains(t)
      ) {
        setEmojiOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (emojiOpen && e.key === "Escape") setEmojiOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [emojiOpen]);

  const totalPages = Math.max(1, Math.ceil(answers.length / ITEMS_PER_PAGE));
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentAnswers = answers.slice(start, start + ITEMS_PER_PAGE);

  // createdAt: UTC → KST 비교/표시
  const getFormattedDate = (createdAt: string) => {
    const tz = "Asia/Seoul";
    const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: tz });
    const createdDateStr = new Date(createdAt).toLocaleDateString("sv-SE", {
      timeZone: tz,
    });
    const isToday = todayStr === createdDateStr;

    const formattedDate = new Date(createdAt).toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
      timeZone: tz,
    });

    return { isToday, formattedDate };
  };

  const refreshSingleEmoji = useCallback(
    async (emojiId: number) => {
      // 저장 직후 바로 맵에 없을 수 있으니 단건 보강
      if (emojiMap[emojiId]) return;
      const { data, error } = await supabase
        .from("emoji_type")
        .select("id,char")
        .eq("id", emojiId)
        .maybeSingle();
      if (!error && data) {
        setEmojiMap((prev) => ({ ...prev, [data.id]: data.char }));
      }
    },
    [emojiMap]
  );

  // 로딩 스켈레톤
  if (loading) {
    return (
      <Card className="h-[420px] flex flex-col">
        <CardContent className="flex-1 space-y-3 overflow-hidden pt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
        <CardFooter className="justify-center gap-2 pb-6">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </CardFooter>
      </Card>
    );
  }

  return (
    <>
      <div className="h-[420px] flex flex-col">
        <CardContent className="flex-1 overflow-y-auto space-y-2 ">
          {currentAnswers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              아직 파트너의 답변이 없습니다.
            </p>
          ) : (
            currentAnswers.map((item) => {
              const { isToday, formattedDate } = getFormattedDate(
                item.created_at
              );
              const emojiChar =
                item.emoji_type_id != null
                  ? emojiMap[item.emoji_type_id]
                  : null;

              return (
                <button
                  key={`${item.question_id}-${item.created_at}`}
                  onClick={() => {
                    setPopupTitle(item.questionText);
                    setPopupContent(item.content);
                    setActiveQuestionId(item.question_id);
                    setPopupOpen(true);
                  }}
                  className="relative w-full text-left p-4 bg-rose-50 border rounded-md hover:bg-rose-100 transition focus:outline-none"
                >
                  {/* ✅ 우상단 반응 배지 */}
                  <div className="absolute top-2 right-2 pointer-events-none">
                    {emojiChar ? (
                      <div className="h-8 w-8 grid place-items-center rounded-full bg-white border shadow text-lg">
                        {emojiChar}
                      </div>
                    ) : (
                      <div className="h-8 w-8 grid place-items-center rounded-full bg-white border shadow">
                        <span className="text-[10px] text-muted-foreground"></span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-muted-foreground">
                      {formattedDate}
                    </span>
                    {isToday && (
                      <span className="text-[10px] text-pink-500 font-bold animate-pulse">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground font-medium truncate">
                    {item.questionText}
                  </p>
                </button>
              );
            })
          )}
        </CardContent>

        <CardFooter className="justify-between gap-2 flex-wrap">
          {/* Prev */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 h-8 shrink-0"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Prev
          </Button>

          {/* 가운데: 모바일은 간단 표기, 데스크톱은 페이지 버튼 나열 */}
          <div className="order-last w-full flex justify-center sm:order-none sm:w-auto">
            {/* 데스크톱: 번호 버튼 */}
            <div className="hidden sm:flex items-center gap-1 overflow-x-auto max-w-[70vw] px-1">
              {Array.from({ length: totalPages }, (_, i) => {
                const page = i + 1;
                const active = currentPage === page;
                return (
                  <Button
                    key={page}
                    size="sm"
                    variant={active ? "secondary" : "outline"}
                    onClick={() => setCurrentPage(page)}
                    className={`h-8 px-3 shrink-0 ${active ? "font-bold" : ""}`}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>

            {/* 모바일: 컴팩트 표기 */}
            <div className="sm:hidden text-xs text-muted-foreground">
              {currentPage} / {totalPages}
            </div>
          </div>

          {/* Next */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 h-8 shrink-0"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardFooter>
      </div>

      {/* Dialog */}
      <Dialog
        open={popupOpen}
        onOpenChange={(v) => {
          setPopupOpen(v);
          if (!v) {
            setEmojiOpen(false);
            setActiveQuestionId(null);
          }
        }}
      >
        <DialogOverlay className="bg-black/10 backdrop-blur-[2px]" />
        <DialogContent className=" sm:max-w-2xl max-w-[92vw]">
          <DialogHeader>
            <div className="flex justify-center">
              <DialogTitle className="text-base font-semibold leading-6">
                {popupTitle}
              </DialogTitle>
            </div>
          </DialogHeader>
          <Separator />
          <div className="ml-4 mt-2 max-h-[70vh] overflow-auto whitespace-pre-wrap text-sm leading-6 text-foreground/80">
            {popupContent}
          </div>

          <DialogFooter className="mt-4 flex items-center justify-between">
            {/* ✅ 반응 추가하기 (좌측) */}
            <div className="relative">
              <Button
                ref={emojiBtnRef}
                type="button"
                variant="outline"
                className="hover:cursor-pointer active:scale-95 transition"
                onClick={() => setEmojiOpen((o) => !o)}
                disabled={activeQuestionId === null || !user?.partner_id}
              >
                반응 추가하기
              </Button>

              {emojiOpen && (
                <div
                  ref={emojiMenuRef}
                  className="absolute bottom-11 left-0 z-50 w-[260px] rounded-lg border bg-white p-3 shadow-xl"
                >
                  {/* 4×4 그리드 */}
                  <div className="grid grid-cols-4 gap-2">
                    {emojis.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        className="h-11 w-full rounded-md border bg-white hover:bg-rose-50 hover:shadow active:scale-95 transition text-2xl flex items-center justify-center hover:cursor-pointer"
                        title={`${e.char} 선택`}
                        onClick={async () => {
                          if (
                            activeQuestionId == null ||
                            !user?.partner_id ||
                            !user?.id
                          )
                            return;

                          // ✅ partner의 해당 답변에 emoji_type_id 설정/업데이트
                          const { error: upErr } = await supabase
                            .from("answer")
                            .update({ emoji_type_id: e.id })
                            .eq("user_id", user.partner_id)
                            .eq("question_id", activeQuestionId);

                          if (upErr) {
                            console.error("❌ 반응 저장 실패:", upErr.message);
                            open("반응 저장에 실패했어요.");
                            setEmojiOpen(false);
                            return;
                          }

                          // 리스트 데이터도 즉시 반영 (UI 갱신)
                          setAnswers((prev) =>
                            prev.map((row) =>
                              row.question_id === activeQuestionId
                                ? { ...row, emoji_type_id: e.id }
                                : row
                            )
                          );
                          await refreshSingleEmoji(e.id);

                          // ✅ 알림 전송
                          await sendUserNotification({
                            senderId: user.id,
                            receiverId: user.partner_id,
                            type: "반응추가",
                            description: `${user.nickname}님이 ${e.char}로 반응했어요`, // 방금 저장한 이모지
                            isRequest: false,
                          });

                          open(`반응을 추가했어요: ${e.char}`);
                          setEmojiOpen(false);
                        }}
                      >
                        {e.char}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 닫기 (우측) */}
            <Button variant="secondary" onClick={() => setPopupOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
