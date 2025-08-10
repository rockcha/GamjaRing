import type { DevNote } from "@/components/DevNotice";

export const DevNotices: DevNote[] = [
  {
    id: "1",
    title: "답변 수정 이슈",
    description: "답변 수정 기능 오류.",
    severity: "warning",
    date: "2025-08-10",
  },
  {
    id: "2",
    title: "감자 찌르기 이슈",
    description: "해결됨.",
    severity: "info",
    date: "2025-08-10",
  },
  {
    id: "3",
    title: "무결성 체크 간헐적 실패",
    description: "로그인 직후 fetchUser race condition 조사 중",
    severity: "critical",
    date: "2025-08-09",
  },
  {
    id: "4",
    title: "답변 보기 기능 이슈",
    description: "내가 답변 안했을 시 상대방 답변 못보게하는 기능 추가 예정",
    severity: "info",
    date: "2025-08-09",
  },
];
