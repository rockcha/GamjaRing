// src/utils/sendUserNotification.ts
import supabase from "@/lib/supabase";

type NotificationType =
  | "커플요청"
  | "커플수락"
  | "커플거절"
  | "답변등록"
  | "답변수정"
  | "답변삭제"
  | "감자 콕찌르기"
  | "감자진화"
  | "일정등록"
  | "일정수정"
  | "일정삭제"
  | "반응추가";

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

  if (error) {
    console.error("❌ notification 삽입 실패:", error.message);
    console.log("debug info", { senderId, receiverId, type, description });
  }
  return { error };
};
