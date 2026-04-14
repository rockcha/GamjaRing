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
  | "꽃 선물하기"
  | "유혹하기"
  | "윙크하기"
  | "사랑스럽게 쳐다보기"
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
  | "음침한말" // 레거시 키 유지
  // ✅ 신규 6종 (기존 5종 + 추억조각 등록)
  | "사랑고백 속삭이기"
  | "오구오구해주기"
  | "깜짝쪽지"
  | "어깨토닥이기"
  | "하트날리기"
  | "추억조각 등록"
  // ✅ 신규 4종
  | "노래 불러주기"
  | "음침한 말 하기"
  | "째려보기"
  | "우울해하기"
  // ✅ 신규 귀여운 액션
  | "볼콕 찌르기"
  | "감자하트 보내기"
  | "이불 덮어주기"
  | "볼따구 말랑하기"
  | "행운 감자 보내기"
  | "꼬옥 충전하기"
  | "손 꼭 잡기"
  | "이마 뽀뽀하기"
  | "간식 몰래주기"
  | "포근하게 쓰다듬기"
  | "감자담요 말아주기"
  | "눈맞춤 보내기"
  // ✅ 신규: 꽃 재배(에픽 획득 시 사용)
  | "꽃 재배"
  // ✅ 신규: 커스텀 액션
  | "커스텀 액션";

export interface SendUserNotificationInput {
  senderId: string;
  receiverId: string;
  type: NotificationType;
  senderNickname?: string;
  description?: string; // ✅ 커스텀 액션 등의 맞춤 문구
  isRequest?: boolean;
  foodName?: string;
  gold?: number; // (미사용)
  itemName?: string; // ✅ 꽃/아이템 이름
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

/* ───────────────── 기본 문구 매핑 ─────────────────
   ※ 아래 키에 없는 타입은 Core에서 별도 분기 처리됨 */
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
    | "커스텀 액션"
    | "꽃 재배"
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
  "꽃 선물하기": "꽃을 선물했어요 💐",
  유혹하기: "살짝 유혹했어요 😏",
  윙크하기: "윙크를 날렸어요 😉",
  "사랑스럽게 쳐다보기": "사랑스럽게 쳐다봤어요 👀",

  감자진화: "감자를 한 단계 진화시켰어요 🌱",
  일정등록: "일정을 등록했어요 📅",
  일정수정: "일정을 수정했어요 ✍️",
  일정삭제: "일정을 삭제했어요 🗑️",
  반응추가: "반응을 남겼어요 💬",
  음악등록: "음악을 등록했어요 🎵",

  // 레거시 & 신규 동시 지원
  음침한말: "살짝 음침한 말을 했어요 🌚",
  "음침한 말 하기": "살짝 음침한 말을 했어요 🌚",

  // 기존 신규 5종
  "사랑고백 속삭이기": "사랑 고백을 살짝 속삭였어요 🤫",
  오구오구해주기: "오구오구해줬어요 🐻",
  깜짝쪽지: "깜짝 쪽지를 건넸어요 ✉️",
  어깨토닥이기: "어깨를 토닥여줬어요 🙌",
  하트날리기: "하트를 사르르 날렸어요 🫰",

  // 신규 4종
  "노래 불러주기": "작게 노래를 불러줬어요 🎤",
  째려보기: "살짝 째려봤어요 😒",
  우울해하기: "조금 우울해하고 있어요 😔",

  "볼콕 찌르기": "볼을 콕 찔렀어요 ☝️",
  "감자하트 보내기": "말랑한 감자하트를 보냈어요 🥔",
  "이불 덮어주기": "포근하게 이불을 덮어줬어요 🛌",
  "볼따구 말랑하기": "볼따구를 말랑말랑 만졌어요 🍡",
  "행운 감자 보내기": "행운 감자를 굴려 보냈어요 🍀",
  "꼬옥 충전하기": "꼬옥 안아서 마음을 충전해줬어요 🔋",
  "손 꼭 잡기": "손을 꼭 잡아줬어요 🤝",
  "이마 뽀뽀하기": "이마에 살짝 뽀뽀했어요 😚",
  "간식 몰래주기": "작은 간식을 몰래 건넸어요 🍪",
  "포근하게 쓰다듬기": "포근하게 쓰다듬어줬어요 🧸",
  "감자담요 말아주기": "감자담요로 폭 감싸줬어요 🥔",
  "눈맞춤 보내기": "다정한 눈맞춤을 보냈어요 ✨",

  // 추가
  "추억조각 등록": "추억 조각을 등록했어요 📸",
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
  description, // ✅ 커스텀 설명
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
  if (type === "커스텀 액션") {
    action = (description ?? "").trim() || "메시지를 보냈어요 💌";
  } else if (type === "음식공유") {
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
  } else if (type === "꽃 재배") {
    const name = (itemName ?? "").trim();
    // 에픽 전용 느낌의 문구(일반/희귀에 써도 어색하지 않음)
    action = name
      ? `${withObjectJosa(quote(name))} 재배했어요 🌸✨`
      : "꽃을 재배했어요 🌸✨";
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
          | "커스텀 액션"
          | "꽃 재배"
        >
      ] ?? String(type);
  }

  const fixedDescription = `${nickname}님이 ${action}`.trim();
  const finalIsRequest = type === "커플요청" ? true : Boolean(isRequest);

  // 3) DB Insert
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
