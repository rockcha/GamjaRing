// src/components/MainHeader.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CoupleRequestButton from "@/components/CoupleRequestButton";
import CoupleRequestAlert from "@/components/CoupleRequestAlert";
import supabase from "@/lib/supabase";

interface UserData {
  id: string;
  email: string;
  nickname: string;
  partner_id: string | null;
}

export default function MainHeader() {
  const [user, setUser] = useState<UserData | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (!error && data) {
        setUser(data);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate("/login");
  };

  return (
    <header className="w-full flex items-center justify-between px-6 py-5 bg-[#d7b89c] border-b shadow-sm">
      <div className="bg-white px-4 py-2 rounded-full shadow flex items-center gap-2">
        <Link
          to="/"
          className="text-xl flex items-center gap-2 hover:text-amber-600 hover:scale-105 transition-all duration-300 ease-in-out"
        >
          감자링
          <span className="w-8 h-8 flex items-center justify-center animate-bounce">
            🥔
          </span>
        </Link>
      </div>

      {/* 로고 */}

      {/* 오른쪽 영역 */}
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
              {user.partner_id && (
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
