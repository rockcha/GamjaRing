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
import AvatarWidget from "@/components/widgets/AvatarWidget";
import { toast } from "sonner";

// icons
import { Loader2, Smile } from "lucide-react";
// animation
import { motion, AnimatePresence } from "framer-motion";

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

const PARTNER_MENTIONS: { emoji: string; text: string }[] = [
  { emoji: "💌", text: "정성껏 써줘, 자기야!" },
  { emoji: "🌸", text: "너의 말들이 늘 봄 같아." },
  { emoji: "☕", text: "한 잔의 커피처럼 천천히 적어줘." },
  { emoji: "🌙", text: "오늘의 마음을 달빛처럼 살포시." },
  { emoji: "✨", text: "작은 말도 반짝여, 너라서." },
  { emoji: "🫶", text: "네 진심 그대로면 충분해." },
  { emoji: "🎧", text: "좋아하는 노래 틀고 천천히 써볼까?" },
  { emoji: "🍀", text: "네 글은 내 행운이야." },
  { emoji: "📸", text: "오늘을 글로 찍어줘." },
  { emoji: "🌿", text: "숨 한번 고르고, 마음부터." },
  { emoji: "🕊️", text: "가볍게, 솔직하게. 괜찮아." },
  { emoji: "🌈", text: "네가 쓰면 평범도 예뻐져." },
  { emoji: "🧸", text: "포근하게 담아줘, 너다운 말로." },
  { emoji: "💫", text: "짧아도 좋아, 네 마음이면." },
  { emoji: "🔖", text: "오늘의 순간을 책갈피처럼." },
  { emoji: "🌤️", text: "살짝 미소 지어지는 글, 기대해." },
  { emoji: "🫖", text: "따뜻하게 우린 말들." },
  { emoji: "📮", text: "미래의 우리에게 보내는 편지처럼." },
  { emoji: "🧁", text: "한 숟갈 달콤함도 곁들여줘." },
  { emoji: "💘", text: "사랑 한 줄, 너 한 줄." },
];

const getDisplayId = (currentId: number | null, completed: boolean) => {
  if (currentId == null) return null;
  if (!completed) return currentId;
  const prev = currentId - 1;
  return prev >= 0 ? prev : null;
};

/* ─────────────── 스탬프 ─────────────── */
function CornerStamp({ submitted }: { submitted: boolean }) {
  const label = submitted ? "작성 완료" : "미작성";
  const tone = submitted
    ? "from-emerald-600/95 to-emerald-400/95 ring-emerald-700/50 text-white"
    : "from-rose-600/95 to-rose-400/95 ring-rose-700/50 text-white";
  return (
    <div
      aria-label={`상태: ${label}`}
      className={cn(
        "pointer-events-none absolute right-6 top-6 rotate-[10deg] select-none",
        "px-3.5 py-1.5 rounded-xl font-extrabold tracking-[0.12em]",
        "bg-gradient-to-br shadow-[0_10px_24px_-12px_rgba(0,0,0,0.35)] ring-2",
        tone
      )}
      style={{ WebkitTextStroke: "0.3px rgba(0,0,0,0.15)" }}
    >
      {label}
    </div>
  );
}

export default function QuestionPage() {
  const { user } = useUser();
  const { completeTask } = useCompleteTask();

  const [question, setQuestion] = useState<string | null>(null);
  const [questionId, setQuestionId] = useState<number | null>(null);
  const [displayQuestionId, setDisplayQuestionId] = useState<number | null>(
    null
  );
  const [answer, setAnswer] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const canEdit = useMemo(() => !submitted || editing, [submitted, editing]);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimerRef = useRef<number | null>(null);

  // ✅ 저장 성공 순간 스탬프 “툭” 모션 1번
  const [stampPulse, setStampPulse] = useState(false);
  const stampTimerRef = useRef<number | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 이모지
  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiBtnRef = useRef<HTMLButtonElement | null>(null);
  const emojiMenuRef = useRef<HTMLDivElement | null>(null);

  const randomMent = useMemo(() => {
    const i = Math.floor(Math.random() * PARTNER_MENTIONS.length);
    return PARTNER_MENTIONS[i];
  }, []);

  useEffect(
    () => () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      if (stampTimerRef.current) window.clearTimeout(stampTimerRef.current);
    },
    []
  );

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
    [user?.id]
  );

  const refreshDisplayContent = useCallback(async () => {
    const displayId = getDisplayId(questionId, submitted);
    setDisplayQuestionId(displayId);
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
      setDisplayQuestionId(displayId);
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

  // 드롭다운 외부 클릭/ESC
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

  const pulseStampOnce = useCallback(() => {
    setStampPulse(true);
    if (stampTimerRef.current) window.clearTimeout(stampTimerRef.current);
    stampTimerRef.current = window.setTimeout(() => setStampPulse(false), 650);
  }, []);

  // 저장(버튼)
  const persistAnswer = useCallback(
    async (content: string, isEdit = false) => {
      if (!user) return false;
      if (displayQuestionId == null) return false;

      setSaveStatus("saving");
      try {
        const { error } = await supabase
          .from("answer")
          .upsert(
            [{ user_id: user.id, question_id: displayQuestionId, content }],
            { onConflict: "user_id,question_id" }
          );

        if (error) throw error;

        setSaveStatus("saved");
        pulseStampOnce();

        toast.info(isEdit ? "오늘의 답변을 수정했어요 ✍️" : "오늘의 답변을 남겼어요 ✉️");

        if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(
          () => setSaveStatus("idle"),
          1500
        );
        return true;
      } catch {
        setSaveStatus("error");
        toast.error("저장에 실패했어요. 잠시 후 다시 시도해줘 🙏");

        if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(
          () => setSaveStatus("idle"),
          2000
        );
        return false;
      }
    },
    [user, displayQuestionId, pulseStampOnce]
  );

  // 단일 버튼
  const onPrimaryClick = useCallback(async () => {
    if (submitted && !editing) {
      setEditing(true);
      requestAnimationFrame(() => textareaRef.current?.focus());
      return;
    }
    const trimmed = answer.trim();
    if (!trimmed) return;

    const isEdit = submitted;
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
      await refreshDisplayContent();
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

  const BODY_FIXED_H = "h-[260px] md:h-[320px]";

  const isViewMode = submitted && !editing;
  const isSaving = saveStatus === "saving";

  return (
    <main
      className={cn("min-h-[100dvh] w-full bg-fixed bg-cover bg-center")}
      style={{ backgroundImage: "url('/questionpageBackground.png')" }}
    >
      <div className="min-h-[100dvh]">
        <div className="mx-auto w-full max-w-screen-lg px-4 md:px-6 py-6 md:py-10">
          <Card
            className={cn(
              "relative mx-auto max-w-3xl border-0 rounded-2xl",
              "bg-[#FFF7EE] text-neutral-800",
              "ring-1 ring-amber-200/60",
              "shadow-[0_24px_70px_-30px_rgba(120,85,40,0.35)]"
            )}
          >
            {/* 와시테이프 */}
            <div className="pointer-events-none absolute -top-3 left-10 rotate-[-4deg] h-6 w-24 bg-sky-200/80 rounded-[4px] shadow-sm" />
            <div className="pointer-events-none absolute -top-2 right-12 rotate-[6deg] h-6 w-20 bg-pink-200/80 rounded-[4px] shadow-sm" />

            {/* ✅ 스탬프: 저장 성공 순간 “툭” */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: 0 }}
              animate={{
                opacity: 1,
                scale: stampPulse ? 1.08 : 1,
                rotate: 10,
                y: stampPulse ? -2 : 0,
              }}
              transition={{
                type: "spring",
                stiffness: 320,
                damping: 18,
              }}
            >
              <CornerStamp submitted={submitted} />
            </motion.div>

            {/* 헤더 */}
            <CardHeader className="pt-10">
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">✉️</span>
                <h1 className="text-lg md:text-2xl font-extrabold tracking-tight">
                  오늘의 질문
                </h1>
              </div>
            </CardHeader>

            {loading ? (
              <>
                <CardContent className="space-y-6">
                  <Separator />
                  <div className="mx-auto w-full md:w-[80%] lg:w-[70%]">
                    <div className="mb-2 text-center">
                      <Skeleton className="h-4 w-72 mx-auto rounded-md" />
                    </div>
                    <div className="flex items-center justify-center">
                      <Skeleton className="h-10 w-[150px] rounded-full mr-2" />
                    </div>
                  </div>
                  <div className="mx-auto w-full md:w-[90%] lg:w-[70%]">
                    <Skeleton className={cn("w-full rounded-2xl", BODY_FIXED_H)} />
                  </div>
                </CardContent>
                <CardFooter className="pb-8" />
              </>
            ) : (
              <>
                <CardContent className="space-y-6">
                  {/* 질문 본문 */}
                  <p className="text-lg md:text-[22px] text-[#5b3d1d] whitespace-pre-line text-center leading-relaxed italic tracking-wide">
                    {question ? `"${question}"` : "표시할 질문이 없습니다."}
                  </p>

                  <Separator className="bg-amber-200/60" />

                  {/* ✅ 저장 성공 시: 작성 → 읽기 전환 애니메이션 */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isViewMode ? "view" : "edit"}
                      initial={{ opacity: 0.55, scale: 0.985, y: 6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.99, y: -4 }}
                      transition={{ duration: 0.22 }}
                    >
                      {isViewMode ? (
                        <div className="mx-auto w-full md:w-[80%] lg:w-[70%]">
                          <div
                            className={cn(
                              "rounded-2xl border border-amber-300/80 bg-white p-4 md:p-5 ring-1 ring-amber-300/70",
                              "whitespace-pre-wrap break-words text-[15px] md:text-base leading-relaxed",
                              BODY_FIXED_H,
                              "overflow-y-auto shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                            )}
                          >
                            {answer || "작성 내용이 없습니다."}
                          </div>
                        </div>
                      ) : (
                        <div className="mx-auto w-full md:w-[90%] lg:w-[80%] space-y-2 text-center relative">
                          <div className="relative">
                            {/* ✅ Textarea 상단 저장 중 인디케이터 */}
                            {isSaving && (
                              <div
                                aria-hidden
                                className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-pink-400 via-rose-400 to-pink-400 animate-pulse"
                              />
                            )}

                            <Textarea
                              ref={textareaRef}
                              value={answer}
                              onChange={(e) => setAnswer(e.target.value)}
                              readOnly={isSaving}
                              className={cn(
                                "mx-auto resize-none rounded-2xl bg-white",
                                "bg-[linear-gradient(transparent_29px,rgba(0,0,0,0.035)_30px)] bg-[length:100%_30px]",
                                "border ring-1 ring-neutral-200 focus-visible:ring-neutral-400",
                                "px-4 py-3 text-[15px] md:text-[16px] leading-[30px] text-neutral-800",
                                BODY_FIXED_H,
                                "overflow-y-auto shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
                                isSaving && "opacity-95"
                              )}
                              placeholder={
                                submitted
                                  ? "수정 중입니다. 저장하기를 눌러 반영합니다."
                                  : "이곳에 답변을 입력해주세요..."
                              }
                            />

                            {/* 이모지 플로팅 버튼(우상단) */}
                            <div className="absolute right-3 top-3">
                              <Button
                                ref={emojiBtnRef}
                                type="button"
                                size="icon"
                                variant="secondary"
                                className={cn(
                                  "rounded-full shadow-sm border bg-white hover:bg-amber-50",
                                  canEdit
                                    ? "opacity-100"
                                    : "pointer-events-none opacity-60"
                                )}
                                onClick={() => canEdit && setEmojiOpen((o) => !o)}
                                aria-label="이모지 추가"
                              >
                                <Smile className="h-5 w-5" />
                              </Button>

                              {emojiOpen && (
                                <div
                                  ref={emojiMenuRef}
                                  role="grid"
                                  aria-label="이모지 선택"
                                  className="absolute z-50 mt-2 right-0 w-[300px] rounded-xl bg-white/95 backdrop-blur-sm p-2 shadow-xl ring-1 ring-amber-200/60"
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
                                        className="h-9 w-9 flex items-center justify-center rounded-lg border bg-white hover:bg-amber-100 active:scale-95 shadow-sm text-[18px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
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
                          </div>

                          <div className="mx-auto w-full md:w-[90%] lg:w-[80%] -mt-1 text-right text-[11px] text-amber-900/60">
                            {answer.length.toLocaleString("ko-KR")} 자
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </CardContent>

                {/* 버튼 */}
                <CardFooter className="pt-0 pb-6">
                  <div className="w-full flex items-center justify-center">
                    <Button
                      onClick={onPrimaryClick}
                      disabled={isSaving}
                      className={cn(
                        "rounded-xl min-w-[150px] font-semibold",
                        submitted && !editing
                          ? "bg-rose-400 hover:bg-rose-500 text-white"
                          : "bg-pink-500 hover:bg-pink-600 text-white",
                        "shadow-[0_14px_28px_-14px_rgba(244,114,182,0.55)]"
                      )}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          저장 중…
                        </>
                      ) : submitted ? (
                        editing ? (
                          <>저장하기</>
                        ) : (
                          <>수정하기</>
                        )
                      ) : (
                        <>저장하기</>
                      )}
                    </Button>
                  </div>
                </CardFooter>
              </>
            )}
          </Card>

          {/* 우하단 파트너 멘트 */}
          <motion.aside
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.05,
            }}
            className={cn(
              "pointer-events-none fixed left-5 bottom-5 sm:left-8 sm:bottom-8 z-40",
              "max-w-[78vw] sm:max-w-xs"
            )}
            aria-live="polite"
          >
            <div
              className={cn(
                "pointer-events-auto flex items-center gap-3 sm:gap-4",
                "rounded-3xl bg-white/90 backdrop-blur-md",
                "ring-1 ring-pink-200/60 shadow-[0_10px_30px_-12px_rgba(255,0,90,0.25)]",
                "p-3 sm:p-4"
              )}
            >
              <AvatarWidget type="partner" size="md" />
              <div className="min-w-0">
                <div className="text-[13px] sm:text-[14px] leading-relaxed text-neutral-800 mt-0.5">
                  {randomMent?.text} {randomMent?.emoji}
                </div>
              </div>
            </div>
          </motion.aside>
        </div>
      </div>
    </main>
  );
}
