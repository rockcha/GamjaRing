// src/pages/QuestionPage.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { GetQuestionById } from "@/utils/GetQuestionById";
import { useUser } from "@/contexts/UserContext";
import { useCompleteTask } from "@/utils/tasks/CompleteTask";
import { useToast } from "@/contexts/ToastContext";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import supabase from "@/lib/supabase";

// shadcn/ui
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

// icons
import { Loader2, PencilLine, CheckCircle2, Ban } from "lucide-react";

const HEARTS = [
  "❤️",
  "🧡",
  "💛",
  "💚",
  "💙",
  "💜",
  "🤎",
  "🖤",
  "🤍",
  "💖",
  "💘",
  "💝",
  "💞",
  "💓",
  "💗",
  "💟",
  "💌",
  "✨",
];

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function QuestionPage() {
  const { user } = useUser();
  const { completeTask } = useCompleteTask();
  const { open } = useToast();

  const [question, setQuestion] = useState<string | null>(null);
  const [questionId, setQuestionId] = useState<number | null>(null);
  const [answer, setAnswer] = useState<string>("");
  const [lastSavedAnswer, setLastSavedAnswer] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimerRef = useRef<number | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const loadQuestionText = useCallback(async (qid: number | null) => {
    if (qid == null || qid < 0) return null;
    return await GetQuestionById(qid);
  }, []);

  const loadMyAnswer = useCallback(
    async (qid: number | null) => {
      if (!qid || !user?.id) return null;
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

  // ✅ 오늘 이미 제출했다면 '이전 질문(id-1)'을 보여주도록
  const computeDisplayId = useCallback(
    (currentId: number | null, completed: boolean) => {
      if (currentId == null) return null;
      if (!completed) return currentId;
      const prev = currentId - 1;
      return prev >= 0 ? prev : null;
    },
    []
  );

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

      const displayId = computeDisplayId(data.question_id, data.completed);
      if (displayId == null) {
        setQuestion("문제가 발생했습니다.");
        setAnswer("");
        setLastSavedAnswer("");
        setLoading(false);
        return;
      }

      const questionText = await loadQuestionText(displayId);
      setQuestion(questionText ?? "");

      const myAns = await loadMyAnswer(displayId);
      setAnswer(myAns ?? "");
      setLastSavedAnswer(myAns ?? "");

      setLoading(false);
    };

    fetchQuestion();
  }, [user, computeDisplayId, loadQuestionText, loadMyAnswer]);

  // 🔄 자동저장 유틸 (blur/unmount)
  const autoSaveIfNeeded = useCallback(
    async (reason: "blur" | "unmount") => {
      if (!user) return;
      const displayId = computeDisplayId(questionId, submitted);
      if (displayId == null) return;

      const trimmed = (answer ?? "").trim();
      const last = (lastSavedAnswer ?? "").trim();

      // 내용 변화가 없거나 비어있으면 저장 안 함(불필요한 쓰기 방지)
      if (!trimmed || trimmed === last) return;

      try {
        setSaveStatus("saving");

        // 먼저 update 시도 → 없으면 insert
        const { data: updated, error: upErr } = await supabase
          .from("answer")
          .update({ content: trimmed })
          .eq("user_id", user.id)
          .eq("question_id", displayId)
          .select("user_id")
          .maybeSingle();

        if (upErr || !updated) {
          const { error: insErr } = await supabase.from("answer").insert({
            user_id: user.id,
            question_id: displayId,
            content: trimmed,
          });
          if (insErr) throw insErr;
        }

        setLastSavedAnswer(trimmed);
        setSaveStatus("saved");
        // 2초 뒤 표시 제거
        if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(
          () => setSaveStatus("idle"),
          2000
        );
      } catch (e) {
        setSaveStatus("error");
        if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = window.setTimeout(
          () => setSaveStatus("idle"),
          2500
        );
      }
    },
    [answer, lastSavedAnswer, user, questionId, submitted, computeDisplayId]
  );

  // 페이지 이탈(unmount) 시 최종 자동저장
  useEffect(() => {
    const onBeforeUnload = () => {
      // 비동기 저장은 보장되지 않지만, cleanup에서도 저장 시도
      // 여기선 별도 동작 없이 cleanup에 맡김
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      // 마지막으로 한 번 더 시도
      void autoSaveIfNeeded("unmount");
    };
  }, [autoSaveIfNeeded]);

  // 제출(완료 처리 + 알림)
  const handleSubmitAnswer = useCallback(async () => {
    if (!user || questionId == null) return;
    const displayId = questionId;
    const trimmed = answer.trim();
    if (!trimmed) return;

    setSubmitting(true);

    // 제출 전 내용 반영(업데이트 우선 → 없으면 insert)
    const { data: updated, error: upErr } = await supabase
      .from("answer")
      .update({ content: trimmed })
      .eq("user_id", user.id)
      .eq("question_id", displayId)
      .select("user_id")
      .maybeSingle();

    if (upErr || !updated) {
      const { error: insErr } = await supabase.from("answer").insert({
        user_id: user.id,
        question_id: displayId,
        content: trimmed,
      });
      if (insErr) {
        setSubmitting(false);
        open("답변 저장 실패ㅠㅠ", 3000);
        return;
      }
    }

    if (user.partner_id) {
      const { error } = await sendUserNotification({
        senderId: user.id,
        receiverId: user.partner_id,
        type: "답변등록",
        description: `${user.nickname}님이 답변을 등록했어요! `,
        isRequest: false,
      });
      if (error) {
        // 알림 실패는 치명적이지 않음
      }
    }

    await completeTask();

    setLastSavedAnswer(trimmed);
    setQuestionId((prev) => (prev == null ? null : prev + 1));
    setSubmitted(true);
    setSubmitting(false);
  }, [user, questionId, answer, completeTask, open]);

  // ✨ 하트 삽입: 현재 커서 위치에 문자열 삽입
  const insertAtCursor = (token: string) => {
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
    // 커서 유지
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  // 편집 가능 여부: 항상 가능(요청사항)
  const editable = true;

  return (
    <main className="mx-auto  w-full max-w-screen-lg px-4 md:px-6 py-8">
      {/* 제목 + 보충설명 (중앙 정렬) */}

      <Card className=" relative mx-auto bg-white border shadow-sm max-w-3xl">
        {loading ? (
          <CardContent className="p-10 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            로딩 중...
          </CardContent>
        ) : (
          <>
            <CardHeader className="pb-4 text-center items-center"></CardHeader>

            <CardContent className="space-y-5">
              {/* 질문 본문 (중앙, 살짝 크게) */}
              <p className="text-lg md:text-xl text-[#5b3d1d] whitespace-pre-line text-center leading-relaxed">
                {question ? `"${question}"` : "질문을 불러오지 못했습니다."}
              </p>

              {/* 상태 배지 (완료/미완료 컬러 구분) */}
              <div
                className="absolute top-1
               right-3"
              >
                {submitted ? (
                  <Badge
                    variant="secondary"
                    className="gap-2 border-green-300 bg-green-50 text-green-800"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">답변 완료</span>
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="gap-2 border-rose-300 bg-rose-50 text-rose-700"
                  >
                    <Ban className="h-4 w-4" />
                    <span className="font-medium">답변 미제출</span>
                  </Badge>
                )}
              </div>

              <Separator />

              {/* 하트 팔레트 */}
              <div className="mx-auto w-full md:w-[80%] lg:w-[70%]">
                <div className="mb-2 text-xs text-[#6b533b] text-center">
                  클릭해서 하트 넣기
                </div>
                <div className="flex flex-wrap justify-center gap-2 overflow-x-auto">
                  {HEARTS.map((h) => (
                    <Button
                      key={h}
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 min-w-8 px-2  hover:cursor-pointer"
                      onClick={() => insertAtCursor(h)}
                      title={`${h} 삽입`}
                    >
                      <span className="text-lg leading-none">{h}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* 내 답변 (중앙 정렬, 텍스트/입력칸 확대) */}
              <div className="mx-auto w-full md:w-[80%] lg:w-[70%] space-y-2 text-center">
                <Textarea
                  ref={textareaRef}
                  id="answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onBlur={() => autoSaveIfNeeded("blur")}
                  placeholder={
                    submitted
                      ? "언제든 수정하면 자동 저장돼요."
                      : "이곳에 답변을 입력해주세요..."
                  }
                  className="mx-auto min-h-[220px] md:min-h-[260px] resize-none bg-blue-50 text-base md:text-lg leading-relaxed"
                />

                {/* 저장 상태 */}
                <div className="h-5 text-xs text-muted-foreground">
                  {saveStatus === "saving" && "자동 저장 중..."}
                  {saveStatus === "saved" && (
                    <span className="text-emerald-700">저장됨</span>
                  )}
                  {saveStatus === "error" && (
                    <span className="text-rose-600">
                      저장 실패. 네트워크를 확인해주세요.
                    </span>
                  )}
                </div>
              </div>
            </CardContent>

            {/* 버튼 (중앙) */}
            <CardFooter className="justify-center pb-8">
              {!submitted ? (
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={submitting || answer.trim() === ""}
                  className="min-w-[180px] h-11 text-base hover:cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      제출 중...
                    </>
                  ) : (
                    "답변 제출하기"
                  )}
                </Button>
              ) : (
                <div className="text-sm text-[#6b533b]">
                  수정 내용은 자동으로 저장됩니다 ✨
                </div>
              )}
            </CardFooter>
          </>
        )}
      </Card>
    </main>
  );
}
