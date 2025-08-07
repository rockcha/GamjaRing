// src/utils/deleteUserNotification.ts
import supabase from "@/lib/supabase";

export const deleteUserNotification = async (notificationId: string) => {
  const { error } = await supabase
    .from("user_notification")
    .delete()
    .eq("id", notificationId);

  return { error };
};
