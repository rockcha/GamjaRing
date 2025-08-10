import { useEffect, useState, useCallback } from "react";
import { GetQuestionById } from "@/utils/GetQuestionById";
import { useUser } from "@/contexts/UserContext";
import { useCompleteTask } from "@/utils/tasks/CompleteTask";
import { useToast } from "@/contexts/ToastContext";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import supabase from "@/lib/supabase";

export default function TodayQuestionPanel() {
  const { user } = useUser();
  const { completeTask } = useCompleteTask();

  const [question, setQuestion] = useState<string | null>(null);
  const [questionId, setQuestionId] = useState<number | null>(null); // DB의 현재 question_id
  const [answer, setAnswer] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false); // daily_task.completed
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 🔹 추가: 완료 화면에서 인라인 수정 모드
  const [isEditing, setIsEditing] = useState(false);

  const { open } = useToast();

  // 특정 questionId의 질문 텍스트 로드
  const loadQuestionText = useCallback(async (qid: number | null) => {
    if (qid == null || qid < 0) return null;
    return await GetQuestionById(qid);
  }, []);

  // 특정 questionId의 내 답변 로드
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

  // 화면에 보여줄 question_id 계산: 완료면 전 문제, 아니면 현재 문제
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
      setIsEditing(false); // 새로 진입 시 편집모드 해제

      // 보여줄 대상 question_id 결정
      const displayId = computeDisplayId(data.question_id, data.completed);
      if (displayId == null) {
        setQuestion("문제가 발생했습니다.");
        setAnswer("");
        setLoading(false);
        return;
      }

      // 질문 로드
      const questionText = await loadQuestionText(displayId);
      setQuestion(questionText ?? "");

      // 완료 상태라면 전 질문의 내 답변도 로드
      if (data.completed) {
        const myAns = await loadMyAnswer(displayId);
        setAnswer(myAns ?? "");
      } else {
        setAnswer(""); // 아직 미완료면 입력 초기화
      }

      setLoading(false);
    };

    fetchQuestion();
  }, [user, computeDisplayId, loadQuestionText, loadMyAnswer]);

  const handleSubmitAnswer = useCallback(async () => {
    if (!user || questionId == null) return;

    // 제출 시점에 “현재 보여주는 질문” id는 미완료 상태 → displayId = questionId
    const displayId = questionId;

    if (!answer.trim()) return;
    setSubmitting(true);

    // 1) 답변 저장
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

    // 파트너에게 알림
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

    // 2) 완료 처리(서버에서 question_id +1 가정)
    await completeTask();

    // 클라이언트도 questionId +1 및 상태 갱신
    setQuestionId((prev) => (prev == null ? null : prev + 1));
    setSubmitted(true);
    setIsEditing(false);
    setSubmitting(false);
  }, [user, questionId, answer, completeTask, open]);

  // 🔹 수정 버튼 토글: 편집 시작/종료 + 저장
  const handleToggleEdit = useCallback(async () => {
    if (!user) return;

    // 완료 화면에서 보여주는 질문 ID(= 직전에 제출했던 질문)
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

    // 편집 종료 → 저장 시도
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

    // 알림
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

  if (loading) return <div>로딩 중...</div>;

  // 현재 렌더에서 보여줄 question_id (읽기용)
  const currentDisplayId = computeDisplayId(questionId, submitted);

  // 상태 배너 공용 스타일
  const bannerBase =
    "mt-5 w-[200px] mx-auto rounded-lg px-4 py-3 flex items-center justify-center gap-2 text-sm md:text-base";
  const bannerDone = "border border-green-300 bg-green-50 text-green-800";
  const bannerTodo = "border border-rose-300 bg-rose-50 text-rose-700";

  return (
    <div className="w-1/2  absolute left-1/2 -translate-x-1/2 bg-[#fffaf4] rounded-xl p-6 border text-center ">
      <h2 className="text-xl font-bold text-[#b75e20] mb-2">오늘의 질문</h2>

      <p className="text-xs text-gray-500 mb-1">
        {currentDisplayId ? `Q.ID: ${currentDisplayId}` : ""}
      </p>

      <p className="text-lg text-[#5b3d1d] whitespace-pre-line mb-4">
        {question ? `"${question}"` : "질문을 불러오지 못했습니다."}
      </p>

      {/* 🔹 항상 노출되는 상태 배너 */}
      <div
        className={[bannerBase, submitted ? bannerDone : bannerTodo].join(" ")}
      >
        {submitted ? (
          <>
            <span className="text-lg">✅</span>
            <span className="font-semibold"> 답변 완료!</span>
          </>
        ) : (
          <>
            <span className="text-lg">⛔</span>
            <span className="font-semibold">답변 미제출</span>
          </>
        )}
      </div>

      {/* 입력 영역: md 이상에서 70% 폭 */}
      <div className="mx-auto w-full md:w-[70%] mt-4">
        <label
          htmlFor="answer"
          className="block text-sm text-[#5b3d1d] mb-1 font-medium text-left"
        >
          내 답변
        </label>

        {/* 완료 + 편집 아님 → 읽기 전용 / 편집 중 → 활성화 */}
        <textarea
          id="answer"
          className={[
            "w-full min-h-[120px] p-4 border border-[#d3b7a6] rounded-lg",
            "text-sm md:text-base resize-none focus:outline-none focus:ring-2 focus:ring-[#e4bfa4]",
            "bg-white placeholder:text-gray-400",
            submitted && !isEditing ? "cursor-default bg-[#fffefb]" : "",
          ].join(" ")}
          disabled={submitted && !isEditing}
          readOnly={submitted && !isEditing}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={submitted ? undefined : "이곳에 답변을 입력해주세요..."}
        />

        {/* 버튼/상태 영역 */}
        {!submitted ? (
          <button
            className="mt-4 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-md text-sm transition"
            onClick={handleSubmitAnswer}
            disabled={submitting || answer.trim() === ""}
          >
            {submitting ? "제출 중..." : "답변 제출하기"}
          </button>
        ) : (
          <button
            onClick={handleToggleEdit}
            className={[
              "mt-3 inline-flex items-center justify-center px-4 py-2 rounded-md text-sm transition",
              isEditing
                ? "bg-[#b75e20] text-white hover:bg-[#a5531d]"
                : "border border-[#d3b7a6] text-[#b75e20] hover:bg-[#f6e9de]",
            ].join(" ")}
            disabled={submitting}
          >
            {isEditing
              ? submitting
                ? "저장 중..."
                : "수정 완료"
              : "✏️ 내 답변 수정하기"}
          </button>
        )}
      </div>
    </div>
  );
}
