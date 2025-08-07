import { useEffect, useState, useCallback } from "react";
import { GetQuestionById } from "@/utils/GetQuestionById";
import { useUser } from "@/contexts/UserContext";
import { useCompleteTask } from "@/utils/tasks/CompleteTask";
import supabase from "@/lib/supabase";

export default function TodayQuestionCard() {
  const { user } = useUser();
  const { completeTask } = useCompleteTask();

  const [question, setQuestion] = useState<string | null>(null);
  const [questionId, setQuestionId] = useState<number | null>(null);
  const [answer, setAnswer] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

      setSubmitted(data.completed);
      setQuestionId(data.question_id);

      const questionText = await GetQuestionById(data.question_id);
      setQuestion(questionText);

      setLoading(false);
    };

    fetchQuestion();
  }, [user]);

  const handleSubmitAnswer = useCallback(async () => {
    if (!user || questionId == null || !answer.trim()) return;
    setSubmitting(true);

    // ✅ 1. 답변 저장
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

    // ✅ 2. 완료 처리
    await completeTask();
    setSubmitted(true);
    setSubmitting(false);
    // TODO: 상대방에게 알림 전송
  }, [user, questionId, answer, completeTask]);

  const handleModifyClick = () => {
    console.log("수정하기 버튼 클릭됨");
    // TODO: 수정 기능 로직 구현 예정
  };

  if (loading) return <div>로딩 중...</div>;

  return (
    <div className="w-full bg-white rounded-xl p-6 shadow-md text-center">
      <h2 className="text-xl font-bold text-[#b75e20] mb-2">오늘의 질문</h2>

      <p className="text-base text-[#5b3d1d] whitespace-pre-line mb-4">
        {question ? `"${question}"` : "질문을 불러오지 못했습니다."}
      </p>

      <div>
        <label
          htmlFor="answer"
          className="block text-sm text-[#5b3d1d] mb-1 font-medium"
        >
          내 답변
        </label>
        <textarea
          id="answer"
          className="w-full min-h-[100px] p-4 border border-[#d3b7a6] rounded-lg text-sm md:text-base resize-none focus:outline-none focus:ring-2 focus:ring-[#e4bfa4] bg-white placeholder:text-gray-400"
          placeholder="이곳에 답변을 입력해주세요..."
          disabled={submitted}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
      </div>

      {/* 버튼 영역 */}
      {!submitted ? (
        <button
          className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-sm"
          onClick={handleSubmitAnswer}
          disabled={submitting || answer.trim() === ""}
        >
          {submitting ? "제출 중..." : "답변 제출하기"}
        </button>
      ) : (
        <div className="flex flex-col items-center gap-2 mt-4">
          <div className="text-green-600 font-semibold">답변 완료! ✅</div>
          <button
            onClick={handleModifyClick}
            className="text-sm text-[#b75e20] hover:underline"
          >
            ✏️ 수정하기
          </button>
        </div>
      )}
    </div>
  );
}
