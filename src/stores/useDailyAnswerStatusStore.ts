import { create } from "zustand";

type DailyAnswerStatus = {
  userId: string | null;
  questionId: number | null;
  completed: boolean;
  loading: boolean;
  error: string | null;
  setStatus: (status: {
    userId?: string | null;
    questionId?: number | null;
    completed?: boolean;
    loading?: boolean;
    error?: string | null;
  }) => void;
  reset: () => void;
};

const initialState = {
  userId: null,
  questionId: null,
  completed: false,
  loading: true,
  error: null,
};

export const useDailyAnswerStatusStore = create<DailyAnswerStatus>((set) => ({
  ...initialState,
  setStatus: (status) => set((prev) => ({ ...prev, ...status })),
  reset: () => set(initialState),
}));
