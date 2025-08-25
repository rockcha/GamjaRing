import { useEffect, useState, useCallback } from "react";
import { GetQuestionById } from "@/utils/GetQuestionById";
import { useUser } from "@/contexts/UserContext";
import { useCompleteTask } from "@/utils/tasks/CompleteTask";
import { useToast } from "@/contexts/ToastContext";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import supabase from "@/lib/supabase";

// ✅ shadcn/ui
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../ui/card";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { Loader2, PencilLine, CheckCircle2, Ban } from "lucide-react";

export default function TodayQuestionPanel() {
  const { user } = useUser();
  const { completeTask } = useCompleteTask();
  const { open } = useToast();

  const [question, setQuestion] = useState<string | null>(null);
  const [questionId, setQuestionId] = useState<number | null>(null);
  const [answer, setAnswer] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // 질문 텍스트 로드
  const loadQuestionText = useCallback(async (qid: number | null) => {
    if (qid == null || qid < 0) return null;
    return await GetQuestionById(qid);
  }, []);

  // 내 답변 로드
  const loadMyAnswer = useCallback(
    async (qid: number | null) => {
      if (!qid || !user?.id) return null;
      const { data, error } = await supabase
        .from("answer")
        .select("content")
        .eq("user_id", user.id)
        .eq("question_id", qid)
        .maybeSingle();
      if (error) {
        console.error("❌ 답변 조회 실패:", error.message);
        return null;
      }
      return data?.content ?? null;
    },
    [user?.id]
  );

  // 보여줄 ID 계산
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
        console.error("❌ daily_task 조회 실패:", error?.message);
        setLoading(false);
        return;
      }

      setQuestionId(data.question_id);
      setSubmitted(data.completed);
      setIsEditing(false);

      const displayId = computeDisplayId(data.question_id, data.completed);
      if (displayId == null) {
        setQuestion("문제가 발생했습니다.");
        setAnswer("");
        setLoading(false);
        return;
      }

      const questionText = await loadQuestionText(displayId);
      setQuestion(questionText ?? "");

      if (data.completed) {
        const myAns = await loadMyAnswer(displayId);
        setAnswer(myAns ?? "");
      } else {
        setAnswer("");
      }

      setLoading(false);
    };

    fetchQuestion();
  }, [user, computeDisplayId, loadQuestionText, loadMyAnswer]);

  // 제출
  const handleSubmitAnswer = useCallback(async () => {
    if (!user || questionId == null) return;
    const displayId = questionId;

    if (!answer.trim()) return;
    setSubmitting(true);

    const { error: insertError } = await supabase.from("answer").insert({
      user_id: user.id,
      question_id: displayId,
      content: answer.trim(),
    });

    if (insertError) {
      console.error("❌ 답변 저장 실패:", insertError.message);
      setSubmitting(false);
      open("답변 저장 실패ㅠㅠ ", 3000);
      return;
    }

    // 알림
    if (user.partner_id) {
      const { error } = await sendUserNotification({
        senderId: user.id,
        receiverId: user.partner_id,
        type: "답변등록",
        description: `${user.nickname}님이 답변을 등록했어요! `,
        isRequest: false,
      });
      if (error) open("알림 전송 실패", 2000);
      else open("알림 전송 완료!", 2000);
    }

    // 완료 처리
    await completeTask();

    setQuestionId((prev) => (prev == null ? null : prev + 1));
    setSubmitted(true);
    setIsEditing(false);
    setSubmitting(false);
  }, [user, questionId, answer, completeTask, open]);

  // 수정 토글/저장
  const handleToggleEdit = useCallback(async () => {
    if (!user) return;

    const displayId = computeDisplayId(questionId, true);
    if (displayId == null || displayId < 0) {
      open("수정할 질문이 없습니다.", 2500);
      return;
    }

    // 편집 시작
    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    // 저장
    const trimmed = (answer ?? "").trim();
    if (!trimmed) {
      open("내용이 비어 있습니다.", 2500);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase
      .from("answer")
      .update({ content: trimmed })
      .eq("user_id", user.id)
      .eq("question_id", displayId);

    if (error) {
      console.error("❌ 답변 수정 실패:", error.message);
      open("답변 수정에 실패했어요. 잠시 후 다시 시도해주세요.", 3000);
      setSubmitting(false);
      return;
    }

    if (user.partner_id) {
      const { error } = await sendUserNotification({
        senderId: user.id,
        receiverId: user.partner_id,
        type: "답변수정",
        description: `${user.nickname}님이 답변을 수정했어요! `,
        isRequest: false,
      });
      if (error) open("알림 전송 실패", 2000);
      else open("알림 전송 완료!", 2000);
    }

    setSubmitting(false);
    setIsEditing(false);
    open("답변을 수정했어요 ✏️", 2000);
  }, [user, questionId, answer, isEditing, computeDisplayId, open]);

  if (loading) {
    return (
      <Card className="mx-auto w-full max-w-2xl">
        <CardContent className="p-8 flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          로딩 중...
        </CardContent>
      </Card>
    );
  }

  const currentDisplayId = computeDisplayId(questionId, submitted);

  return (
    <Card className="mx-auto mt-20 w-full max-w-2xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-[#b75e20]">오늘의 질문</CardTitle>
        <CardDescription>
          {currentDisplayId != null ? `Q.ID: ${currentDisplayId}` : ""}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 질문 */}
        <p className="text-base md:text-lg text-[#5b3d1d] whitespace-pre-line">
          {question ? `"${question}"` : "질문을 불러오지 못했습니다."}
        </p>

        {/* 상태 배너 */}
        <div className="flex justify-center">
          {submitted ? (
            <Badge
              variant="outline"
              className="gap-2 border-green-300 bg-green-50 text-green-800"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">답변 완료</span>
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="gap-2 border-rose-300 bg-rose-50 text-rose-700"
            >
              <Ban className="h-4 w-4" />
              <span className="font-medium">답변 미제출</span>
            </Badge>
          )}
        </div>

        <Separator />

        {/* 답변 입력 */}
        <div className="mx-auto w-full md:w-[70%] space-y-2">
          <label
            htmlFor="answer"
            className="block text-sm text-[#5b3d1d] font-medium"
          >
            내 답변
          </label>

          <Textarea
            id="answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={
              submitted ? undefined : "이곳에 답변을 입력해주세요..."
            }
            className={[
              "min-h-[120px] resize-none ",
              submitted && !isEditing ? "bg-white cursor-default" : "bg-white",
            ].join(" ")}
            disabled={submitted && !isEditing}
          />
        </div>
      </CardContent>

      <CardFooter className="justify-center">
        {!submitted ? (
          <Button
            onClick={handleSubmitAnswer}
            disabled={submitting || answer.trim() === ""}
            className="min-w-[160px]"
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
          <Button
            onClick={handleToggleEdit}
            disabled={submitting}
            variant={isEditing ? "default" : "outline"}
            className="min-w-[160px] gap-2"
          >
            {isEditing ? (
              submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                "수정 완료"
              )
            ) : (
              <>
                <PencilLine className="h-4 w-4" />내 답변 수정하기
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
