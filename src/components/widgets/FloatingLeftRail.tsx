// src/components/FloatingLeftRail.tsx
"use client";

import NoticeCenterFloatingButton from "@/features/dev-note/NoticeFloatingButton";

import PotatoPokeButton from "./PotatoPokeButton";
import DailyFortuneCard from "@/features/fortune/DailyFortuneCard";
import MapModalButton from "./MapModalButton";
import PotatoExchange from "./PotatoExchange";
import WeatherCard from "./WeatherCard";

import KoreanQuoteButton from "./KoreanQuoteButton";
import TimeCapsuleButton from "@/features/time-capsule/TimeCapsuleButton";
import UserMemoEmojiButton from "@/features/memo/UserFloatingMemo";

import SlotSpinButton from "./SlotSpinButton";

/* ▼ 애니메이션 & 아이콘 */
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import * as React from "react";

export default function FloatingLeftRail() {
  const [collapsed, setCollapsed] = React.useState<boolean>(false);

  // 로컬 저장 (선택사항)
  React.useEffect(() => {
    const v = localStorage.getItem("leftRailCollapsed");
    if (v === "1") setCollapsed(true);
  }, []);
  const toggle = () => {
    setCollapsed((v) => {
      const nv = !v;
      localStorage.setItem("leftRailCollapsed", nv ? "1" : "0");
      return nv;
    });
  };

  return (
    <div
      className={cn(
        "fixed left-2 top-1/2 -translate-y-1/2 z-[50]",
        "flex flex-col items-center"
      )}
    >
      {/* 토글 버튼 */}
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "펼치기" : "접기"}
        title={collapsed ? "펼치기" : "접기"}
        className={cn(
          "grid place-items-center h-9 w-9 rounded-full border bg-white/80 shadow-sm",
          "hover:shadow transition will-change-transform hover:-translate-y-0.5"
        )}
      >
        <FontAwesomeIcon
          icon={collapsed ? faChevronRight : faChevronLeft}
          className="h-4 w-4 text-zinc-700"
        />
      </button>

      {/* 내용부: 접힘/펼침 애니메이션 */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="rail-content"
            initial={{ opacity: 0, x: -10, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="mt-2 flex flex-col items-center gap-2"
          >
            {/* 필요 시 보여줄 항목들 */}
            {/* <PotatoPokeButton /> */}
            <UserMemoEmojiButton />
            <TimeCapsuleButton />
            <WeatherCard />
            <DailyFortuneCard />
            <NoticeCenterFloatingButton />
            <KoreanQuoteButton />
            <SlotSpinButton />

            {/* 추가: 다른 버튼을 넣고 싶으면 여기에 */}
            {/* <MapModalButton /> */}
            {/* <PotatoExchange /> */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
