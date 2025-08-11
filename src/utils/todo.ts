// src/utils/todo.ts
import supabase from "@/lib/supabase";

/** DB Row 타입 */
export interface Todo {
  id: string;
  user_id: string;
  nickname: string;
  content: string;
  completed: boolean;
  created_at: string; // ISO
}

/** 공통 응답 포맷 */
type Result<T> = { data: T | null; error: Error | null };

/**
 * 내 투두 전부 가져오기
 * - completed 필터, 정렬, 개수 제한을 옵션으로 제공
 */
export async function getMyTodos(
  userId: string,
  opts?: { completed?: boolean; limit?: number; ascending?: boolean }
): Promise<Result<Todo[]>> {
  try {
    let q = supabase.from("todo").select("*").eq("user_id", userId);

    if (typeof opts?.completed === "boolean") {
      q = q.eq("completed", opts.completed);
    }

    q = q.order("created_at", { ascending: opts?.ascending ?? false });

    if (opts?.limit) q = q.limit(opts.limit);

    const { data, error } = await q;
    if (error) return { data: null, error: new Error(error.message) };
    return { data: (data as Todo[]) ?? [], error: null };
  } catch (e: any) {
    return { data: null, error: e };
  }
}

/** 하나 추가하기 */
export async function insertTodo(input: {
  userId: string;
  nickname: string;
  content: string;
}): Promise<Result<Todo>> {
  try {
    const { data, error } = await supabase
      .from("todo")
      .insert({
        user_id: input.userId,
        nickname: input.nickname,
        content: input.content,
        completed: false,
      })
      .select("*")
      .single();

    if (error) return { data: null, error: new Error(error.message) };
    return { data: data as Todo, error: null };
  } catch (e: any) {
    return { data: null, error: e };
  }
}

/** 내용/완료여부 수정 (둘 중 하나만 보내도 됨) */
export async function updateTodo(params: {
  id: string;
  content?: string;
  completed?: boolean;
}): Promise<Result<Todo>> {
  const { id, ...patch } = params;
  if (!patch.content && typeof patch.completed !== "boolean") {
    return { data: null, error: new Error("수정할 값이 없습니다.") };
  }

  try {
    const { data, error } = await supabase
      .from("todo")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return { data: null, error: new Error(error.message) };
    return { data: data as Todo, error: null };
  } catch (e: any) {
    return { data: null, error: e };
  }
}

/** 완료 토글 */
export async function toggleTodo(id: string): Promise<Result<Todo>> {
  try {
    // 현재 completed 조회
    const { data: cur, error: fetchErr } = await supabase
      .from("todo")
      .select("completed")
      .eq("id", id)
      .single();
    if (fetchErr) return { data: null, error: new Error(fetchErr.message) };

    const { data, error } = await supabase
      .from("todo")
      .update({ completed: !cur.completed })
      .eq("id", id)
      .select("*")
      .single();

    if (error) return { data: null, error: new Error(error.message) };
    return { data: data as Todo, error: null };
  } catch (e: any) {
    return { data: null, error: e };
  }
}

/** 삭제 */
export async function deleteTodo(id: string): Promise<Result<null>> {
  try {
    const { error } = await supabase.from("todo").delete().eq("id", id);
    if (error) return { data: null, error: new Error(error.message) };
    return { data: null, error: null };
  } catch (e: any) {
    return { data: null, error: e };
  }
}
