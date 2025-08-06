import supabase from "@/lib/supabase";
export interface Notification {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  from_user_id: string;
}

export async function getNotifications(
  userId: string
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5); // 최신 5개만

  if (error) {
    console.error("알림 불러오기 실패:", error.message);
    return [];
  }

  return data as Notification[];
}
