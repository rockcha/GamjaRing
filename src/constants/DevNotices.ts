import type { DevNote } from "@/components/DevNotice";

export const DevNotices: DevNote[] = [
  {
    id: "1",
    title: "답변 관련 이슈",
    description: "하루에 두번 답변 가능하게 되어있음.",
    severity: "warning",
    date: "2025-08-11",
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
    title: "새로운 기능",
    description: "오늘의 할일 구현 기능 추가중",
    severity: "info",
    date: "2025-08-11",
  },
];
