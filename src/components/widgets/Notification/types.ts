// src/components/notification/types.ts
export type NotificationType =
  | "커플요청"
  | "커플수락"
  | "커플거절"
  | "답변등록"
  | "답변수정"
  | "답변삭제"
  | "감자 콕찌르기"
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
  | "감자진화"
  | "일정등록"
  | "일정수정"
  | "일정삭제"
  | "반응추가";

export type NotificationRow = {
  id: string;
  type: NotificationType;
  created_at: string;
  description: string;
  sender_id: string;
  receiver_id: string;
  is_request: boolean;
  is_read: boolean; // ✅ 새로 사용
};
