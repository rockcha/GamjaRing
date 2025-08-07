import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { increaseCouplePoint } from "./IncreaseCouplePoint";

// ✅ 오늘 task 완료 처리 + 감자 포인트 1 증가 (couple_points 테이블 기준)
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
      .select("completed")
      .eq("user_id", user.id)
      .eq("date", today)
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

    // 2. task 완료 처리
    const { error: updateError } = await supabase
      .from("daily_task")
      .update({ completed: true })
      .eq("user_id", user.id)
      .eq("date", today);

    if (updateError) {
      console.error("❌ task 완료 처리 실패:", updateError.message);
      return;
    }

    // 3. 커플 포인트 증가 (✅ couple_points 테이블 기반)
    await increaseCouplePoint(couple.id);

    console.log("✅ task 완료 + 감자 포인트 +1 성공!");
  };

  return { completeTask };
}
