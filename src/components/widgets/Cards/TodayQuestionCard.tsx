// src/features/couple/TodayQuestionInline.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TypingAnimation } from "@/components/magicui/typing-animation";
import { motion } from "motion/react";

type DailyTaskRow = {
  user_id: string;
  completed: boolean;
  question_id: number;
};

type QuestionRow = {
  id: number;
  content: string;
};

export default function TodayQuestionInline({
  className,
}: {
  className?: string;
}) {
  const { user, isCoupled } = useUser();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [task, setTask] = useState<DailyTaskRow | null>(null);
  const [question, setQuestion] = useState<QuestionRow | null>(null);

  // 🔁 Typing 반복 제어
  const [loopKey, setLoopKey] = useState(0);

  const computeDisplayId = useCallback(
    (currentId: number | null, completed: boolean) => {
      if (currentId == null) return null;
      if (!completed) return currentId;
      const prev = currentId - 1;
      return prev >= 0 ? prev : null;
    },
    []
  );

  const fetchData = useCallback(async () => {
    if (!user?.id || !isCoupled) {
      setTask(null);
      setQuestion(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 1) 내 daily_task
      const { data: t, error: tErr } = await supabase
        .from("daily_task")
        .select("user_id, completed, question_id")
        .eq("user_id", user.id)
        .maybeSingle<DailyTaskRow>();
      if (tErr) throw tErr;

      if (!t) {
        setTask(null);
        setQuestion(null);
        setLoading(false);
        return;
      }
      setTask(t);

      // 2) 표시할 질문 id
      const displayId = computeDisplayId(t.question_id, t.completed);
      if (displayId == null) {
        setQuestion({
          id: -1,
          content: "첫 질문이라 보여줄 이전 질문이 없어요.",
        });
        setLoading(false);
        return;
      }

      // 3) 질문 본문
      const { data: q, error: qErr } = await supabase
        .from("question")
        .select("id, content")
        .eq("id", displayId)
        .maybeSingle<QuestionRow>();
      if (qErr) throw qErr;

      setQuestion(
        q ?? { id: displayId, content: "질문 본문을 찾을 수 없어요." }
      );
    } catch (e: any) {
      setError(e?.message ?? "오늘의 질문을 불러오는 중 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  }, [user?.id, isCoupled, computeDisplayId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onClickGoAnswer = () => navigate("/questions");

  // 안전 문자열
  const safeQuestionText =
    (typeof question?.content === "string"
      ? question?.content
      : String(question?.content ?? "")) || "질문 본문을 찾을 수 없어요.";

  // 🔁 TypingAnimation 1회 완료 후 5초 쉰 뒤 재시작
  const CHAR_MS = 140;
  const PAUSE_MS = 5000;
  useEffect(() => {
    if (loading || !task || !safeQuestionText) return;
    const totalMs = safeQuestionText.length * CHAR_MS + PAUSE_MS;
    const t = window.setTimeout(() => setLoopKey((k) => k + 1), totalMs);
    return () => window.clearTimeout(t);
  }, [safeQuestionText, loading, task?.completed, loopKey]);

  /** ----------------------------------------------------------------
   *  ✅ 훅 순서 보장: 아래 훅들은 조건부 return 보다 "항상 먼저" 호출
   * ---------------------------------------------------------------- */
  const isDone = !!task?.completed;

  const tone = useMemo(
    () =>
      isDone
        ? {
            wrap: "bg-emerald-50/80 dark:bg-emerald-950/30 ring-emerald-200/70 hover:bg-emerald-50 dark:hover:bg-emerald-950/40",
            line: "before:bg-emerald-400/80",
            label: "text-emerald-700 dark:text-emerald-300",
            chip: "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300/60 dark:bg-emerald-900/40 dark:text-emerald-200",
            caret: "text-emerald-600/80",
          }
        : {
            wrap: "bg-rose-50/80 dark:bg-rose-950/30 ring-rose-200/70 hover:bg-rose-50 dark:hover:bg-rose-950/40",
            line: "before:bg-rose-400/80",
            label: "text-rose-700 dark:text-rose-300",
            chip: "bg-rose-100 text-rose-900 ring-1 ring-rose-300/60 dark:bg-rose-900/40 dark:text-rose-200",
            caret: "text-rose-600/80",
          },
    [isDone]
  );

  const StatusChip = () => (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-xs font-semibold",
        "shadow-sm",
        tone.chip
      )}
    >
      <span aria-hidden>{isDone ? "✅" : "❗"}</span>
      {isDone ? "작성 완료" : "미완료"}
    </span>
  );

  // ✅ 훅 호출 이후에 조건부 반환
  if (!user?.id || !isCoupled) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClickGoAnswer}
      onKeyDown={(e) =>
        (e.key === "Enter" || e.key === " ") && onClickGoAnswer()
      }
      title={isDone ? "작성 열기" : "작성하러가기"}
      className={cn(
        "group w-full cursor-pointer select-none whitespace-nowrap overflow-hidden",
        "flex items-center gap-2 px-3 py-2 rounded-xl  transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20",
        tone.wrap,
        className
      )}
    >
      {/* 상태 Chip */}
      <StatusChip />

      {/* 구분점 */}
      <span className="mx-2 shrink-0 text-slate-300">·</span>

      {/* 한 줄 타이핑 텍스트 */}
      <span className="min-w-0 overflow-hidden text-ellipsis">
        {loading ? (
          <Skeleton className="h-5 w-48 rounded" />
        ) : error ? (
          <span className="text-sm text-rose-600">오류: {error}</span>
        ) : !task ? (
          <span className="text-sm text-slate-500">
            오늘의 질문 레코드가 아직 생성되지 않았어요.
          </span>
        ) : (
          <>
            <TypingAnimation
              key={loopKey}
              as="span"
              className={cn(
                "font-medium !text-[15px] !leading-[1.6] !tracking-normal",
                tone.label
              )}
              duration={CHAR_MS}
              startOnView
            >
              {safeQuestionText}
            </TypingAnimation>
            <motion.span
              aria-hidden
              className={cn("ml-1 inline-block align-baseline", tone.caret)}
              initial={{ opacity: 1 }}
              animate={{ opacity: [1, 0.1] }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            >
              |
            </motion.span>
          </>
        )}
      </span>

      {/* 오른쪽 힌트 */}
      <span
        className={cn(
          "ml-auto text-[11px] text-slate-500/0 transition-opacity",
          "group-hover:text-slate-500/70"
        )}
      >
        {isDone ? "열어보기" : "작성하러 가기"}
      </span>
    </div>
  );
}
