import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { increaseCouplePoint } from "./IncreaseCouplePoint";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";

export function useCompleteTask() {
  const { user } = useUser();
  const { couple, addGold } = useCoupleContext(); // ✅ addGold 가져오기

  const completeTask = async () => {
    const today = new Date().toLocaleDateString("sv-SE");

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

    const nextQuestionId = ((task.question_id ?? 0) + 1) % 400;

    // 2. task 완료 처리
    const { error: updateError } = await supabase
      .from("daily_task")
      .update({ completed: true, question_id: nextQuestionId, date: today })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("❌ task 완료 처리 실패:", updateError.message);
      return;
    }

    // 커플 포인트 증가
    await increaseCouplePoint(couple.id);

    // 알림 전송
    if (user?.partner_id) {
      const { error: notificationError } = await sendUserNotification({
        senderId: user.id,
        receiverId: user.partner_id,
        type: "답변등록",
        isRequest: false,
      });
      if (notificationError) {
        console.error("❌ 알림 전송 실패:", notificationError.message);
      }
    } else {
      console.warn("❌ 파트너 ID가 없습니다. 알림 전송 중단");
    }

    // ✅ 골드 15 추가
    try {
      await addGold(15);
    } catch (e) {
      console.error("❌ 골드 지급 실패:", e);
    }
  };

  return { completeTask };
}
