export const QUESTION_ID_MIN = 1;
export const QUESTION_ID_STEP = 2;
export const QUESTION_ID_MAX = 399;

export function getNextQuestionId(currentId?: number | null): number {
  const baseId =
    typeof currentId === "number"
      ? currentId
      : QUESTION_ID_MIN - QUESTION_ID_STEP;
  const nextId = baseId + QUESTION_ID_STEP;

  return nextId > QUESTION_ID_MAX ? QUESTION_ID_MIN : nextId;
}
