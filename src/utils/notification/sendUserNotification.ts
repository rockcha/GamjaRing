// src/utils/notification/sendUserNotification.ts
import supabase from "@/lib/supabase";

/** 알림 타입 */
export type NotificationType =
  | "커플요청"
  | "커플수락"
  | "커플거절"
  | "답변등록"
  | "답변수정"
  | "답변삭제"
  | "콕찌르기"
  | "뽀뽀하기"
  | "머리쓰다듬기"
  | "안아주기"
  | "간지럽히기"
  | "응원하기"
  | "애교부리기"
  | "하이파이브"
  | "꽃 선물하기" // ✅ 변경: 선물하기 → 꽃 선물하기
  | "유혹하기"
  | "윙크하기"
  | "사랑스럽게 쳐다보기" // ✅ 변경: 심쿵멘트 → 사랑스럽게 쳐다보기
  | "감자진화"
  | "일정등록"
  | "일정수정"
  | "일정삭제"
  | "반응추가"
  | "음악등록"
  | "음식공유"
  | "물품구매"
  | "물품판매"
  | "낚시성공"
  | "생산시설구매"
  | "타임캡슐"
  | "타임캡슐해제"
  | "음침한말"
  // ✅ 신규 5종
  | "사랑고백 속삭이기"
  | "오구오구해주기"
  | "깜짝쪽지"
  | "어깨토닥이기"
  | "하트날리기";

export interface SendUserNotificationInput {
  senderId: string;
  receiverId: string;
  type: NotificationType;
  senderNickname?: string;
  description?: string;
  isRequest?: boolean;
  foodName?: string;
  gold?: number; // (미사용)
  itemName?: string;
  capsuleTitle?: string;
}

/* ───────────────── Helpers ───────────────── */
const quote = (s: string) => `‘${s}’`;
function withObjectJosa(name: string) {
  const ch = name.charCodeAt(name.length - 1);
  const isHangul = ch >= 0xac00 && ch <= 0xd7a3;
  if (!isHangul) return `${name}를`;
  const jong = (ch - 0xac00) % 28;
  return `${name}${jong === 0 ? "를" : "을"}`;
}

/* ───────────────── 기본 문구 매핑 ───────────────── */
const ACTION_BY_TYPE: Record<
  Exclude<
    NotificationType,
    | "음식공유"
    | "물품구매"
    | "물품판매"
    | "낚시성공"
    | "생산시설구매"
    | "타임캡슐"
    | "타임캡슐해제"
  >,
  string
> = {
  커플요청: "커플 요청을 보냈어요 💌",
  커플수락: "커플 요청을 수락했어요! 💘",
  커플거절: "커플 요청을 거절했어요 🙅",
  답변등록: "답변을 등록했어요 ✍️",
  답변수정: "답변을 수정했어요 ✏️",
  답변삭제: "답변을 삭제했어요 🗑️",
  콕찌르기: "콕! 찔렀어요 👉",
  뽀뽀하기: "뽀뽀했어요 💋",
  머리쓰다듬기: "머리를 쓰다듬었어요 🤍",
  안아주기: "따뜻하게 안아줬어요 🤗",
  간지럽히기: "간지럽혔어요 😂",
  응원하기: "힘내라고 응원해줬어요 💪",
  애교부리기: "애교를 부렸어요 🥰",
  하이파이브: "하이파이브 했어요 🙌",
  "꽃 선물하기": "꽃을 선물했어요 💐", // ✅ 따옴표
  유혹하기: "살짝 유혹했어요 😏",
  윙크하기: "윙크를 날렸어요 😉",
  "사랑스럽게 쳐다보기": "사랑스럽게 쳐다봤어요 💘", // ✅ 따옴표
  감자진화: "감자를 한 단계 진화시켰어요 🌱",
  일정등록: "일정을 등록했어요 📅",
  일정수정: "일정을 수정했어요 ✍️",
  일정삭제: "일정을 삭제했어요 🗑️",
  반응추가: "반응을 남겼어요 💬",
  음악등록: "음악을 등록했어요 🎵",
  음침한말: "음침한 말을 추가했어요😏 평가해주세요!",
  "사랑고백 속삭이기": "사랑 고백을 살짝 속삭였어요 💞", // ✅ 따옴표
  오구오구해주기: "오구오구해줬어요 🐻",
  깜짝쪽지: "깜짝 쪽지를 건넸어요 ✉️",
  어깨토닥이기: "어깨를 토닥여줬어요 🫶",
  하트날리기: "하트를 사르르 날렸어요 🫰",
};

/* ───────────────── Core ───────────────── */
export const sendUserNotification = async ({
  senderId,
  receiverId,
  type,
  isRequest,
  foodName,
  gold, // (미사용)
  itemName,
  capsuleTitle,
}: SendUserNotificationInput) => {
  if (senderId === receiverId) {
    return { error: new Error("자기 자신에게 알림을 보낼 수 없습니다.") };
  }

  // 1) 보낸 사람 닉네임 조회 (실패해도 진행)
  let nickname = "상대방";
  try {
    const { data: userRow, error: userErr } = await supabase
      .from("users")
      .select("nickname")
      .eq("id", senderId)
      .maybeSingle();

    if (!userErr && userRow?.nickname) {
      nickname = (userRow.nickname || "").trim() || nickname;
    }
  } catch (e) {
    console.warn("[sendUserNotification] nickname 조회 실패:", e);
  }

  // 2) 액션 문구 작성
  let action: string;
  if (type === "음식공유") {
    const name = (foodName ?? "").trim();
    action = name
      ? `음식공유, ${withObjectJosa(quote(name))} 요리했어요 🍽️`
      : "음식공유, 음식을 요리했어요 🍽️";
  } else if (type === "물품구매") {
    const name = (itemName ?? "").trim();
    action = name
      ? `${withObjectJosa(quote(name))} 구매했습니다 🛒`
      : "물품을 구매했어요 🛒";
  } else if (type === "물품판매") {
    const name = (itemName ?? "").trim();
    action = name
      ? `${withObjectJosa(quote(name))} 판매했습니다 💰`
      : "물품을 판매했어요 💰";
  } else if (type === "낚시성공") {
    const name = (itemName ?? "").trim();
    action = name
      ? `${withObjectJosa(quote(name))} 포획했어요 🐟`
      : "낚시에 성공했어요 🐟";
  } else if (type === "생산시설구매") {
    const name = (itemName ?? "").trim();
    action = name
      ? `${withObjectJosa(quote(name))} 구매했습니다 🏭`
      : "생산시설을 구매했어요 🏭";
  } else if (type === "타임캡슐") {
    const name = (capsuleTitle ?? "").trim();
    action = name
      ? `${withObjectJosa(quote(name))} 타임캡슐을 봉인했어요 ⏳`
      : "타임캡슐을 봉인했어요 ⏳";
  } else if (type === "타임캡슐해제") {
    const name = (capsuleTitle ?? "").trim();
    action = name
      ? `${withObjectJosa(quote(name))} 타임캡슐이 열람 가능해졌어요 ⏰`
      : "타임캡슐이 열람 가능해졌어요 ⏰";
  } else {
    action =
      ACTION_BY_TYPE[
        type as Exclude<
          NotificationType,
          | "음식공유"
          | "물품구매"
          | "물품판매"
          | "낚시성공"
          | "생산시설구매"
          | "타임캡슐"
          | "타임캡슐해제"
        >
      ] ?? String(type);
  }

  const fixedDescription = `${nickname}님이 ${action}`.trim();
  const finalIsRequest = type === "커플요청" ? true : Boolean(isRequest);

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
  }

  return { error };
};
