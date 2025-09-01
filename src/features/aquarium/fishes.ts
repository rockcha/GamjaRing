export type FishInfo = {
  id: string;
  labelKo: string;
  cost: number;
  image: string;
  size: number; // 1.0 = 기본, >1 = 크게, <1 = 작게
};

export const FISHES: FishInfo[] = [
  // 기존 🐟nautilusanglerfishhumpbackwhale
  {
    id: "scalare",
    labelKo: "스칼라 물고기",
    cost: 20,
    image: "/aquarium/scalare.png",
    size: 0.8,
  },
  {
    id: "goldfish",
    labelKo: "금붕어",
    cost: 20,
    image: "/aquarium/goldfish.png",
    size: 0.8,
  },

  {
    id: "anglerfish",
    labelKo: "아귀",
    cost: 75,
    image: "/aquarium/anglerfish.png",
    size: 1.3,
  },
  {
    id: "nautilus",
    labelKo: "암모나이트",
    cost: 65,
    image: "/aquarium/nautilus.png",
    size: 1.0,
  },
  {
    id: "cardinalfish",
    labelKo: "열동가리돔",
    cost: 45,
    image: "/aquarium/cardinalfish.png",
    size: 0.8,
  },
  {
    id: "mackerel",
    labelKo: "고등어",
    cost: 50,
    image: "/aquarium/mackerel.png",
    size: 1.4,
  },
  {
    id: "guppy",
    labelKo: "구피",
    cost: 15,
    image: "/aquarium/guppy.png",
    size: 0.5,
  },

  {
    id: "stripedfish",
    labelKo: "줄무늬 물고기",
    cost: 20,
    image: "/aquarium/stripedfish.png",
    size: 0.8,
  },
  {
    id: "shellfish",
    labelKo: "조개",
    cost: 20,
    image: "/aquarium/shellfish.png",
    size: 0.8,
  },
  {
    id: "seaeel",
    labelKo: "바다뱀장어",
    cost: 55,
    image: "/aquarium/seaeel.png",
    size: 1.3,
  },
  {
    id: "shrimp",
    labelKo: "새우",
    cost: 20,
    image: "/aquarium/shrimp.png",
    size: 0.5,
  },
  {
    id: "clownfish",
    labelKo: "흰동가리",
    cost: 30,
    image: "/aquarium/clownfish.png",
    size: 0.9,
  },
  {
    id: "squid",
    labelKo: "오징어",
    cost: 35,
    image: "/aquarium/squid.png",
    size: 1.2,
  },
  {
    id: "turtle",
    labelKo: "바다거북",
    cost: 45,
    image: "/aquarium/turtle.png",
    size: 1.3,
  },
  {
    id: "jellyfish",
    labelKo: "해파리",
    cost: 45,
    image: "/aquarium/jellyfish.png",
    size: 1.1,
  },
  {
    id: "dolphin",
    labelKo: "돌고래",
    cost: 95,
    image: "/aquarium/dolphin.png",
    size: 2.5,
  },

  // 추가 🐠🐡🦈
  {
    id: "seahorse",
    labelKo: "해마",
    cost: 35,
    image: "/aquarium/seahorse.png",
    size: 0.6,
  },
  {
    id: "pufferfish",
    labelKo: "복어",
    cost: 45,
    image: "/aquarium/pufferfish.png",
    size: 1.0,
  },
  {
    id: "stingray",
    labelKo: "가오리",
    cost: 55,
    image: "/aquarium/stingray.png",
    size: 1.2,
  },
  {
    id: "lobster",
    labelKo: "랍스타",
    cost: 55,
    image: "/aquarium/lobster.png",
    size: 0.8,
  },
  {
    id: "shark",
    labelKo: "상어",
    cost: 85,
    image: "/aquarium/shark.png",
    size: 2.5,
  },
  {
    id: "whale",
    labelKo: "고래",
    cost: 125,
    image: "/aquarium/whale.png",
    size: 6.0,
  },
  {
    id: "swordfish",
    labelKo: "청새치",
    cost: 85,
    image: "/aquarium/swordfish.png",
    size: 1.5,
  },
  {
    id: "crab",
    labelKo: "게",
    cost: 18,
    image: "/aquarium/crab.png",
    size: 0.5,
  },
];

export const FISH_BY_ID = Object.fromEntries(FISHES.map((f) => [f.id, f]));
