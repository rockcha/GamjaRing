// src/features/couple/TodayQuestionInline.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
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

  // 비로그인/미커플이면 표시 안 함
  if (!user?.id || !isCoupled) return null;

  const statusEmoji = task?.completed ? "✅" : "❗";
  const statusLabel = task?.completed ? "작성 완료" : "미완료";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClickGoAnswer}
      onKeyDown={(e) =>
        (e.key === "Enter" || e.key === " ") && onClickGoAnswer()
      }
      title={task?.completed ? "작성 열기" : "작성하러가기"}
      className={cn(
        // 깔끔한 1줄 바
        "w-full cursor-pointer select-none",
        "flex items-center gap-2 px-3 py-2",
        "rounded-md border border-slate-200/70 bg-sky-50 hover:bg-sky-100 transition",
        "whitespace-nowrap overflow-hidden",
        className
      )}
    >
      {/* 상태 이모지 + 라벨 */}
      {loading ? (
        <Skeleton className="h-5 w-24 rounded" />
      ) : error ? (
        <span className="text-sm text-rose-600">오류: {error}</span>
      ) : !task ? (
        <span className="text-sm text-slate-500">
          오늘의 질문 레코드가 아직 생성되지 않았어요.
        </span>
      ) : (
        <>
          <span className="shrink-0">{statusEmoji}</span>
          <span className="shrink-0 text-xs text-slate-600">{statusLabel}</span>
          <span className="mx-2 shrink-0 text-slate-300">·</span>

          {/* 한 줄 타이핑 텍스트 */}
          <span className="min-w-0 overflow-hidden text-ellipsis">
            <TypingAnimation
              key={loopKey}
              as="span"
              className="font-medium !text-[15px] !leading-[1.6] !tracking-normal"
              duration={CHAR_MS}
              startOnView
            >
              {safeQuestionText}
            </TypingAnimation>
            <motion.span
              aria-hidden
              className="ml-1 inline-block align-baseline"
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
          </span>
        </>
      )}
    </div>
  );
}
