import supabase from "@/lib/supabase";

/**
 * 주어진 ID에 해당하는 질문 content를 반환합니다.
 * @param id 질문 ID (0 ~ 399)
 * @returns 질문 문자열 (없으면 null)
 */
export async function GetQuestionById(id: number): Promise<string | null> {
  const { data, error } = await supabase
    .from("question")
    .select("content")
    .eq("id", id)
    .single();

  if (error) {
    console.error("❌ 질문 조회 실패:", error.message);
    return null;
  }

  return data?.content ?? null;
}
