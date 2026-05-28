// src/pages/QuestionPage.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Loader2,
  PencilLine,
  Send,
  SmilePlus,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/contexts/UserContext";
import supabase from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useDailyAnswerStatusStore } from "@/stores/useDailyAnswerStatusStore";
import { GetQuestionById } from "@/utils/GetQuestionById";
import { usePartnerNotification } from "@/utils/notification/usePartnerNotification";
import { getDisplayQuestionId } from "@/utils/questions/questionFlow";
import { useCompleteTask } from "@/utils/tasks/CompleteTask";
import { ensureDailyTaskForToday } from "@/utils/tasks/EnsureDailyTaskForToday";

const EMOJIS = [
  "😊",
  "🥰",
  "😂",
  "😌",
  "🥹",
  "😍",
  "🤍",
  "💛",
  "🌙",
  "✨",
  "🍀",
  "☁️",
  "🌷",
  "🍓",
  "🫶",
  "💌",
  "🙈",
  "😎",
  "🤔",
  "👏",
  "😭",
  "🫠",
  "💭",
  "⭐",
] as const;

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function QuestionPage() {
  const { user } = useUser();
  const { completeTask } = useCompleteTask();
  const { sendToPartner } = usePartnerNotification();
  const setAnswerStatus = useDailyAnswerStatusStore((state) => state.setStatus);

  const [question, setQuestion] = useState<string | null>(null);
  const [questionId, setQuestionId] = useState<number | null>(null);
  const [displayQuestionId, setDisplayQuestionId] = useState<number | null>(
    null,
  );
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [emojiOpen, setEmojiOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  const canEdit = !submitted || editing;
  const isViewMode = submitted && !editing;
  const isSaving = saveStatus === "saving";
  const trimmedAnswer = answer.trim();

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
      if (qid == null || !user?.id) return null;

      const { data, error } = await supabase
        .from("answer")
        .select("content")
        .eq("user_id", user.id)
        .eq("question_id", qid)
        .maybeSingle();

      if (error) return null;
      return data?.content ?? null;
    },
    [user?.id],
  );

  const refreshDisplayContent = useCallback(
    async (
      storedQuestionId: number | null = questionId,
      isSubmitted = submitted,
    ) => {
      const displayId = getDisplayQuestionId(storedQuestionId, isSubmitted);

      setDisplayQuestionId(displayId);

      if (displayId == null) {
        setQuestion("오늘 표시할 질문이 없어요.");
        setAnswer("");
        return;
      }

      const [questionText, myAnswer] = await Promise.all([
        loadQuestionText(displayId),
        loadMyAnswer(displayId),
      ]);

      setQuestion(questionText ?? "");
      setAnswer(myAnswer ?? "");
    },
    [loadMyAnswer, loadQuestionText, questionId, submitted],
  );

  useEffect(() => {
    let mounted = true;

    const fetchQuestion = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("daily_task")
        .select("question_id, completed, date")
        .eq("user_id", user.id)
        .single();

      if (!mounted) return;

      if (error || !data) {
        setAnswerStatus({
          userId: user.id,
          loading: false,
          error: error?.message ?? "질문 정보를 불러오지 못했어요.",
        });
        setLoading(false);
        return;
      }

      const todaysTask = await ensureDailyTaskForToday({
        userId: user.id,
        task: data,
      });

      if (!mounted) return;

      setQuestionId(todaysTask.question_id);
      setSubmitted(todaysTask.completed);
      setEditing(false);
      setAnswerStatus({
        userId: user.id,
        questionId: todaysTask.question_id,
        completed: todaysTask.completed,
        loading: false,
        error: null,
      });

      const displayId = getDisplayQuestionId(
        todaysTask.question_id,
        todaysTask.completed,
      );

      setDisplayQuestionId(displayId);

      if (displayId == null) {
        setQuestion("오늘 표시할 질문이 없어요.");
        setAnswer("");
        setLoading(false);
        return;
      }

      const [questionText, myAnswer] = await Promise.all([
        loadQuestionText(displayId),
        loadMyAnswer(displayId),
      ]);

      if (!mounted) return;
      setQuestion(questionText ?? "");
      setAnswer(myAnswer ?? "");
      setLoading(false);
    };

    fetchQuestion();
    return () => {
      mounted = false;
    };
  }, [loadMyAnswer, loadQuestionText, setAnswerStatus, user?.id]);

  const persistAnswer = useCallback(
    async (content: string, isEdit = false) => {
      if (!user?.id || displayQuestionId == null) return false;

      setSaveStatus("saving");

      try {
        const { error } = await supabase.from("answer").upsert(
          [
            {
              user_id: user.id,
              question_id: displayQuestionId,
              content,
            },
          ],
          { onConflict: "user_id,question_id" },
        );

        if (error) throw error;

        setSaveStatus("saved");
        toast.success(isEdit ? "답변을 수정했어요." : "오늘의 답변을 저장했어요.");

        if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(
          () => setSaveStatus("idle"),
          1500,
        );

        return true;
      } catch {
        setSaveStatus("error");
        toast.error("저장에 실패했어요. 잠시 후 다시 시도해주세요.");

        if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(
          () => setSaveStatus("idle"),
          2000,
        );

        return false;
      }
    },
    [displayQuestionId, user?.id],
  );

  const onPrimaryClick = useCallback(async () => {
    if (submitted && !editing) {
      setEditing(true);
      requestAnimationFrame(() => textareaRef.current?.focus());
      return;
    }

    if (!trimmedAnswer) return;

    const isEdit = submitted;
    const ok = await persistAnswer(trimmedAnswer, isEdit);
    if (!ok) return;

    if (!submitted) {
      await sendToPartner(
        {
          type: "답변 등록",
          isRequest: false,
        },
        { showError: false },
      );

      const result = await completeTask().catch(() => null);
      const nextQuestionId = result?.question_id ?? questionId;

      setQuestionId(nextQuestionId);
      setSubmitted(true);
      setEditing(false);
      await refreshDisplayContent(nextQuestionId, true);
      return;
    }

    setEditing(false);
    await refreshDisplayContent();
  }, [
    completeTask,
    editing,
    persistAnswer,
    questionId,
    refreshDisplayContent,
    sendToPartner,
    submitted,
    trimmedAnswer,
  ]);

  const insertAtCursor = (token: string) => {
    if (!canEdit) return;

    const el = textareaRef.current;
    if (!el) {
      setAnswer((prev) => prev + token);
      return;
    }

    const start = el.selectionStart ?? answer.length;
    const end = el.selectionEnd ?? start;
    const next = answer.slice(0, start) + token + answer.slice(end);

    setAnswer(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const status = useMemo(() => {
    if (loading) {
      return {
        label: "불러오는 중",
        icon: Clock3,
        className: "border-slate-200 bg-slate-50 text-slate-700",
      };
    }
    if (submitted) {
      return {
        label: "작성 완료",
        icon: CheckCircle2,
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100",
      };
    }
    return {
      label: "작성 전",
      icon: PencilLine,
      className:
        "border-rose-200 bg-rose-50 text-rose-700 shadow-sm shadow-rose-100",
    };
  }, [loading, submitted]);

  const StatusIcon = status.icon;

  return (
    <main className="min-h-[100dvh]">
      <div className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 md:py-8 lg:px-8">
        <section className="space-y-5">
          <Card className="overflow-hidden border-rose-100/80 bg-white/95 shadow-sm">
            <CardHeader className="gap-4 p-5 md:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="space-y-1">
                    <CardTitle className="text-2xl font-bold tracking-normal md:text-3xl">
                      답변하기
                    </CardTitle>
                    <CardDescription className="leading-6">
                      오늘의 질문에 남기고 싶은 마음을 차분히 적어보세요.
                    </CardDescription>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={cn(
                    "w-fit gap-1.5 px-3 py-1 text-sm font-semibold",
                    status.className,
                  )}
                >
                  <StatusIcon className="size-3.5" />
                  {status.label}
                </Badge>
              </div>
            </CardHeader>

            <Separator />

            {loading ? (
              <LoadingQuestion />
            ) : (
              <>
                <CardContent className="space-y-5 p-5 md:p-6">
                  <div className="rounded-lg border border-rose-100 bg-gradient-to-br from-rose-50 via-amber-50/80 to-sky-50 px-4 py-5 shadow-sm md:px-5">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-xs font-medium uppercase text-muted-foreground">
                        Question
                      </p>
                    </div>
                    <p className="whitespace-pre-line break-keep text-lg font-semibold leading-8 text-foreground md:text-xl md:leading-9">
                      {question || "오늘 표시할 질문이 없어요."}
                    </p>
                  </div>

                  {isViewMode ? (
                    <div className="min-h-[260px] rounded-lg border bg-white p-4 text-[15px] leading-7 shadow-sm md:min-h-[320px] md:p-5 md:text-base">
                      <div className="h-full whitespace-pre-wrap break-words">
                        {answer || "아직 작성된 답변이 없어요."}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative">
                        {isSaving && (
                          <div className="absolute inset-x-0 top-0 h-1 rounded-t-lg bg-rose-300/80" />
                        )}
                        <Textarea
                          ref={textareaRef}
                          value={answer}
                          onChange={(event) => setAnswer(event.target.value)}
                          readOnly={isSaving}
                          placeholder={
                            submitted
                              ? "수정할 답변을 적어주세요."
                              : "답변을 입력해주세요."
                          }
                          className={cn(
                            "min-h-[260px] resize-none rounded-lg bg-white p-4 text-[15px] leading-7 shadow-sm md:min-h-[320px] md:p-5 md:text-base",
                            "focus-visible:ring-rose-200",
                            isSaving && "opacity-90",
                          )}
                        />
                        <div className="absolute right-3 top-3">
                          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                size="icon"
                                variant="secondary"
                                className="size-9 rounded-lg bg-white shadow-sm"
                                disabled={!canEdit || isSaving}
                                aria-label="이모지 추가"
                              >
                                <SmilePlus className="size-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-72 p-2">
                              <div className="grid grid-cols-6 gap-1.5">
                                {EMOJIS.map((emoji) => (
                                  <button
                                    key={emoji}
                                    type="button"
                                    className="grid size-9 place-items-center rounded-md border bg-background text-lg transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
                                    onClick={() => {
                                      insertAtCursor(emoji);
                                      setEmojiOpen(false);
                                    }}
                                    aria-label={`${emoji} 추가`}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>
                          {saveStatus === "saved" && "저장 완료"}
                          {saveStatus === "error" && "저장 실패"}
                        </span>
                        <span>{answer.length.toLocaleString("ko-KR")}자</span>
                      </div>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex flex-col-reverse gap-2 border-t bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-end md:px-6">
                  {editing && submitted && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditing(false);
                        refreshDisplayContent();
                      }}
                      disabled={isSaving}
                    >
                      취소
                    </Button>
                  )}

                  <Button
                    type="button"
                    onClick={onPrimaryClick}
                    disabled={isSaving || (!isViewMode && !trimmedAnswer)}
                    className="w-full gap-2 sm:w-auto"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        저장 중
                      </>
                    ) : submitted && !editing ? (
                      <>
                        <PencilLine className="size-4" />
                        수정하기
                      </>
                    ) : (
                      <>
                        <Send className="size-4" />
                        저장하기
                      </>
                    )}
                  </Button>
                </CardFooter>
              </>
            )}
          </Card>
        </section>
      </div>
    </main>
  );
}

function LoadingQuestion() {
  return (
    <>
      <CardContent className="space-y-5 p-5 md:p-6">
        <div className="rounded-lg border bg-muted/35 px-4 py-5 md:px-5">
          <Skeleton className="mb-4 h-3 w-20" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="mt-3 h-6 w-4/5" />
        </div>
        <Skeleton className="h-[260px] rounded-lg md:h-[320px]" />
      </CardContent>
      <CardFooter className="justify-end border-t bg-muted/20 p-4 md:px-6">
        <Skeleton className="h-10 w-28" />
      </CardFooter>
    </>
  );
}
