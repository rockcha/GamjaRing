// src/utils/sendUserNotification.ts
import supabase from "@/lib/supabase";

type NotificationType =
  | "커플요청"
  | "커플수락"
  | "커플거절"
  | "일정등록"
  | "일정수정"
  | "일정삭제"
  | "메모등록"
  | "메모수정"
  | "메모삭제";

interface SendUserNotificationInput {
  senderId: string;
  receiverId: string;
  type: NotificationType;
  description: string;
  isRequest?: boolean; // 기본값 false
}

export const sendUserNotification = async ({
  senderId,
  receiverId,
  type,
  description,
  isRequest = false,
}: SendUserNotificationInput) => {
  if (senderId === receiverId) {
    return { error: new Error("자기 자신에게 커플 요청을 보낼 수 없습니다.") };
  }

  const { error } = await supabase.from("user_notification").insert([
    {
      sender_id: senderId,
      receiver_id: receiverId,
      type,
      description,
      is_request: isRequest,
    },
  ]);

  return { error };
};
