export type Grade =
  | "초대박" // 최상
  | "대박"
  | "좋음"
  | "보통"
  | "주의"
  | "조심"
  | "위험"; // 최하

type NonEmptyArray<T> = readonly [T, ...T[]];

// 안전 pick
function pick<T>(rng: () => number, arr: NonEmptyArray<T>): T {
  const idx = Math.floor(rng() * arr.length) % arr.length;
  return arr[idx] ?? arr[0];
}

/* ── 결정론 RNG ── */
function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededRandom(seedStr: string) {
  const seed = xmur3(seedStr)();
  return mulberry32(seed);
}

/* ── 데이터 ── */
export const GRADES = [
  "초대박",
  "대박",
  "좋음",
  "보통",
  "주의",
  "조심",
  "위험",
] as const;

const TITLE_POOL: Record<Grade, NonEmptyArray<string>> = {
  초대박: [
    "별의 축복",
    "천운 개시",
    "빛의 개벽",
    "행운 폭발",
    "우주의 미소",
    "신의 한 수",
    "금빛 파도",
    "찬스 오로라",
  ],
  대박: [
    "행운의 바람",
    "골든 타이밍",
    "오늘은 주인공",
    "운명의 편지",
    "물 흐르듯 술술",
    "찬스 포착",
    "빛나는 하루",
    "시작이 반",
  ],
  좋음: [
    "잔잔한 상승세",
    "기분 좋은 예감",
    "따뜻한 순간",
    "리듬을 타는 날",
    "작은 행운",
    "밝은 여운",
    "햇살 한 줌",
    "맑은 파장",
  ],
  보통: [
    "루틴 유지",
    "평화로운 리듬",
    "꾸준히 한 걸음",
    "무난무난",
    "잔잔한 호수",
    "담담한 온도",
    "균형의 날",
    "기본기 탄탄",
  ],
  주의: [
    "속도 조절",
    "한 템포 쉬어가기",
    "딱 한 번 더 확인",
    "과속 금지",
    "유턴도 전략",
    "조심조심",
    "코너 돌듯이",
    "버퍼링 권장",
  ],
  조심: [
    "안전 제일",
    "컨디션 관리",
    "휴식이 답",
    "마음 가다듬기",
    "리스크 회피",
    "무리 금지",
    "잠깐 멈춤",
    "재정비의 날",
  ],
  위험: [
    "폭풍 전야",
    "리스크 경보",
    "방어 모드",
    "정비가 필요",
    "경고등 점등",
    "위험지대",
    "발걸음 천천히",
    "막판 변수",
  ],
};

const SUMMARY_POOL: Record<Grade, NonEmptyArray<string>> = {
  초대박: [
    "놓치기 아까운 빅찬스! 과감히 시도해도 좋아요.",
    "뛰어들면 물이 갈라집니다. 중요한 결정을 밀어도 OK.",
    "작은 선택이 큰 파문을 만드는 날.",
  ],
  대박: [
    "행운의 바람이 붑니다. 기회를 꼭 붙잡아 보세요!",
    "타이밍이 빛나요. 마음먹은 바를 밀어붙여도 좋습니다.",
    "정면승부가 통하는 날. 선점이 관건!",
  ],
  좋음: [
    "기분 좋은 흐름, 꾸준히 밀고 가기.",
    "부드러운 상승 곡선. 편안한 자신감으로.",
    "작지만 확실한 성취가 쌓이는 날.",
  ],
  보통: [
    "안정적인 하루, 리듬 유지가 포인트.",
    "평소대로가 최고의 전략. 기본기를 믿으세요.",
    "무리 없이 페이스 유지.",
  ],
  주의: [
    "한 템포만 늦춰도 더 잘 풀립니다.",
    "체크리스트가 방패가 됩니다. 두 번 확인!",
    "돌다리도 두드려 가기—급할수록 돌아가자.",
  ],
  조심: [
    "무리하지 말고 휴식이 먼저예요.",
    "오늘은 보수적으로. 체력/감정 관리에 집중.",
    "큰일은 미루고 컨디션에 집중하세요.",
  ],
  위험: [
    "지금은 방어에 집중—중요 결정은 하루 미루기.",
    "변수 많은 구간, 작은 실수도 크게 번질 수 있어요.",
    "피해가기와 버티기가 최고의 공격.",
  ],
};

const LOVE_MSGS: NonEmptyArray<string> = [
  "눈맞춤 3초가 말보다 강합니다.",
  "상대의 '오늘'을 먼저 물어보세요.",
  "데이트는 짧아도 진하게—밀도 우선.",
  "질문을 한 번 더—오해가 풀립니다.",
  "칭찬 세 문장, 분위기 세 배.",
  "서프라이즈보다 예고된 배려가 좋아요.",
  "공감 후 해결책—순서를 지켜주세요.",
  "감정 표현은 ‘나-메시지’로 부드럽게.",
  "기억해둔 사소한 취향을 꺼내보세요.",
  "포옹은 만능의 레벨업 포션.",
  "함께 사진 한 장, 추억 한 장.",
  "대화 중 휴대폰은 뒤집어두기.",
];

const WORK_MSGS: NonEmptyArray<string> = [
  "우선순위 3개—그 외는 버리기.",
  "핵심 질문 3개로 회의를 절반으로.",
  "30분 집중 + 5분 쉬기, 두 번만 해도 충분.",
  "작은 성과를 시각화하면 동력이 생깁니다.",
  "오늘의 실패는 내일의 데이터.",
  "템플릿을 만들 때—내일이 빨라져요.",
  "메일/메신저는 두 타임 몰아서 처리.",
  "디테일 체크가 성패를 가릅니다.",
  "페이스 유지가 가장 빠른 지름길.",
  "기록은 기억을 이긴다.",
];

const HEALTH_MSGS: NonEmptyArray<string> = [
  "목/어깨 30초 릴리즈—즉시 개운.",
  "물 1컵 + 기지개 1회.",
  "햇볕 5분만 쬐어도 기분이 달라져요.",
  "늦은 카페인은 내일의 적.",
  "가벼운 근력 10분이 하루를 바꿉니다.",
  "따뜻한 차 한 잔으로 리셋.",
  "앉았다 일어나기 10회.",
  "과자 대신 과일 한 조각.",
  "귀가 후 샤워로 수면 루틴 ON.",
];

const COLORS: NonEmptyArray<string> = [
  "에메랄드",
  "살구",
  "네이비",
  "코랄",
  "올리브",
  "라벤더",
  "아이보리",
  "민트",
  "보르도",
  "라임",
  "하늘",
  "체리",
  "샌드",
  "스틸",
  "버터",
  "청록",
  "라일락",
  "머스타드",
  "차콜",
  "피치",
  "딥그린",
  "플럼",
  "연보라",
  "버건디",
];

const ITEMS: NonEmptyArray<string> = [
  "텀블러",
  "손수건",
  "이어폰",
  "책갈피",
  "스티커",
  "펜",
  "캔들",
  "립밤",
  "노트",
  "키링",
  "헤어밴드",
  "슬리퍼",
  "카드지갑",
  "키보드 키캡",
  "마그넷",
  "디퓨저",
  "손난로",
  "스테인리스 빨대",
  "차 티백",
  "휴대용 거울",
];

// 재미 요소: 오늘의 키워드
const KEYWORDS: NonEmptyArray<string> = [
  "시작",
  "정리",
  "히든찬스",
  "균형",
  "집중",
  "회복",
  "대화",
  "성장",
  "실험",
  "타이밍",
  "자신감",
  "단호함",
  "유연함",
  "휴식",
  "관찰",
];

export type Fortune = {
  title: string;
  summary: string;
  love: string;
  work: string;
  health: string;
  luckyColor: string;
  luckyNumber: number;
  luckyItem: string;
  grade: Grade;
  keywords: string[];
};

export function generateFortune(seedKey: string): Fortune {
  const rng = seededRandom(seedKey);

  // 등급 가중치: 초대박/위험은 낮은 확률
  const bag: Grade[] = [
    "초대박",
    "대박",
    "대박",
    "좋음",
    "좋음",
    "좋음",
    "보통",
    "보통",
    "보통",
    "보통",
    "주의",
    "주의",
    "조심",
    "위험",
  ];
  const grade = pick(rng, bag as unknown as NonEmptyArray<Grade>);

  return {
    title: pick(rng, TITLE_POOL[grade]),
    summary: pick(rng, SUMMARY_POOL[grade]),
    love: pick(rng, LOVE_MSGS),
    work: pick(rng, WORK_MSGS),
    health: pick(rng, HEALTH_MSGS),
    luckyColor: pick(rng, COLORS),
    luckyNumber: Math.floor(rng() * 44) + 1,
    luckyItem: pick(rng, ITEMS),
    grade,
    keywords: [pick(rng, KEYWORDS), pick(rng, KEYWORDS)],
  };
}
