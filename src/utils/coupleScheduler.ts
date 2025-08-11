// src/utils/coupleScheduler.ts
import supabase from "@/lib/supabase";

export type ScheduleType = "데이트" | "기념일" | "기타 일정";

export interface CoupleSchedule {
  id: string;
  couple_id: string;
  writer: string;
  writer_nickname: string;
  title: string;
  type: ScheduleType;
  description: string;
  schedule_date: string; // "YYYY-MM-DD"
  created_at: string;
}

export interface CreateScheduleInput {
  coupleId: string;
  writerId: string;
  writerNickname: string;
  title: string;
  type: ScheduleType;
  description: string;
  scheduleDate: string; // "YYYY-MM-DD"
}

export async function createCoupleSchedule(input: CreateScheduleInput) {
  const {
    coupleId,
    writerId,
    writerNickname,
    title,
    type,
    description,
    scheduleDate,
  } = input;

  const { data, error } = await supabase
    .from("couple_scheduler")
    .insert({
      couple_id: coupleId,
      writer: writerId,
      writer_nickname: writerNickname,
      title,
      type,
      description,
      schedule_date: scheduleDate,
    })
    .select("*")
    .single();

  return { data: data as CoupleSchedule | null, error };
}

export async function deleteCoupleSchedule(id: string) {
  const { error } = await supabase
    .from("couple_scheduler")
    .delete()
    .eq("id", id);
  return { error };
}

export interface UpdateScheduleInput {
  id: string;
  title?: string;
  type?: ScheduleType;
  description?: string;
  scheduleDate?: string; // "YYYY-MM-DD"
}

export async function updateCoupleSchedule(input: UpdateScheduleInput) {
  const { id, title, type, description, scheduleDate } = input;
  const payload: Record<string, unknown> = {};
  if (title !== undefined) payload.title = title;
  if (type !== undefined) payload.type = type;
  if (description !== undefined) payload.description = description;
  if (scheduleDate !== undefined) payload.schedule_date = scheduleDate;

  const { data, error } = await supabase
    .from("couple_scheduler")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  return { data: data as CoupleSchedule | null, error };
}

export async function getSchedulesByMonth(
  coupleId: string,
  year: number,
  month0: number
) {
  // month0: 0~11
  const first = new Date(Date.UTC(year, month0, 1));
  const last = new Date(Date.UTC(year, month0 + 1, 0));
  const fromISO = first.toISOString().slice(0, 10);
  const toISO = last.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("couple_scheduler")
    .select("*")
    .eq("couple_id", coupleId)
    .gte("schedule_date", fromISO)
    .lte("schedule_date", toISO)
    .order("schedule_date", { ascending: true });

  return { data: (data as CoupleSchedule[]) || [], error };
}
