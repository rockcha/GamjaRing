import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { increaseCouplePoint } from "./IncreaseCouplePoint";
import { useDailyAnswerStatusStore } from "@/stores/useDailyAnswerStatusStore";
import { getNextQuestionId } from "@/utils/questions/questionFlow";

export function useCompleteTask() {
  const { user } = useUser();
  const { couple, addGold } = useCoupleContext();
  const setAnswerStatus = useDailyAnswerStatusStore((state) => state.setStatus);

  const completeTask = async () => {
    const today = new Date().toLocaleDateString("sv-SE");

    if (!user?.id) {
      console.warn("유저 정보가 없습니다.");
      return;
    }

    if (!couple?.id) {
      console.warn("커플 정보가 없습니다. task 처리를 중단합니다.");
      return;
    }

    const { data: task, error: fetchError } = await supabase
      .from("daily_task")
      .select("completed, question_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      console.error("task 조회 실패:", fetchError.message);
      return;
    }

    if (!task) {
      console.warn("오늘 task가 없습니다. 초기화가 필요합니다.");
      return;
    }

    if (task.completed) {
      console.log("오늘 이미 완료한 task입니다.");
      return {
        completed: true,
        question_id: task.question_id,
      };
    }

    const nextQuestionId = getNextQuestionId(task.question_id);

    const { error: updateError } = await supabase
      .from("daily_task")
      .update({ completed: true, question_id: nextQuestionId, date: today })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("task 완료 처리 실패:", updateError.message);
      return;
    }

    setAnswerStatus({
      userId: user.id,
      questionId: nextQuestionId,
      completed: true,
      loading: false,
      error: null,
    });

    await increaseCouplePoint(couple.id);

    try {
      await addGold(15);
    } catch (error) {
      console.error("골드 지급 실패:", error);
    }

    return {
      completed: true,
      question_id: nextQuestionId,
    };
  };

  return { completeTask };
}
