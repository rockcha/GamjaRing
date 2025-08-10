import { useMemo } from "react";

interface PotatoStatus {
  message: string;
  emoji: string;
  image: string;
}

const potatoStates: PotatoStatus[] = [
  {
    message: "감자 물 주는 중...",
    emoji: "💧",
    image: "/images/potato-watering.png",
  },
  {
    message: "감자 자라는 중...",
    emoji: "🌱",
    image: "/images/potato-smile.png",
  },
  {
    message: "감자 밥 먹는 중...",
    emoji: "🍽️",
    image: "/images/potato-eat.webp",
  },
  {
    message: "감자 사랑받는 중...",
    emoji: "💖",
    image: "/images/potato-hug.png",
  },
  {
    message: "감자 조는 중...",
    emoji: "😪",
    image: "/images/potato-lazy.png",
  },
];

export default function PotatoLoading() {
  const potato = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * potatoStates.length);
    return potatoStates[randomIndex];
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center px-4 py-10">
      {/* 감자 이미지 */}
      <img
        src={potato!.image}
        alt="로딩 감자"
        className="w-[300px] h-[300px] object-contain mb-6"
      />

      {/* 감자 메시지 + 이모지 */}
      <p className="text-[#5b3d1d] text-3xl font-semibold animate-pulse">
        {potato!.message} {potato!.emoji}
      </p>
    </div>
  );
}
