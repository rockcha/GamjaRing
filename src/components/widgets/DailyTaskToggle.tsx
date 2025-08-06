import { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { useCompleteTask } from "@/utils/notifications/tasks/CompleteTask";
import supabase from "@/lib/supabase";

export default function DailyTaskToggle() {
  const { user } = useUser();
  const { completeTask } = useCompleteTask();

  const [loading, setLoading] = useState(false);
  const [today, setToday] = useState("");
  const [isEligible, setIsEligible] = useState(false); // ✅ 버튼 활성화 여부 판단

  useEffect(() => {
    const date = new Date().toISOString().split("T")[0];
    setToday(date as string);
  }, []);

  const checkEligibility = async () => {
    if (!user) {
      console.warn("❌ 유저 정보가 없습니다.");
      setIsEligible(false);
      return;
    }

    if (!today) {
      console.warn("❌ 오늘 날짜가 설정되지 않았습니다.");
      setIsEligible(false);
      return;
    }

    const { data, error } = await supabase
      .from("daily_task")
      .select("completed")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle();

    if (error) {
      console.error("❌ task 조회 실패:", error.message);
      setIsEligible(false);
      return;
    }

    if (!data) {
      console.warn("⚠️ 오늘의 task 기록이 없습니다.");
      setIsEligible(false);
      return;
    }

    if (data.completed) {
      console.log("✅ 오늘 task는 이미 완료되었습니다.");
      setIsEligible(false);
      return;
    }

    console.log("✅ task 완료 요건 충족: 아직 완료되지 않은 task입니다.");
    setIsEligible(true);
  };

  const handleClick = async () => {
    if (!user) {
      console.warn("❌ 유저 정보가 없습니다.");
      return;
    }

    if (!isEligible) {
      console.warn("⚠️ 현재 task를 완료할 수 없습니다.");
      return;
    }

    setLoading(true);

    await completeTask();

    console.log("🎉 task 완료 처리 완료!");
    await checkEligibility(); // 상태 갱신

    setLoading(false);
  };

  // 초기 상태 확인
  useEffect(() => {
    if (user && today) {
      checkEligibility();
    }
  }, [user, today]);

  return (
    <div className="flex justify-center py-4">
      <button
        onClick={handleClick}
        disabled={loading || !isEligible}
        className={`px-6 py-3 rounded-lg font-semibold shadow transition
          ${
            isEligible
              ? "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
              : "bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed"
          }
        `}
      >
        {loading ? "처리 중..." : "🥔 오늘의 task 완료하기"}
      </button>
    </div>
  );
}
