// src/components/AuthButton.tsx
"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { LogIn, LogOut, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: "sm" | "default" | "lg" | "icon";
  variant?:
    | "ghost"
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "link";
};

export default function AuthButton({
  className,
  size = "sm",
  variant = "ghost",
}: Props) {
  const navigate = useNavigate();
  const { user, logout } = useUser();
  const [loading, setLoading] = useState(false);

  const isLoggedIn = !!user?.id;

  const handleClick = async () => {
    if (loading) return;

    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      await logout?.();
      // 세션/캐시 정리용 강제 새로고침
      window.location.replace("/login");
    } catch (err) {
      console.error("로그아웃 실패:", err);
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      aria-label={isLoggedIn ? "로그아웃" : "로그인"}
      variant={variant}
      size={size}
      onClick={handleClick}
      className={cn("gap-1.5 text-[#3d2b1f]", className)}
      disabled={isLoggedIn && loading}
      aria-busy={isLoggedIn && loading}
    >
      {isLoggedIn ? (
        <>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          로그아웃
        </>
      ) : (
        <>
          <LogIn className="h-4 w-4" />
          로그인
        </>
      )}
    </Button>
  );
}
