// utils/tasks/deleteUserDailyTask.ts
import supabase from "@/lib/supabase";

/**
 * 주어진 userId의 daily_task 레코드를 삭제
 * @param userId 유저의 UUID
 * @returns { error } - 에러 발생 시 Error 객체, 성공 시 null
 */
export async function deleteUserDailyTask(userId: string) {
  if (!userId) {
    return { error: new Error("❌ userId가 없습니다.") };
  }

  const { error } = await supabase
    .from("daily_task")
    .delete()
    .eq("user_id", userId);

  if (error) {
    console.error("❌ daily_task 삭제 실패:", error.message);
    return { error };
  }

  console.log(`✅ ${userId}의 daily_task 삭제 완료`);
  return { error: null };
}
