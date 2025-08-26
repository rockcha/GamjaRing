// src/components/LoginButton.tsx
"use client";

import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LoginButton() {
  const navigate = useNavigate();

  return (
    <Button
      type="button"
      aria-label="로그인"
      variant="ghost"
      size="sm"
      onClick={() => navigate("/login")}
      className="gap-1.5 text-[#3d2b1f]"
    >
      <LogIn className="h-4 w-4" />
      로그인
    </Button>
  );
}
