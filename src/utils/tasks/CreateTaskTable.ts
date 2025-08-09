// src/utils/tasks/CreateTaskTable.ts
import supabase from "@/lib/supabase";

export async function CreateTaskTable({
  userId,
  coupleId,
}: {
  userId: string;
  coupleId: string;
}): Promise<{ error: Error | null }> {
  const today = new Date().toISOString().split("T")[0]; // yyyy-mm-dd

  // 1. 기존 task 존재 여부 확인
  const { data: taskRow, error: fetchError } = await supabase
    .from("daily_task")
    .select("date")
    .eq("user_id", userId)
    .maybeSingle();

  // 2. 없으면 새로 생성
  if (!taskRow) {
    const { error: insertError } = await supabase.from("daily_task").insert({
      user_id: userId,
      couple_id: coupleId,
      date: today,
      completed: false,
      question_id: 0,
    });

    if (insertError) {
      return {
        error: new Error("daily_task 생성 실패: " + insertError.message),
      };
    }
  } else {
    return { error: new Error("task 존재하는데 task 생성 시도 ") };
  }

  // 3. 성공
  return { error: null };
}
