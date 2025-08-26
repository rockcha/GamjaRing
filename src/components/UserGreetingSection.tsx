// src/components/UserGreetingSection.tsx
"use client";

import LogoutButton from "@/components/LogoutButton";
import LoginButton from "./LoginButton";
import { useUser } from "@/contexts/UserContext";

export default function UserGreetingSection() {
  const { user, isCoupled } = useUser();

  return (
    <div className="  flex items-center justify-end gap-2 ">
      {user ? (
        <>
          <div className="  text-center">
            <p className="text-gray-800 text-xl font-semibold truncate">
              {user.nickname}님,
            </p>
            <p className="font-semibold text-[#3d2b1f] text-xs">환영합니다</p>
          </div>
          <LogoutButton />
        </>
      ) : (
        <LoginButton />
      )}
    </div>
  );
}
