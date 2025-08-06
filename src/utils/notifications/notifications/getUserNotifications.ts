// src/utils/getUserNotifications.ts
import supabase from "@/lib/supabase";

export const getUserNotifications = async (receiverId: string) => {
  const { data, error } = await supabase
    .from("user_notification")
    .select("*")
    .eq("receiver_id", receiverId)
    .order("created_at", { ascending: false }); // 최신순 정렬

  return { data, error };
};
