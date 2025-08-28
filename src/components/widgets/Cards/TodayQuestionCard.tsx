// src/features/couple/TodayQuestionCard.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useNavigate } from "react-router-dom";

// shadcn/ui
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ✅ magicui TypingAnimation 그대로 사용 (수정 X)
import { TypingAnimation } from "@/components/magicui/typing-animation";
// 🔁 커서 깜빡임에 사용
import { motion } from "motion/react";

type DailyTaskRow = {
  user_id: string;
  completed: boolean; // 작성 완료 여부
  question_id: number; // FK → question.id
};

type QuestionRow = {
  id: number;
  content: string; // 질문 본문
};

export default function TodayQuestionCard({
  className,
}: {
  className?: string;
}) {
  const { user, isCoupled } = useUser();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [task, setTask] = useState<DailyTaskRow | null>(null);
  const [question, setQuestion] = useState<QuestionRow | null>(null);

  // 🔁 무한 반복을 위한 key
  const [loopKey, setLoopKey] = useState(0);

  const navigate = useNavigate();

  // 오늘 제출했다면 이전 질문으로 스위칭
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
      // 1) daily_task
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

  // ✅ 안전 문자열(끝의 undefined 방지)
  const safeQuestionText =
    (typeof question?.content === "string"
      ? question?.content
      : String(question?.content ?? "")) || "질문 본문을 찾을 수 없어요.";

  // 🔁 TypingAnimation 1회 완료 후 5초 쉬었다가 재시작 (컴포넌트 수정 없이)
  const CHAR_MS = 140; // TypingAnimation duration과 동일하게
  const PAUSE_MS = 5000;
  useEffect(() => {
    if (loading || !task || !safeQuestionText) return;
    const totalMs = safeQuestionText.length * CHAR_MS + PAUSE_MS;
    const t = window.setTimeout(() => setLoopKey((k) => k + 1), totalMs);
    return () => window.clearTimeout(t);
  }, [safeQuestionText, loading, task?.completed, loopKey]);

  // 비로그인/커플 미연결
  if (!user?.id || !isCoupled) {
    return (
      <Card className={cn("bg-white", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-[#3d2b1f]"> 💭 오늘의 질문</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            로그인 후 커플을 연결하면 오늘의 질문을 받아볼 수 있어요.
          </p>
        </CardContent>
      </Card>
    );
  }

  const StatusBadge = ({ completed }: { completed: boolean }) =>
    completed ? (
      <div className="flex p-2 gap-1.5 rounded-xl text-xs bg-emerald-100 text-emerald-800 ">
        작성 완료
      </div>
    ) : (
      <div className="flex p-2 gap-1.5 rounded-xl text-xs bg-rose-100 text-rose-800 border">
        미완료
      </div>
    );

  return (
    <Card className={cn("bg-white", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-around gap-2">
          <CardTitle className="flex items-center  gap-2 text-[#3d2b1f]">
            💭 오늘의 질문
            {loading ? (
              <Skeleton className="ml-1 h-5 w-16 rounded-full" />
            ) : (
              <StatusBadge completed={!!task?.completed} />
            )}
          </CardTitle>
        </div>
      </CardHeader>

      <Separator className="my-4" />

      <CardContent className="space-y-3 font-semibold">
        {loading && (
          <>
            <Skeleton className="h-6 rounded-md" />
            <Skeleton className="h-6 w-2/3 rounded-md" />
          </>
        )}

        {!loading && error && (
          <p className="text-sm text-red-600">오류: {error}</p>
        )}

        {!loading && !error && !task && (
          <p className="text-sm text-muted-foreground">
            오늘의 질문 레코드가 아직 생성되지 않았어요.
          </p>
        )}

        {!loading && !error && task && (
          <>
            {/* 🔁 무한 반복 + 커서 깜빡임 (TypingAnimation은 수정하지 않음) */}
            <p className="text-[15px] leading-relaxed text-[#3d2b1f]">
              <TypingAnimation
                key={loopKey} // key가 바뀔 때마다 재마운트 → 다시 타이핑
                as="span" // 줄바꿈 방지
                className="font-medium !text-[15px] !leading-relaxed !tracking-normal"
                duration={CHAR_MS}
                startOnView
              >
                {safeQuestionText}
              </TypingAnimation>

              {/* 깜빡이는 커서 */}
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
            </p>
          </>
        )}
      </CardContent>

      <CardFooter className="pt-2 flex justify-end">
        {!loading && !error && task && (
          <Button
            variant="ghost"
            onClick={onClickGoAnswer}
            className="mt-1 hover:cursor-pointer"
            title={task.completed ? "작성 열기" : "작성하기"}
          >
            {task.completed ? "📝" : "✍️"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
