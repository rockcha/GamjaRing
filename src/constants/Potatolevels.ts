export interface PotatoLevelInfo {
  level: number;
  name: string;
  description: string;
  image: string; // 이미지 경로 또는 URL
}

export const potatoLevels: PotatoLevelInfo[] = [
  {
    level: 1,
    name: "씨감자🥚",
    description: "이제 막 시작이야",
    image: "/images/level/lv1.png",
  },
  {
    level: 2,
    name: "새싹감자🌱",
    description: "작지만 힘차게 자라나는 중",
    image: "/images/level/lv2.png",
  },
  {
    level: 3,
    name: "통통감자🥔",
    description: "제법 실하게 자란 감자",
    image: "/images/level/lv3.png",
  },
  {
    level: 4,
    name: "꿀감자🐝",
    description: "달달하게 잘 익은 감자",
    image: "/images/level/lv4.png",
  },
  {
    level: 5,
    name: "감자대장👑",
    description: "마을에서 제일 잘 자란 감자",
    image: "/images/level/lv5.png",
  },
];
