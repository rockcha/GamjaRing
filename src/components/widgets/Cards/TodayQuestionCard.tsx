// src/features/couple/TodayQuestionCard.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { Navigate, useNavigate } from "react-router-dom";

// shadcn/ui
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { MessageSquareText } from "lucide-react";

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

  const navigate = useNavigate();

  // ✅ QuestionPage와 동일한 규칙: 오늘 제출했다면 이전 질문으로 스위칭
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
      // 1) 오늘의 daily_task (date 사용 X)
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

      // 2) 보여줄 질문 id 계산 (제출 완료면 이전 질문)
      const displayId = computeDisplayId(t.question_id, t.completed);
      if (displayId == null) {
        setQuestion({
          id: -1,
          content: "첫 질문이라 보여줄 이전 질문이 없어요.",
        });
        setLoading(false);
        return;
      }

      // 3) 질문 본문 조회
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

  const onClickGoAnswer = () => {
    navigate("/questions");
  };

  // 비로그인/커플 미연결
  if (!user?.id || !isCoupled) {
    return (
      <Card className={cn("bg-white", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-[#3d2b1f]">⏰ 오늘의 질문</CardTitle>
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
      <div className="flex p-2 gap-1.5 rounded-xl text-xs bg-emerald-100 text-emerald-800 border">
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
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-[#3d2b1f]">
            <MessageSquareText className="h-5 w-5 text-amber-700" />
            오늘의 질문
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
            <p className="text-[15px] leading-relaxed text-[#3d2b1f]">
              {question?.content ?? "질문 본문을 찾을 수 없어요."}
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
          >
            {task.completed ? "답변 수정하러 가기" : "답변하러 가기"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
