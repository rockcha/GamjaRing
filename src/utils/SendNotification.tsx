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

interface SendNotificationInput {
  toUserId: string;
  fromUserId: string;
  type: NotificationType;
  partnerNickname: string;
}

export async function sendNotification({
  toUserId,
  fromUserId,
  type,
  partnerNickname,
}: SendNotificationInput): Promise<void> {
  const messageMap: Record<NotificationType, string> = {
    커플요청: `${partnerNickname}님이 커플 요청을 보냈어요 💌`,
    커플수락: `${partnerNickname}님이 요청을 수락했어요 💑`,
    커플거절: `${partnerNickname}님이 요청을 거절했어요 💔`,
    일정등록: `${partnerNickname}님이 일정을 등록했어요 📅`,
    일정수정: `${partnerNickname}님이 일정을 수정했어요 ✏️`,
    일정삭제: `${partnerNickname}님이 일정을 삭제했어요 🗑️`,
    메모등록: `${partnerNickname}님이 메모를 남겼어요 📝`,
    메모수정: `${partnerNickname}님이 메모를 수정했어요 ✏️`,
    메모삭제: `${partnerNickname}님이 메모를 삭제했어요 🗑️`,
  };

  const message = messageMap[type];

  const { error } = await supabase.from("notifications").insert({
    user_id: toUserId,
    from_user_id: fromUserId,
    type,
    message,
  });

  if (error) {
    console.error("알림 전송 실패:", error.message);
  }
}
