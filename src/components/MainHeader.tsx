// src/components/MainHeader.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTypewriter, Cursor } from "react-simple-typewriter";
import NotificationButton from "./NotificationButton";
import UnlinkButton from "./widgets/UnlinkButton";
import { useUser } from "@/contexts/UserContext";

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

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };
  //bg-[#d7b89c]
  return (
    <header className="w-full flex items-center justify-between bg-gradient-to-b from-[#fde2e4] to-[#fdf6e3] px-6 py-5  border-b shadow-sm">
      {/* 좌측 감자링 + 타이핑 멘트 */}
      <div className="bg-white rounded-full shadow px-6 py-3 flex flex-col items-center justify-center w-[320px] h-[80px]">
        <Link
          to="/"
          className="text-2xl font-bold text-[#5b3d1d] flex items-center gap-2"
        >
          감자링
          <span className="text-3xl animate-bounce">🥔</span>
        </Link>
        <p className="text-[14px] font-medium text-[#5b3d1d] h-[20px]">
          {text}
          <Cursor cursorColor="#5b3d1d" />
        </p>
      </div>

      <NotificationButton />
      <UnlinkButton />
      {/* 우측 사용자 메뉴 */}
      {user ? (
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-100 transition"
          >
            {user.nickname} ▼
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 shadow-md rounded-md z-10">
              {isCoupled && (
                <button
                  className="w-full px-4 py-2 text-left hover:bg-gray-100"
                  onClick={() => navigate("/couple")}
                >
                  커플페이지
                </button>
              )}
              <button
                className="w-full px-4 py-2 text-left hover:bg-gray-100"
                onClick={() => navigate("/mypage")}
              >
                마이페이지
              </button>
              <button
                className="w-full px-4 py-2 text-left hover:bg-gray-100 text-red-500"
                onClick={handleLogout}
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      ) : (
        <Link
          to="/login"
          className="px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-100 transition"
        >
          로그인
        </Link>
      )}
    </header>
  );
}
