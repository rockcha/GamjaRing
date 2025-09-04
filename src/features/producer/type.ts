// src/constants/producers.ts
// NOTE: timeSec는 "시간" 단위입니다. (예: 1 = 1시간, 2.5 = 2시간 30분)

export type Producer = {
  id: string; // 내부 식별자
  name: string; // 표시 이름
  price: number; // 구매/설치 가격 (100~250)
  produces: string[]; // 생산 가능한 재료 목록 (1~3개, 텍스트 배열)
  image: string; // 이미지 경로
  line: string; // 생산 멘트
  timeSec: number; // 생산 소요시간 (단위: 시간, 1~6)
};

export const PRODUCERS: Producer[] = [
  {
    id: "dairy-barn",
    name: "낙농 헛간",
    price: 210,
    produces: ["우유", "치즈"],
    image: "/producers/dairy-barn.png",
    line: "우유를 짜고 치즈를 숙성하는 중…",
    timeSec: 1.6,
  },
  {
    id: "poultry-coop",
    name: "닭장",
    price: 170,
    produces: ["계란", "고기"],
    image: "/producers/poultry-coop.png",
    line: "따끈한 계란과 신선한 재료를 모으는 중…",
    timeSec: 4.0,
  },
  {
    id: "pig-pen",
    name: "돼지우리",
    price: 160, // 2종이지만 시간이 더 길어 닭장보다 조금 더 저렴
    produces: ["고기", "베이컨"],
    image: "/producers/pig-pen.png",
    line: "정육과 훈연실을 거치는 중…",
    timeSec: 5.0,
  },

  // ✅ 단일 생산(시간이 길수록 더 저렴)
  {
    id: "apiary",
    name: "양봉장",
    price: 150,
    produces: ["꿀"],
    image: "/producers/apiary.png",
    line: "꿀벌들이 달콤함을 모으는 중…",
    timeSec: 4.0,
  },
  {
    id: "salt-pans",
    name: "염전",
    price: 150,
    produces: ["소금"],
    image: "/producers/salt-pans.png",
    line: "햇살 아래 소금을 결정화하는 중…",
    timeSec: 4.0,
  },
  {
    id: "ice-maker",
    name: "제빙기",
    price: 200, // 단일 + 짧은 시간 → 상대적으로 비쌈
    produces: ["얼음"],
    image: "/producers/ice-maker.png",
    line: "얼음을 만드는 중…",
    timeSec: 1.2,
  },

  {
    id: "flour-mill",
    name: "제분소",
    price: 210,
    produces: ["밀", "플랫브레드"],
    image: "/producers/flour-mill.png",
    line: "밀을 갈아 밀가루를 만들고 반죽을 준비하는 중…",
    timeSec: 1.4,
  },
  {
    id: "tandoor",
    name: "탄두르 화덕",
    price: 230, // 3종 + 비교적 짧은 시간 → 상단 가격대
    produces: ["플랫브레드", "버터", "치즈"],
    image: "/producers/tandoor.png",
    line: "버터/치즈 난과 플랫브레드를 굽는 중…",
    timeSec: 2.0,
  },
  {
    id: "dairy-plant",
    name: "유가공소",
    price: 210,
    produces: ["버터", "치즈"],
    image: "/producers/dairy-plant.png",
    line: "버터를 빚고 치즈를 숙성하는 중…",
    timeSec: 1.7,
  },
  {
    id: "sauce-kitchen",
    name: "소스 키친",
    price: 220,
    produces: ["케찹", "양파"],
    image: "/producers/sauce-kitchen.png",
    line: "케찹을 끓이고 곁들일 재료를 준비하는 중…",
    timeSec: 1.3,
  },
  {
    id: "greenhouse",
    name: "온실",
    price: 200,
    produces: ["녹색채소", "양파"],
    image: "/producers/greenhouse.png",
    line: "푸릇한 채소를 기르는 중…",
    timeSec: 2.4,
  },
  {
    id: "onion-plot",
    name: "양파밭",
    price: 220,
    produces: ["양파", "녹색채소"],
    image: "/producers/onion-plot.png",
    line: "양파와 잎채소를 뽑는 중…",
    timeSec: 1.2,
  },
  {
    id: "mango-orchard",
    name: "망고 과수원",
    price: 180, // 2종 + 긴 시간 → 저렴
    produces: ["망고", "꿀"],
    image: "/producers/mango-orchard.png",
    line: "달콤한 망고와 자연의 꿀 향을 모으는 중…",
    timeSec: 3.6,
  },
  {
    id: "deli-counter",
    name: "델리 카운터",
    price: 220, // 3종 + 중간 시간 → 중상 가격
    produces: ["치즈", "베이컨", "고기"],
    image: "/producers/deli-counter.png",
    line: "숙성/훈연/정육을 한 번에 처리 중…",
    timeSec: 2.5,
  },
  {
    id: "pasture-shed",
    name: "목장 작업창고",
    price: 230, // 3종 + 2h → 상단 가격대
    produces: ["버터", "우유", "계란"],
    image: "/producers/pasture-shed.png",
    line: "목장에서 갓 온 우유와 계란을 분류하고 버터를 만드는 중…",
    timeSec: 2.0,
  },
  {
    id: "veg-patch",
    name: "텃밭",
    price: 210,
    produces: ["녹색채소", "밀"],
    image: "/producers/veg-patch.png",
    line: "싱싱한 채소와 곡물을 가꾸는 중…",
    timeSec: 1.4,
  },
];
