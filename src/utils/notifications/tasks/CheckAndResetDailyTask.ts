import supabase from "@/lib/supabase";

// ✅ 접속 시 호출: 오늘 날짜의 daily_task가 없으면 새로 만들고, 어제면 초기화
export async function CheckAndResetDailyTask(
  userId: string,
  coupleId: string | null
) {
  try {
    const today = new Date().toLocaleDateString("sv-SE"); // "YYYY-MM-DD"

    if (!coupleId) {
      console.log("🚫 커플이 아니므로 task 기록 생략");
      return;
    }

    console.log(today);
    const { data: taskRow, error: fetchError } = await supabase
      .from("daily_task")
      .select("date")
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      console.error("❌ daily_task 조회 실패:", fetchError.message);
      return;
    }

    if (!taskRow) {
      // ✅ 기록이 없으면 새로 생성
      const { error: insertError } = await supabase.from("daily_task").insert({
        user_id: userId,
        couple_id: coupleId,
        date: today,
        completed: false,
      });

      if (insertError) {
        console.error("❌ daily_task 생성 실패:", insertError.message);
      } else {
        console.log("✅ daily_task 생성 완료");
      }
    } else if (taskRow.date !== today) {
      // ✅ 기록은 있는데 날짜가 어제면 초기화
      const { error: updateError } = await supabase
        .from("daily_task")
        .update({ date: today, completed: false })
        .eq("user_id", userId);

      if (updateError) {
        console.error("❌ daily_task 날짜 초기화 실패:", updateError.message);
      } else {
        console.log("✅ daily_task 오늘로 초기화 완료");
      }
    } else {
      console.log("ℹ️ 오늘 이미 접속했음. task 무시");
    }
  } catch (err) {
    console.error("❌ 처리 중 예외 발생:", err);
  }
}
