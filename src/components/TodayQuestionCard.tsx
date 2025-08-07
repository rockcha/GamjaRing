import { useEffect, useState } from "react";
import { GetQuestionById } from "@/utils/GetQuestionById";
import { useUser } from "@/contexts/UserContext";
import { useCompleteTask } from "@/utils/tasks/CompleteTask";

import supabase from "@/lib/supabase";

export default function TodayQuestionCard() {
  const { user } = useUser();
  const [question, setQuestion] = useState<string | null>(null);
  const [questionId, setQuestionId] = useState<number | null>(null);
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const [answer, setAnswer] = useState("");
  const [writing, setWriting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { completeTask } = useCompleteTask();

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

      setCompleted(data.completed);
      setQuestionId(data.question_id);

      if (!data.completed) {
        const questionText = await GetQuestionById(data.question_id);
        setQuestion(questionText);
      }

      setLoading(false);
    };

    fetchQuestion();
  }, [user]);

  const handleSubmitAnswer = async () => {
    if (!user || questionId == null || !answer.trim()) return;
    setSubmitting(true);

    // ✅ 1. answer 테이블에 저장
    const { error: insertError } = await supabase.from("answer").insert({
      user_id: user.id,
      question_id: questionId,
      content: answer.trim(),
    });

    if (insertError) {
      console.error("❌ 답변 저장 실패:", insertError.message);
      setSubmitting(false);
      return;
    }

    // ✅ 2. daily_task.completed 업데이트

    await completeTask();

    // TODO: 상대방에게 알림 전송

    setCompleted(true);
    setSubmitting(false);
  };

  if (loading) return <div>로딩 중...</div>;

  return (
    <div className="bg-white rounded-xl p-6 shadow-md text-center">
      {completed ? (
        <p className="text-lg font-semibold text-green-600">
          오늘 답변 완료! ✅
        </p>
      ) : question ? (
        <>
          <p className="text-lg font-semibold mb-2 text-gray-800">
            오늘의 질문
          </p>
          <p className="text-base text-gray-700 whitespace-pre-line mb-4">
            {question}
          </p>

          {writing ? (
            <>
              <textarea
                className="w-full border rounded-md p-2 text-sm mb-2"
                rows={4}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="답변을 입력하세요..."
              />
              <button
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-sm"
                onClick={handleSubmitAnswer}
                disabled={submitting}
              >
                {submitting ? "제출 중..." : "답변 제출하기"}
              </button>
            </>
          ) : (
            <button
              className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-white rounded-md text-sm"
              onClick={() => setWriting(true)}
            >
              답변하기
            </button>
          )}
        </>
      ) : (
        <p className="text-gray-500">질문을 불러오지 못했습니다.</p>
      )}
    </div>
  );
}
