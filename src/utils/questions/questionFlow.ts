export const QUESTION_ID_START = 19;
export const QUESTION_ID_STEP = 2;
export const QUESTION_ID_MAX = 399;

export function getNextQuestionId(currentId?: number | null): number {
  const baseId =
    typeof currentId === "number"
      ? currentId
      : QUESTION_ID_START - QUESTION_ID_STEP;
  const nextId = baseId + QUESTION_ID_STEP;

  return nextId > QUESTION_ID_MAX ? QUESTION_ID_START : nextId;
}

export function getPreviousQuestionId(currentId?: number | null): number | null {
  if (typeof currentId !== "number") return null;

  const previousId = currentId - QUESTION_ID_STEP;
  return previousId >= QUESTION_ID_START ? previousId : null;
}

export function getDisplayQuestionId(
  currentId: number | null,
  completed: boolean
): number | null {
  if (currentId == null) return null;
  if (!completed) return currentId;

  return getPreviousQuestionId(currentId);
}
