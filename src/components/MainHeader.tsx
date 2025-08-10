// src/components/MainHeader.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTypewriter, Cursor } from "react-simple-typewriter";
import NotificationButton from "./NotificationButton";

import { useUser } from "@/contexts/UserContext";
import DaysTogetherBadge from "./DaysTogetherBadge";

import UserGreetingSection from "./UserGreetingSection";
const potatoMessages = [
  "함께한 추억, 감자처럼 싹을 틔워요🌱",
  "비가 와도 괜찮아, 감자는 튼튼하니까☔",
  "흙먼지 속에서도 넌 반짝였어✨",
  "햇살 속 감자처럼 따스한 우리 기억들☀️",
  "흙 속에서도 서로를 향해 자라는 중🌾",
  "감자밭에도 봄은 와요🌸",
  "우리 추억, 껍질째도 사랑스러워요🤎",
];

export default function MainHeader() {
  const { user, logout, isCoupled } = useUser(); // ✅ context 사용
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const [text] = useTypewriter({
    words: potatoMessages,
    loop: 0,
    typeSpeed: 80,
    deleteSpeed: 40,
    delaySpeed: 2000,
  });

  //bg-[#D2B48C]
  return (
    <header className="w-full h-[152px] py-6 px-6 flex items-center gap-3 md:gap-6 mb-6 sticky top-0 z-50 bg-transparent border-b border-[#e2c6a7]">
      {/* 1) 감자링 + 로고 (약 20%) */}
      <div className="basis-[20%] grow-0 shrink-0 flex items-center -mt-2 md:-mt-4 ml-2 md:ml-4">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="감자" className="w-8 h-8" />
          <span className="text-3xl font-bold text-[#5b3d1d] leading-none">
            감자링
          </span>
        </Link>
      </div>

      {/* 2) 배지 + 타이핑 (약 70%) */}
      <div className="basis-[70%] grow shrink flex flex-col items-center justify-center min-w-0 -ml-32">
        {/* 배지: 높이 과도 방지용 scale (필요시 조절) */}
        <div className="hidden sm:block origin-center ">
          <DaysTogetherBadge />
        </div>
        {/* 타이핑: 아래줄, 작은 화면에서는 숨김 */}
        <p className="hidden sm:block mt-1 text-xs md:text-base font-semibold text-[#5b3d1d] truncate max-w-[70%]">
          {text}
          <Cursor cursorColor="#5b3d1d" />
        </p>
      </div>

      <UserGreetingSection user={user} isCoupled={isCoupled} />
    </header>
  );
}
