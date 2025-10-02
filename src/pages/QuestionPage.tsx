// src/pages/QuestionPage.tsx
"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { GetQuestionById } from "@/utils/GetQuestionById";
import { useUser } from "@/contexts/UserContext";
import { useCompleteTask } from "@/utils/tasks/CompleteTask";
import { cn } from "@/lib/utils";

import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import supabase from "@/lib/supabase";

// shadcn/ui
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import AvatarWidget from "@/components/widgets/AvatarWidget";

// icons
import { Loader2, CheckCircle2 } from "lucide-react";

const EMOJIS_5x6 = [
  "😀",
  "😁",
  "😂",
  "🤣",
  "😄",
  "😅",
  "😆",
  "😉",
  "😊",
  "😋",
  "😎",
  "😍",
  "🥰",
  "😘",
  "😗",
  "😙",
  "😚",
  "🙂",
  "🤗",
  "🤩",
  "🤔",
  "😏",
  "😮",
  "😢",
  "🥺",
  "❤️",
  "🧡",
  "💛",
  "💚",
  "💙",
] as const;

type SaveStatus = "idle" | "saving" | "saved" | "error";

// 표시용 질문 ID 계산: 완료면 이전 질문, 아니면 오늘 질문
const getDisplayId = (currentId: number | null, completed: boolean) => {
  if (currentId == null) return null;
  if (!completed) return currentId;
  const prev = currentId - 1;
  return prev >= 0 ? prev : null;
};

export default function QuestionPage() {
  const { user } = useUser();
  const { completeTask } = useCompleteTask();

  const [question, setQuestion] = useState<string | null>(null);
  const [questionId, setQuestionId] = useState<number | null>(null); // "오늘" 기준 id
  const [displayQuestionId, setDisplayQuestionId] = useState<number | null>(
    null
  ); // ✅ 화면/저장 대상 고정 ID
  const [answer, setAnswer] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false); // 오늘 제출 여부
  const [loading, setLoading] = useState(true);

  // 제출 완료 상태에서만 "수정하기"로 편집 허용
  const [editing, setEditing] = useState(false);
  const canEdit = useMemo(() => !submitted || editing, [submitted, editing]);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimerRef = useRef<number | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 이모지 dropdown
  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiBtnRef = useRef<HTMLButtonElement | null>(null);
  const emojiMenuRef = useRef<HTMLDivElement | null>(null);

  // 타이머 정리
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  const loadQuestionText = useCallback(async (qid: number | null) => {
    if (qid == null || qid < 0) return null;
    return await GetQuestionById(qid);
  }, []);

  const loadMyAnswer = useCallback(
    async (qid: number | null) => {
      if (qid == null || !user?.id) return null; // ✅ 0 허용
      const { data, error } = await supabase
        .from("answer")
        .select("content")
        .eq("user_id", user.id)
        .eq("question_id", qid)
        .maybeSingle();
      if (error) return null;
      return data?.content ?? null;
    },
    [user?.id]
  );

  // 현재 상태(questionId, submitted) 기준으로 화면에 보여줄 질문/답변 새로고침
  const refreshDisplayContent = useCallback(async () => {
    const displayId = getDisplayId(questionId, submitted);
    setDisplayQuestionId(displayId); // ✅ 저장 타깃 고정
    if (displayId == null) {
      setQuestion("표시할 이전 질문이 없습니다.");
      setAnswer("");
      return;
    }
    const [qText, myAns] = await Promise.all([
      loadQuestionText(displayId),
      loadMyAnswer(displayId),
    ]);
    setQuestion(qText ?? "");
    setAnswer(myAns ?? "");
  }, [questionId, submitted, loadQuestionText, loadMyAnswer]);

  // 초기 로드
  useEffect(() => {
    const fetchQuestion = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("daily_task")
        .select("question_id, completed")
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        setLoading(false);
        return;
      }

      setQuestionId(data.question_id);
      setSubmitted(data.completed);
      setEditing(false);

      const displayId = getDisplayId(data.question_id, data.completed);
      setDisplayQuestionId(displayId); // ✅ 초기에도 고정
      if (displayId == null) {
        setQuestion("표시할 이전 질문이 없습니다.");
        setAnswer("");
        setLoading(false);
        return;
      }
      const [qText, myAns] = await Promise.all([
        loadQuestionText(displayId),
        loadMyAnswer(displayId),
      ]);
      setQuestion(qText ?? "");
      setAnswer(myAns ?? "");
      setLoading(false);
    };

    fetchQuestion();
  }, [user, loadQuestionText, loadMyAnswer]);

  // 드롭다운 외부 클릭/ESC 닫기
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

  // 저장(버튼 클릭 시만)
  const persistAnswer = useCallback(
    async (content: string, isEdit = false) => {
      if (!user) return false;
      if (displayQuestionId == null) return false; // ✅ 고정된 타깃만 사용

      setSaveStatus("saving");
      try {
        // ✅ 원자적 upsert로 경합/중복 INSERT 방지
        const { error } = await supabase
          .from("answer")
          .upsert(
            [{ user_id: user.id, question_id: displayQuestionId, content }],
            { onConflict: "user_id,question_id" }
          );

        if (error) throw error;

        setSaveStatus("saved");
        toast.info(isEdit ? "수정했습니다. " : "저장했습니다.");

        if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(
          () => setSaveStatus("idle"),
          1500
        );
        return true;
      } catch {
        setSaveStatus("error");
        if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(
          () => setSaveStatus("idle"),
          2000
        );
        return false;
      }
    },
    [user, displayQuestionId]
  );

  // 단일 버튼 동작
  const onPrimaryClick = useCallback(async () => {
    if (submitted && !editing) {
      setEditing(true);
      requestAnimationFrame(() => textareaRef.current?.focus());
      return;
    }

    const trimmed = answer.trim();
    if (!trimmed) return;

    const isEdit = submitted; // 신규 저장/수정 구분
    const ok = await persistAnswer(trimmed, isEdit);
    if (!ok) return;

    if (!submitted) {
      if (user?.partner_id) {
        await sendUserNotification({
          senderId: user.id,
          receiverId: user.partner_id,
          type: "답변등록",
          description: `${user.nickname}님이 답변을 등록했어요! `,
          isRequest: false,
        }).catch(() => {});
      }
      await completeTask().catch(() => {});
      setSubmitted(true);
      setEditing(false);
      await refreshDisplayContent(); // ✅ 이후 표시/저장 타깃도 갱신
    } else {
      setEditing(false);
      await refreshDisplayContent();
    }
  }, [
    submitted,
    editing,
    answer,
    persistAnswer,
    user,
    completeTask,
    refreshDisplayContent,
  ]);

  // 커서 위치에 이모지 삽입(편집 가능 시만)
  const insertAtCursor = (token: string) => {
    if (!canEdit) return;
    const el = textareaRef.current;
    if (!el) {
      setAnswer((prev) => (prev ?? "") + token);
      return;
    }
    const start = el.selectionStart ?? answer.length;
    const end = el.selectionEnd ?? start;
    const next =
      (answer ?? "").slice(0, start) + token + (answer ?? "").slice(end);
    setAnswer(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <main className="mx-auto w-full max-w-screen-lg px-4 md:px-6">
      {/* 편지지 느낌의 컨테이너 */}
      <Card
        className={cn(
          "relative mx-auto max-w-3xl border-0 rounded-3xl",
          "bg-[rgba(250,247,242,0.98)]",
          "ring-1 ring-amber-200/40",
          "shadow-[0_20px_60px_-20px_rgba(120,85,40,0.25)]",
          // 종이 결(점조) 텍스처
          "before:absolute before:inset-0 before:rounded-3xl",
          "before:bg-[radial-gradient(rgba(0,0,0,0.045)_1px,transparent_1px)] before:bg-[length:12px_12px] before:opacity-25"
        )}
      >
        {/* 와시테이프 (마스킹테이프) */}
        <div className="pointer-events-none absolute -top-3 left-10 rotate-[-4deg] h-6 w-24 bg-sky-200/70 rounded-[4px] shadow-sm" />
        <div className="pointer-events-none absolute -top-2 right-12 rotate-[6deg] h-6 w-20 bg-pink-200/60 rounded-[4px] shadow-sm" />

        {/* 바인더 펀칭홀 */}
        <div className="pointer-events-none absolute left-3 top-20 flex flex-col gap-6 opacity-60">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-3 w-3 rounded-full bg-white shadow-inner ring-1 ring-amber-300/50"
            />
          ))}
        </div>

        {loading ? (
          <>
            {/* 헤더 영역 스켈레톤(높이 안정화) */}
            <CardHeader className="items-center pt-10">
              <Skeleton className="h-6 w-80 rounded-md" />
            </CardHeader>

            <CardContent className="space-y-5">
              <Separator />

              {/* 이모지 버튼 + 파트너 위젯 라인 */}
              <div className="mx-auto w-full md:w-[80%] lg:w-[70%]">
                <div className="mb-2 text-center">
                  <Skeleton className="h-4 w-72 mx-auto rounded-md" />
                </div>

                <div className="flex items-center justify-center">
                  {/* 이모지 버튼 자리 */}
                  <Skeleton className="h-10 w-[150px] rounded-full mr-2" />
                  {/* 파트너 아바타/텍스트 자리 */}
                  <div className="hidden sm:flex items-center gap-2 ml-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-3 w-12 rounded-md" />
                  </div>
                </div>
              </div>

              {/* 답변 textarea 자리 */}
              <div className="mx-auto w-full md:w-[80%] lg:w-[70%]">
                <Skeleton className="h-[220px] md:h-[260px] w-full rounded-2xl" />
              </div>
            </CardContent>

            {/* 하단 버튼/상태 라인 */}
            <CardFooter className="flex flex-col items-center gap-2 pb-8">
              <Skeleton className="h-10 w-[150px] rounded-full" />
            </CardFooter>
          </>
        ) : (
          <>
            {/* 레터헤드 + 날짜 배지 */}
            <CardHeader className="items-center pt-10">
              <div
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
                  "bg-white/70 ring-1 ring-amber-200/60 text-amber-800 text-xs"
                )}
              >
                ✉️ <span className="font-medium">Dear us</span>
                <span className="text-amber-600/60">·</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-50 ring-1 ring-amber-200/60">
                  {new Intl.DateTimeFormat("ko-KR", {
                    dateStyle: "long",
                    timeZone: "Asia/Seoul",
                  }).format(new Date())}
                </span>
              </div>

              {/* 저장됨 도장(성공 시) */}
              {saveStatus === "saved" && (
                <div className="pointer-events-none absolute right-8 top-8 origin-[80%_20%] rotate-[-8deg] text-emerald-600/85 font-semibold tracking-widest ring-2 ring-emerald-600/30 px-3 py-1 rounded-lg">
                  SAVED
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-6">
              {/* 질문 본문 */}
              <p className="text-lg md:text-xl text-[#5b3d1d] whitespace-pre-line text-center leading-relaxed">
                {question ? `"${question}"` : "표시할 질문이 없습니다."}
              </p>

              <Separator className="bg-amber-200/50" />

              {/* 안내줄 + 파트너 위젯 */}
              <div className="mx-auto w-full md:w-[80%] lg:w-[70%]">
                <div className="flex items-center justify-center">
                  {/* 버튼 + 드롭다운을 위한 상대 컨테이너 */}
                  <div className="relative">
                    <Button
                      ref={emojiBtnRef}
                      type="button"
                      variant="outline"
                      className={cn(
                        "rounded-full px-4 py-2 bg-white/90 text-amber-900 border border-amber-200/80",
                        "shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] hover:shadow-md active:scale-95",
                        canEdit
                          ? "cursor-pointer"
                          : "pointer-events-none opacity-60"
                      )}
                      onClick={() => canEdit && setEmojiOpen((o) => !o)}
                    >
                      <span className="mr-1">🖋️</span> 이모지 스탬프
                    </Button>

                    {emojiOpen && (
                      <div
                        ref={emojiMenuRef}
                        role="grid"
                        aria-label="이모지 선택"
                        className="absolute z-50 mt-2 w-[300px] rounded-3xl border border-amber-200/70 bg-white/95 backdrop-blur-sm p-3 shadow-lg"
                      >
                        <div className="grid grid-cols-6 gap-2">
                          {EMOJIS_5x6.map((e) => (
                            <button
                              key={e}
                              role="gridcell"
                              onClick={() => {
                                insertAtCursor(e);
                                setEmojiOpen(false);
                              }}
                              className="h-9 w-9 flex items-center justify-center rounded-full border border-amber-200/60 bg-white hover:bg-amber-50 active:scale-95 shadow-sm text-[18px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
                              aria-label={`${e} 삽입`}
                              tabIndex={0}
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 버튼 오른쪽: 파트너 아바타 + 리본 뱃지 */}
                  <div className="hidden sm:flex items-center gap-2 ml-3">
                    <AvatarWidget type="partner" size="sm" />
                    <span className="text-[11px] px-2 py-1 rounded-full bg-pink-50 border border-pink-200 text-pink-700 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset]">
                      잘 써조! 💌
                    </span>
                  </div>
                </div>
              </div>

              {/* 내 답변 */}
              {submitted && !editing ? (
                // ✅ 제출 완료 & 편집 중 아님: 보기 전용 카드
                <div className="mx-auto w-full md:w-[80%] lg:w-[70%]">
                  <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 md:p-5 ring-1 ring-amber-200/50 shadow-inner">
                    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-amber-800">
                      <CheckCircle2 className="h-4 w-4" />
                      제출 완료 — 아래 내용은 읽기 전용입니다
                    </div>
                    <div className="whitespace-pre-wrap break-words text-[15px] md:text-base leading-relaxed text-neutral-800">
                      {answer || "작성 내용이 없습니다."}
                    </div>
                  </div>
                </div>
              ) : (
                // ✍️ 신규 작성 중이거나, '수정하기' 눌러 편집 모드일 때: 입력 가능
                <div className="mx-auto w-full md:w-[80%] lg:w-[70%] space-y-2 text-center relative">
                  <Textarea
                    ref={textareaRef}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    readOnly={saveStatus === "saving"}
                    className={cn(
                      "mx-auto min-h-[220px] md:min-h-[260px] resize-none rounded-2xl",
                      "bg-[linear-gradient(transparent_29px,rgba(0,0,0,0.035)_30px)] bg-[length:100%_30px]",
                      "border-0 ring-1 ring-neutral-200  focus-visible:ring-neutral-400",
                      "px-4 py-3 text-[15px] md:text-[16px] leading-[30px] text-neutral-800",
                      "shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                    )}
                    placeholder={
                      submitted
                        ? "수정 중입니다. 저장하기를 눌러 반영합니다."
                        : "이곳에 답변을 입력해주세요..."
                    }
                  />
                  <div className="mx-auto w-full md:w-[80%] lg:w-[70%] -mt-1 text-right text-[11px] text-amber-900/60">
                    {answer.length.toLocaleString("ko-KR")} 자
                  </div>
                </div>
              )}
            </CardContent>

            {/* 단일 버튼 + 상태 피드백 라인 */}
            <CardFooter className="sticky bottom-0 bg-gradient-to-t from-[rgba(250,247,242,0.98)] to-transparent pt-6 pb-7 flex flex-col items-center gap-2">
              <Button
                onClick={onPrimaryClick}
                disabled={saveStatus === "saving"}
                className={cn(
                  "min-w-[150px] rounded-full text-neutral-600",
                  "bg-rose-200 hover:bg-rose-300",
                  "shadow-[inset_0_-2px_0_rgba(0,0,0,0.12),0_10px_24px_-10px_rgba(244,114,182,0.6)] active:scale-95"
                )}
              >
                {saveStatus === "saving" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 저장 중…
                  </>
                ) : submitted ? (
                  editing ? (
                    <>🔖 저장하기</>
                  ) : (
                    <>✍️ 수정하기</>
                  )
                ) : (
                  <>🔖 저장하기</>
                )}
              </Button>

              {/* 하단 상태 라벨 */}
              <div className="min-h-[22px] text-[12px] text-amber-900/70">
                {editing && saveStatus !== "saving" && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    수정 중…
                  </span>
                )}
                {saveStatus === "saved" && (
                  <span className="text-emerald-600">저장됨</span>
                )}
                {saveStatus === "error" && (
                  <span className="text-red-600">
                    저장 실패 — 잠시 후 재시도
                  </span>
                )}
              </div>
            </CardFooter>
          </>
        )}
      </Card>
    </main>
  );
}
