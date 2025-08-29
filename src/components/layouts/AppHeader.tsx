// src/components/layouts/AppHeader.tsx
"use client";

import { HeartHandshake } from "lucide-react";
import DaysTogetherBadge from "../DaysTogetherBadge";
import UserGreetingSection from "../UserGreetingSection";
import { cn } from "@/lib/utils";

// 객체/문자열 모두 허용
type HeaderMeta = { url: string; header?: string };
type HeaderMapLike = Record<string, string | HeaderMeta>;

interface AppHeaderProps {
  routeTitle: string;
  onNavigate?: (id: string) => void; // 부모는 id만 받으면 됨
  headerById?: HeaderMapLike; // 문자열 or 객체 모두 허용
  className?: string;
}

const DEFAULT_HEADER_BY_ID: HeaderMapLike = {
  home: { url: "/", header: "감자링" },
  info: { url: "/info", header: "감자링이란?" },
  settings: { url: "/settings", header: "마이페이지" },
  notifications: { url: "/notifications", header: "알림페이지" },
  questions: { url: "/questions", header: "오늘의 질문" },
  bundle: { url: "/bundle", header: "답변꾸러미" },
  scheduler: { url: "/scheduler", header: "커플 스케쥴러" },
};

// ✅ UserGreetingSection 이 기대하는 형태(Record<string, string>)로 변환
function toLabelMap(m: HeaderMapLike): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(m)) {
    out[k] = typeof v === "string" ? v : v.header ?? k;
  }
  return out;
}

export default function AppHeader({
  routeTitle,
  onNavigate,
  headerById = DEFAULT_HEADER_BY_ID,
  className,
}: AppHeaderProps) {
  const labelMap = toLabelMap(headerById);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60",
        className
      )}
    >
      <div className="mx-auto px-4 py-2">
        <div className="flex h-14 items-center">
          <HeartHandshake className="h-6 w-6" />
          <h1 className="min-w-0 flex-1 truncate pl-1 text-2xl font-extrabold tracking-tight">
            {routeTitle}
          </h1>

          <div className="hidden md:block">
            <DaysTogetherBadge />
          </div>

          <div className="flex flex-1 justify-end">
            <UserGreetingSection
              // UserGreetingSection 이 (id: string)만 요구한다면 그대로 전달
              onNavigate={(id: string) => onNavigate?.(id)}
              headerById={labelMap}
            />
          </div>
        </div>

        <div className="block py-2 md:hidden">
          <div className="flex justify-center">
            <DaysTogetherBadge />
          </div>
        </div>
      </div>
    </header>
  );
}
