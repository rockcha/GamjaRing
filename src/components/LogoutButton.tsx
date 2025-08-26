// src/components/LogoutButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { LogOut, Loader2 } from "lucide-react";

export default function LogoutButton() {
  const { logout } = useUser();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (loading) return;
    try {
      setLoading(true);
      await logout();
    } catch (error) {
      console.error("로그아웃 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      aria-label="로그아웃"
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      className="gap-1.5 text-[#3d2b1f]"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      로그아웃
    </Button>
  );
}
