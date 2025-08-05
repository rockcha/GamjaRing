// src/pages/MainPage.tsx
import { useUser } from "@/contexts/UserContext";
import { useNavigate } from "react-router-dom";

export default function MainPage() {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fdfcf9] px-4">
      <h1 className="text-3xl font-bold text-[#6b4e2d] mb-4">🎉 메인 페이지</h1>

      <p className="text-md text-[#8a6b50] mb-6">
        {user?.nickname
          ? `${user.nickname}님, 환영합니다!`
          : "로그인된 사용자가 없습니다."}
      </p>

      <div className="flex gap-4">
        <button
          onClick={logout}
          className="bg-[#f4c989] hover:bg-[#e5b97e] text-brown-800 py-2 px-6 rounded-full font-semibold shadow-inner border border-[#e1b574] transition duration-200"
        >
          로그아웃
        </button>

        <button
          onClick={() => navigate("/login")}
          className="bg-white hover:bg-gray-100 text-[#6b4e2d] py-2 px-6 rounded-full font-semibold border border-[#d3c4b0] transition duration-200"
        >
          로그인 페이지로
        </button>
      </div>
    </div>
  );
}
