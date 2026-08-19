import supabase from "@/lib/supabase";

export const QUESTION_ID_MIN = 1;
export const QUESTION_ID_STEP = 1;

async function getQuestionId({
  before,
  after,
  ascending,
}: {
  before?: number;
  after?: number;
  ascending: boolean;
}): Promise<number | null> {
  let query = supabase
    .from("question2")
    .select("id")
    .order("id", { ascending })
    .limit(1);

  if (before != null) query = query.lt("id", before);
  if (after != null) query = query.gt("id", after);

  const { data, error } = await query.maybeSingle<{ id: number }>();
  if (error) {
    console.error("question2 ID 조회 실패:", error.message);
    return null;
  }
  return data?.id ?? null;
}

export async function getNextQuestionId(
  currentId?: number | null,
): Promise<number> {
  const nextId = await getQuestionId({
    after: currentId ?? undefined,
    ascending: true,
  });
  if (nextId != null) return nextId;

  // 마지막 질문까지 답했다면 question2의 첫 질문부터 다시 시작합니다.
  return (await getQuestionId({ ascending: true })) ?? QUESTION_ID_MIN;
}

export async function getPreviousQuestionId(
  currentId?: number | null,
): Promise<number | null> {
  if (currentId == null) return null;

  const previousId = await getQuestionId({
    before: currentId,
    ascending: false,
  });
  if (previousId != null) return previousId;

  // 첫 질문 직후에는 마지막 question2 질문을 표시합니다.
  return await getQuestionId({ ascending: false });
}

export async function getDisplayQuestionId(
  storedQuestionId?: number | null,
  completed = false,
): Promise<number | null> {
  if (storedQuestionId == null) return null;
  return completed
    ? getPreviousQuestionId(storedQuestionId)
    : storedQuestionId;
}
