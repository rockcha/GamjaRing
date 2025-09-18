// src/components/FloatingLeftRail.tsx
"use client";

import NoticeCenterFloatingButton from "@/features/dev-note/NoticeFloatingButton";

import PotatoPokeButton from "./PotatoPokeButton";
import DailyFortuneCard from "@/features/fortune/DailyFortuneCard";
import MapModalButton from "./MapModalButton";
import PotatoExchange from "./PotatoExchange";
import WeatherCard from "./WeatherCard";

export default function FloatingLeftRail() {
  return (
    <div className="fixed left-2 top-1/2 -translate-y-1/2 z-[50] flex flex-col items-center gap-2">
      <PotatoPokeButton />
      <WeatherCard />
      <DailyFortuneCard />
      <NoticeCenterFloatingButton />
      <MapModalButton />
      <PotatoExchange />
    </div>
  );
}
