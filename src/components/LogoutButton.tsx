// src/components/LogoutButton.tsx
"use client";

import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { useUser } from "@/contexts/UserContext";

export default function LogoutButton() {
  const { logout, user } = useUser();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    try {
      setLoading(true);
      await logout();
      // 로그인 페이지로 완전히 이동 (히스토리 정리)
      window.location.replace("/login");
    } catch (error) {
      console.error("로그아웃 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      aria-label="로그아웃"
      title="로그아웃"
      onClick={handleLogout}
      disabled={loading || !user}
      className={[
        // 위치: 메모 버튼(50%) 바로 밑으로 64px
        "fixed right-2 z-40",
        "top-[calc(50%+30px)]",
        // 모양/색감: 메모 버튼과 동일
        "rounded-full p-4 select-none",
        "bg-white/90 text-neutral-700",
        "hover:opacity-90 transition",
        // 비활성화 시
        "disabled:opacity-60 disabled:cursor-not-allowed",
      ].join(" ")}
    >
      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : (
        <LogOut className="h-6 w-6" />
      )}

      {/* 스크린리더 접근성용 텍스트 */}
      <span className="sr-only">로그아웃</span>
    </button>
  );
}
