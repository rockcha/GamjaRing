// src/components/UserGreetingSection.tsx
"use client";

import { useUser } from "@/contexts/UserContext";
import LoginButton from "./LoginButton";
import LogoutButton from "./LogoutButton";

type Props = {
  onNavigate?: (id: string, meta: { url: string; header?: string }) => void;
  headerById?: Record<string, string>;
  sessionHeaderKey?: string;
};

export default function UserGreetingSection({}: Props) {
  const { user } = useUser();

  return (
    <div className="flex items-center justify-end">
      {user ? <LogoutButton /> : <LoginButton />}
    </div>
  );
}
