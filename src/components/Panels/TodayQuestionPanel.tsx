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
      console.log(`질문 답변 여부 : ${data.completed}`);
      setQuestionId(data.question_id);
      setSubmitted(data.completed);

      // 보여줄 대상 question_id 결정

      const displayId = computeDisplayId(data.question_id, data.completed);
      console.log(displayId);
      if (displayId == null) {
        // ✅ null 또는 undefined만 체크
        setQuestion("문제가 발생했습니다.");
        setAnswer("");
        setLoading(false);
        console.log("displayID는 null");
        return;
      }
      // 질문 로드
      const questionText = await loadQuestionText(displayId);
      setQuestion(questionText);

      console.log(`현재 보여지는 질문: ${questionText}`);
      // 완료 상태라면 해당 전 질문의 내 답변도 로드
      if (data.completed) {
        const myAns = await loadMyAnswer(displayId);
        setAnswer(myAns ?? "");
      } else {
        setAnswer(""); // 아직 미완료면 입력 초기화
        //console.log("아직 미완료면 입력 초기화");
      }

      setLoading(false);
    };

    fetchQuestion();
  }, [user, computeDisplayId, loadQuestionText, loadMyAnswer]);

  const handleSubmitAnswer = useCallback(async () => {
    if (!user || questionId == null) return;

    // 제출 시점에 “현재 보여주는 질문” id는:
    // - 미완료 상태이므로 displayId = questionId
    const displayId = questionId;

    if (!answer.trim()) return;
    setSubmitting(true);
    console.log(displayId);
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

    if (user.partner_id) {
      const { error } = await sendUserNotification({
        senderId: user.id,
        receiverId: user.partner_id,
        type: "답변등록", // NotificationType 중 하나
        description: `${user.nickname}님이 답변을 등록했어요! `,
        isRequest: false,
      });

      if (error) {
        open("알림 전송 실패", 2000);
      } else {
        open("알림 전송 완료!", 2000);
      }
    }

    // 2) 완료 처리 (이 과정에서 서버는 daily_task.question_id를 +1 올린다고 가정)
    await completeTask();

    // ✅ 클라이언트도 questionId를 +1로 올려서,
    //    이후 UI가 “전 질문”을 계속 가리키도록 맞춰줌
    setQuestionId((prev) => (prev == null ? null : prev + 1));
    setSubmitted(true);
    setSubmitting(false);
    // → 이제 렌더링 시 displayId = (questionId + 1) - 1 = 방금 제출한 질문
    //    answer는 이미 state에 있으므로 그대로 읽기 전용 표기됨
  }, [user, questionId, answer, completeTask]);

  const handleModifyClick = useCallback(async () => {
    if (!user) return;

    // 완료 화면에서 보여주는 질문 ID(= 직전에 제출했던 질문)
    const displayId = computeDisplayId(questionId, true);
    if (displayId == null) {
      open("수정할 질문이 없습니다.", 2500);
      return;
    } else if (displayId < 0) {
      open("질문 번호가 음수입니다.", 2500);
      return;
    }

    if (!answer?.trim()) {
      open("수정할 기존 답변이 없습니다.", 2500);
      return;
    }

    // 간단 편집 UI: 브라우저 prompt (필요하면 나중에 커스텀 모달로 교체)
    const next = window.prompt("답변을 수정하세요.", answer);
    if (next == null) return; // 사용자 취소
    const trimmed = next.trim();

    if (!trimmed) {
      open("내용이 비어 있습니다.", 2500);
      return;
    }
    if (trimmed === answer.trim()) {
      open("변경된 내용이 없습니다.", 2000);
      return;
    }

    // DB 업데이트
    const { error } = await supabase
      .from("answer")
      .update({ content: trimmed })
      .eq("user_id", user.id)
      .eq("question_id", displayId);

    if (error) {
      console.error("❌ 답변 수정 실패:", error.message);
      open("답변 수정에 실패했어요. 잠시 후 다시 시도해주세요.", 3000);
      return;
    }
    if (user.partner_id) {
      const { error } = await sendUserNotification({
        senderId: user.id,
        receiverId: user.partner_id,
        type: "답변수정", // NotificationType 중 하나
        description: `${user.nickname}님이 답변을 수정했어요! `,
        isRequest: false,
      });

      if (error) {
        open("알림 전송 실패", 2000);
      } else {
        open("알림 전송 완료!", 2000);
      }
    }
    // 로컬 반영 + 알림
    setAnswer(trimmed);
    open("답변을 수정했어요 ✏️", 2000);
  }, [user, questionId, answer, computeDisplayId, open]);
  if (loading) return <div>로딩 중...</div>;

  // 현재 렌더에서 보여줄 question_id (읽기용)
  const currentDisplayId = computeDisplayId(questionId, submitted);

  return (
    <div className="w-2/3 absolute left-1/2 -translate-x-1/2 bg-[#fffaf4] rounded-xl p-6 border text-center">
      <h2 className="text-xl font-bold text-[#b75e20] mb-2">오늘의 질문</h2>

      <p className="text-xs text-gray-500 mb-1">
        {currentDisplayId ? `Q.ID: ${currentDisplayId}` : ""}
      </p>

      <p className="text-base text-[#5b3d1d] whitespace-pre-line mb-6">
        {question ? `"${question}"` : "질문을 불러오지 못했습니다."}
      </p>

      {/* 입력 영역: md 이상에서 70% 폭 */}
      <div className="mx-auto w-full md:w-[70%]">
        <label
          htmlFor="answer"
          className="block text-sm text-[#5b3d1d] mb-1 font-medium text-left"
        >
          내 답변
        </label>

        {/* 완료면 읽기 전용으로 내 답변만 표시 */}
        <textarea
          id="answer"
          className={[
            "w-full min-h-[120px] p-4 border border-[#d3b7a6] rounded-lg",
            "text-sm md:text-base resize-none focus:outline-none focus:ring-2 focus:ring-[#e4bfa4]",
            "bg-white placeholder:text-gray-400",
            submitted ? "cursor-default bg-[#fffefb]" : "",
          ].join(" ")}
          disabled={submitted}
          readOnly={submitted}
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
          <>
            {/* 아래쪽에 확실한 완료 배너 */}
            <div className="mt-5 rounded-lg border border-green-300 bg-green-50 text-green-800 px-4 py-3 flex items-center justify-center gap-2">
              <span className="text-lg">✅</span>
              <span className="font-semibold">오늘의 질문 답변 완료!</span>
            </div>

            {/* 선택: 수정하기 버튼 (아웃라인) */}
            <button
              onClick={handleModifyClick}
              className="mt-3 inline-flex items-center justify-center px-4 py-2 rounded-md border border-[#d3b7a6] text-[#b75e20] hover:bg-[#f6e9de] text-sm transition"
            >
              ✏️ 내 답변 수정하기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
