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
  | "음악등록"
  | "음식공유"
  | "물품구매";

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

  /** '음식공유'일 때 표시할 음식 이름 */
  foodName?: string;

  /** '음식공유'일 때 실제 변경된 골드(음수/양수) */
  gold?: number;

  /** '물품구매'일 때 물품(예: 물고기) 이름 — 선택값(없어도 안전) */
  itemName?: string;
}

// '음식공유'와 '물품구매'는 별도 처리
const ACTION_BY_TYPE: Record<
  Exclude<NotificationType, "음식공유" | "물품구매">,
  string
> = {
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

// 간단한 조사 처리(을/를)
function withObjectJosa(name: string) {
  const ch = name.charCodeAt(name.length - 1);
  const isHangul = ch >= 0xac00 && ch <= 0xd7a3;
  if (!isHangul) return `${name}를`;
  const jong = (ch - 0xac00) % 28;
  return `${name}${jong === 0 ? "를" : "을"}`;
}

export const sendUserNotification = async ({
  senderId,
  receiverId,
  type,
  isRequest,
  foodName,
  gold,
  itemName, // ✅ 물품구매용
}: SendUserNotificationInput) => {
  if (senderId === receiverId) {
    return { error: new Error("자기 자신에게 알림을 보낼 수 없습니다.") };
  }

  // 1) 보낸 사람 닉네임 조회
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
    console.warn("[sendUserNotification] nickname 조회 실패:", e);
  }

  // 2) 고정 문구 생성
  let action: string;

  if (type === "음식공유") {
    const name = (foodName ?? "").trim();
    const base = "음식을 공유했어요 🍽️";
    const hasDelta = typeof gold === "number" && Number.isFinite(gold);
    const sign = hasDelta && gold! >= 0 ? "+" : "";
    const goldSuffix = hasDelta ? ` 🪙 ${sign}${Math.trunc(gold!)} ` : "";
    action = name ? `${base} ${name}${goldSuffix}` : `${base}${goldSuffix}`;
  } else if (type === "물품구매") {
    // ✅ 물품 이름이 있으면: "OOO을/를 구매했습니다 🛒"
    //    없으면 기본 문구: "물품을 구매했어요 🛒"
    const name = (itemName ?? "").trim();
    action = name
      ? `${withObjectJosa(name)} 구매했습니다 🛒`
      : "물품을 구매했어요 🛒";
  } else {
    action =
      ACTION_BY_TYPE[
        type as Exclude<NotificationType, "음식공유" | "물품구매">
      ] ?? String(type);
  }

  const fixedDescription = `${nickname}님이 ${action}`.trim();

  // 3) '커플요청'은 자동 true
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
