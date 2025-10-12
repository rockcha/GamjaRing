// src/components/MyAnswersCard.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AnswerItem {
  question_id: number;
  content: string;
  created_at: string;
  emoji_type_id: number | null; // ✅ 이모지 FK
}
interface AnswerWithQuestion extends AnswerItem {
  questionText: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

const ITEMS_PER_PAGE = 5;

/** 미니멀 페이지 버튼: [1, (…,) current, (…,) last]
 * - current가 1 또는 last와 인접하면 해당 쪽 점3 생략
 * - 항상 한 줄 유지(렌더에서 whitespace-nowrap 적용)
 */
function getMinimalPageItems(
  totalPages: number,
  currentPage: number
): Array<number | "..."> {
  if (totalPages <= 1) return [1];
  const first = 1;
  const last = totalPages;

  const leftDots = currentPage > first + 1;
  const rightDots = currentPage < last - 1;

  const items: Array<number | "..."> = [first];

  if (leftDots) items.push("...");
  if (currentPage !== first && currentPage !== last) items.push(currentPage);
  if (rightDots) items.push("...");

  if (last !== first) items.push(last);

  return items;
}

export default function MyAnswersCard() {
  const { user } = useUser();

  const [answers, setAnswers] = useState<AnswerWithQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // dialog
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupTitle, setPopupTitle] = useState("");
  const [popupContentRO, setPopupContentRO] = useState(""); // 보기용 원본
  const [editing, setEditing] = useState(false);

  // 편집 타깃 (질문/답변)
  const [activeQid, setActiveQid] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 저장 상태
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimerRef = useRef<number | null>(null);

  // ✅ 이모지 id -> 문자 맵 (뷰용)
  const [emojiMap, setEmojiMap] = useState<Record<number, string>>({});

  // ─────────────────────────────────────────────────────────────
  // 데이터 로드
  useEffect(() => {
    const fetchMyAnswers = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("answer")
        .select("question_id, content, created_at, emoji_type_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ 내 답변 불러오기 실패:", error.message);
        setLoading(false);
        return;
      }

      // 이모지 목록(뷰용 맵)
      const { data: emojiRows, error: emojiErr } = await supabase
        .from("emoji_type")
        .select("id, char")
        .order("id");

      if (!emojiErr && emojiRows) {
        const map: Record<number, string> = {};
        for (const row of emojiRows) map[row.id] = row.char;
        setEmojiMap(map);
      } else {
        setEmojiMap({});
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
    };

    fetchMyAnswers();

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [user?.id]);

  // ─────────────────────────────────────────────────────────────
  // 페이지네이션/날짜 포맷
  const totalPages = Math.max(1, Math.ceil(answers.length / ITEMS_PER_PAGE));
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentAnswers = answers.slice(start, start + ITEMS_PER_PAGE);

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

  // ✅ 미니멀 페이지 아이템 (항상 한 줄)
  const pageItems = useMemo(
    () => getMinimalPageItems(totalPages, currentPage),
    [totalPages, currentPage]
  );

  // ─────────────────────────────────────────────────────────────
  // 팝업 열기
  const openPopup = (item: AnswerWithQuestion) => {
    setActiveQid(item.question_id);
    setPopupTitle(item.questionText);
    setPopupContentRO(item.content);
    setEditContent(item.content);
    setEditing(false);
    setPopupOpen(true);
  };

  // 저장 (upsert)
  const persistAnswer = useCallback(
    async (content: string) => {
      if (!user?.id) return false;
      if (activeQid == null) return false;

      setSaveStatus("saving");
      try {
        const { error } = await supabase.from("answer").upsert(
          [
            {
              user_id: user.id,
              question_id: activeQid,
              content,
            },
          ],
          { onConflict: "user_id,question_id" }
        );

        if (error) throw error;

        setSaveStatus("saved");
        if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(
          () => setSaveStatus("idle"),
          1200
        );

        toast.success("수정했습니다.");

        // 로컬 리스트도 동기화
        setAnswers((prev) =>
          prev.map((a) =>
            a.question_id === activeQid
              ? {
                  ...a,
                  content,
                }
              : a
          )
        );
        setPopupContentRO(content);
        return true;
      } catch (e) {
        setSaveStatus("error");
        if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(
          () => setSaveStatus("idle"),
          1800
        );
        toast.error("저장 실패 — 잠시 후 다시 시도해주세요.");
        return false;
      }
    },
    [activeQid, user?.id]
  );

  // ─────────────────────────────────────────────────────────────
  // 로딩 스켈레톤
  if (loading) {
    return (
      <Card className="h-[540px] flex flex-col">
        <CardContent className="flex-1 space-y-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
        <CardFooter className="justify-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </CardFooter>
      </Card>
    );
  }

  // ─────────────────────────────────────────────────────────────
  return (
    <>
      <div className="h-[540px] flex flex-col">
        <CardContent className="flex-1 overflow-y-auto space-y-2">
          {currentAnswers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              아직 내 답변이 없습니다.
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
                  onClick={() => openPopup(item)}
                  className="relative w-full text-left bg-amber-50 border rounded-md p-4 hover:bg-amber-100 transition focus:outline-none"
                >
                  {/* ✅ 우상단 이모지/없음 배지 */}
                  <div className="absolute top-2 right-2 pointer-events-none">
                    {item.emoji_type_id == null ? (
                      <div className="h-8 w-8 grid place-items-center rounded-full bg-[#FAF7F2] border shadow">
                        <span className="text-[10px] text-muted-foreground"></span>
                      </div>
                    ) : (
                      <div className="h-8 w-8 grid place-items-center rounded-full bg-[#FAF7F2] border shadow text-lg">
                        {emojiChar ?? "…"}
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

          {/* 가운데: 항상 한 줄(개행 금지) + 미니멀 */}
          <div className="order-last w-full sm:order-none sm:w-auto">
            <nav
              aria-label="페이지 네비게이션"
              className="flex items-center justify-center sm:justify-start"
            >
              <div className="inline-flex items-center gap-1 whitespace-nowrap">
                {pageItems.map((p, idx) =>
                  p === "..." ? (
                    <span
                      key={`dots-${idx}`}
                      className="inline-flex h-8 min-w-8 items-center justify-center text-muted-foreground px-2 select-none"
                      aria-hidden
                    >
                      …
                    </span>
                  ) : (
                    <Button
                      key={p}
                      size="sm"
                      variant={currentPage === p ? "secondary" : "outline"}
                      onClick={() => typeof p === "number" && setCurrentPage(p)}
                      disabled={currentPage === p}
                      className={`h-8 px-3 ${
                        currentPage === p ? "font-bold" : ""
                      }`}
                      aria-current={currentPage === p ? "page" : undefined}
                      aria-label={`페이지 ${p}`}
                    >
                      {p}
                    </Button>
                  )
                )}
              </div>
            </nav>
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

      {/* Dialog — 보기/수정 */}
      <Dialog
        open={popupOpen}
        onOpenChange={(o) => {
          setPopupOpen(o);
          if (!o) {
            setEditing(false);
            setSaveStatus("idle");
          }
        }}
      >
        <DialogOverlay className="bg-black/10 backdrop-blur-[2px]" />
        <DialogContent className="sm:max-w-2xl max-w-[92vw]">
          <DialogHeader>
            <div className="flex justify-center">
              <DialogTitle className="text-base font-semibold leading-6">
                {popupTitle}
              </DialogTitle>
            </div>
          </DialogHeader>
          <Separator />

          {/* 상태 라벨 */}
          {editing ? (
            <div className="mt-2 mb-1 flex items-center gap-2 text-xs text-amber-800">
              <CheckCircle2 className="h-4 w-4" />
              <span>수정 모드</span>
            </div>
          ) : null}

          {/* 본문 */}
          {editing ? (
            <Textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              readOnly={saveStatus === "saving"}
              className={cn(
                "min-h-[220px] md:min-h-[260px] resize-none rounded-xl",
                "bg-[linear-gradient(transparent_29px,rgba(0,0,0,0.04)_30px)] bg-[length:100%_30px] bg-blue-50/40",
                "border border-amber-200/70 focus-visible:ring-2 focus-visible:ring-amber-100",
                "px-4 py-3 text-[15px] md:text-[16px] leading-[30px]"
              )}
              placeholder="이곳에 내용을 입력하세요…"
            />
          ) : (
            <div className="ml-1 mt-2 max-h-[70vh] overflow-auto whitespace-pre-wrap text-sm leading-6 text-foreground/80">
              {popupContentRO}
            </div>
          )}

          <DialogFooter className="mt-4 gap-2">
            {!editing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(true);
                    requestAnimationFrame(() => textareaRef.current?.focus());
                  }}
                >
                  수정하기
                </Button>
                <Button variant="secondary" onClick={() => setPopupOpen(false)}>
                  닫기
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={async () => {
                    const trimmed = editContent.trim();
                    if (!trimmed) return;
                    const ok = await persistAnswer(trimmed);
                    if (!ok) return;
                    setEditing(false);
                  }}
                  disabled={saveStatus === "saving"}
                  className="min-w-[120px] bg-neutral-700 hover:bg-amber-600 text-white"
                >
                  {saveStatus === "saving" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 저장 중…
                    </>
                  ) : (
                    <>저장하기</>
                  )}
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => setPopupOpen(false)}
                  disabled={saveStatus === "saving"}
                >
                  닫기
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
