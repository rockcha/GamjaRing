// src/utils/sendUserNotification.ts
import supabase from "@/lib/supabase";

type NotificationType =
  | "커플요청"
  | "커플수락"
  | "커플거절"
  | "답변등록"
  | "답변수정"
  | "답변삭제"
  | "콕찌르기"
  | "감자진화"
  | "일정등록"
  | "일정수정"
  | "일정삭제"
  | "반응추가"
  | "음악등록";

interface SendUserNotificationInput {
  senderId: string;
  receiverId: string;
  type: NotificationType;
  /** 하위호환용: 받아도 사용하지 않습니다. */
  senderNickname?: string;
  /** 하위호환용: 받아도 사용하지 않습니다(고정 문구 사용). */
  description?: string;
  /** 기본은 false지만, '커플요청'은 자동 true */
  isRequest?: boolean;
}

// 타입별 액션 문구
const ACTION_BY_TYPE: Record<NotificationType, string> = {
  커플요청: "커플 요청을 보냈어요 💌",
  커플수락: "커플 요청을 수락했어요! 💘",
  커플거절: "커플 요청을 거절했어요 🙅",
  답변등록: "답변을 등록했어요 ✍️",
  답변수정: "답변을 수정했어요 ✏️",
  답변삭제: "답변을 삭제했어요 🗑️",
  콕찌르기: "콕! 찔렀어요 👉",
  감자진화: "감자를 한 단계 진화시켰어요 🌱",
  일정등록: "일정을 등록했어요 📅",
  일정수정: "일정을 수정했어요 ✍️",
  일정삭제: "일정을 삭제했어요 🗑️",
  반응추가: "반응을 남겼어요 💬",
  음악등록: "음악을 등록했어요 🎵",
};

export const sendUserNotification = async ({
  senderId,
  receiverId,
  type,

  description, // ❌ 무시
  isRequest,
}: SendUserNotificationInput) => {
  if (senderId === receiverId) {
    return { error: new Error("자기 자신에게 알림을 보낼 수 없습니다.") };
  }

  // 1) 보낸 사람 닉네임을 DB에서 조회
  let nickname = "상대방";
  try {
    const { data: userRow, error: userErr } = await supabase
      .from("users")
      .select("nickname")
      .eq("id", senderId)
      .maybeSingle();

    if (!userErr && userRow?.nickname) {
      nickname = userRow.nickname.trim() || nickname;
    }
  } catch (e) {
    // 조회 실패 시 fallback 그대로 사용
    console.warn("[sendUserNotification] nickname 조회 실패:", e);
  }

  // 2) 고정 문구 생성
  const action = ACTION_BY_TYPE[type] ?? String(type);
  const fixedDescription = `${nickname}님이 ${action}`;

  // 3) '커플요청'은 자동으로 요청 플래그 true
  const finalIsRequest = type === "커플요청" ? true : Boolean(isRequest);

  // 4) 저장
  const { error } = await supabase.from("user_notification").insert([
    {
      sender_id: senderId,
      receiver_id: receiverId,
      type,
      description: fixedDescription,
      is_request: finalIsRequest,
    },
  ]);

  if (error) {
    console.error("❌ notification 삽입 실패:", error.message);
    console.log("debug info", {
      senderId,
      receiverId,
      type,
      description: fixedDescription,
      is_request: finalIsRequest,
    });
  }

  return { error };
};
