import supabase from "@/lib/supabase";

export type DailyTaskProgress = {
  completed: boolean;
  question_id: number;
  date?: string | null;
};

export function getTodayDateString() {
  return new Date().toLocaleDateString("sv-SE");
}

export function isTaskFromToday(taskDate?: string | null) {
  return taskDate?.slice(0, 10) === getTodayDateString();
}

export async function ensureDailyTaskForToday<T extends DailyTaskProgress>({
  userId,
  task,
}: {
  userId: string;
  task: T;
}): Promise<T> {
  if (isTaskFromToday(task.date)) return task;

  const today = getTodayDateString();

  const { error } = await supabase
    .from("daily_task")
    .update({
      completed: false,
      date: today,
    })
    .eq("user_id", userId);

  if (error) throw error;

  return {
    ...task,
    completed: false,
    date: today,
  };
}
