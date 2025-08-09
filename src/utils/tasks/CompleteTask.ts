import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { increaseCouplePoint } from "./IncreaseCouplePoint";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";

export function useCompleteTask() {
  const { user } = useUser();
  const { couple } = useCoupleContext();

  const completeTask = async () => {
    const today = new Date().toLocaleDateString("sv-SE");

    // 🔒 유효성 검사
    if (!user?.id) {
      console.warn("❌ 유저 정보가 없습니다.");
      return;
    }

    if (!couple?.id) {
      console.warn("🚫 커플 정보가 없습니다. task 처리 중단");
      return;
    }

    // 1. 이미 오늘 task를 완료했는지 조회
    const { data: task, error: fetchError } = await supabase
      .from("daily_task")
      .select("completed, question_id")
      .eq("user_id", user.id)

      .maybeSingle();

    if (fetchError) {
      console.error("❌ task 조회 실패:", fetchError.message);
      return;
    }

    if (!task) {
      console.warn("⚠️ 오늘의 task가 없습니다. 초기화가 필요합니다.");
      return;
    }

    if (task.completed) {
      console.log("✅ 오늘 이미 완료한 task입니다.");
      return;
    }

    // 다음 질문 번호 설정
    const nextQuestionId = ((task.question_id ?? 0) + 1) % 400;

    // 2. task 완료 처리 + 질문 번호 올리기
    const { error: updateError } = await supabase
      .from("daily_task")
      .update({ completed: true, question_id: nextQuestionId })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("❌ task 완료 처리 실패:", updateError.message);
      return;
    }

    // 커플 포인트 증가 (✅ couple_points 테이블 기반)
    await increaseCouplePoint(couple.id);

    //파트너 id 유효확인 -> receiver_id 가 string만 허용
    if (!user?.partner_id) {
      console.warn("❌ 파트너 ID가 없습니다. 알림 전송 중단");
      return;
    }

    const { error } = await sendUserNotification({
      senderId: user.id,
      receiverId: user.partner_id, // 상대방의 Supabase UUID
      type: "답변등록",
      description: `${user.nickname}님이 오늘의 질문에 답변했어요! 📝`,
      isRequest: false,
    });
  };

  return { completeTask };
}
