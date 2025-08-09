import supabase from "@/lib/supabase";

/**
 * 특정 유저의 answer 레코드를 삭제
 * - questionId가 주어지면 해당 질문의 답변만 삭제
 * - 없으면 해당 유저의 모든 답변 삭제
 *
 * @param userId  유저 UUID
 * @param questionId  (선택) 특정 질문 ID
 * @returns { error, deletedCount }
 */
export async function DeleteUserAnswers(
  userId: string,
  questionId?: number
): Promise<{ error: Error | null; deletedCount: number }> {
  if (!userId) {
    return { error: new Error("userId가 없습니다."), deletedCount: 0 };
  }

  let query = supabase.from("answer").delete().eq("user_id", userId);

  if (typeof questionId === "number") {
    query = query.eq("question_id", questionId);
  }

  // 삭제된 행 수를 알기 위해 select 호출 (Supabase는 delete 후 select 허용)
  const { data, error } = await query.select("user_id");

  if (error) {
    console.error("❌ answer 삭제 실패:", error.message);
    return { error, deletedCount: 0 };
  }

  return { error: null, deletedCount: data?.length ?? 0 };
}
