"use client";
import { motion, AnimatePresence } from "framer-motion";

type Burst = { emoji: string; key: number } | null;

export default function CookingPot({ burst }: { burst: Burst }) {
  return (
    <div className="relative min-h-[320px] flex items-center justify-center">
      <img
        src="/images/CookingPot.png"
        alt="요리 냄비"
        className="w-full max-w-xs md:max-w-sm h-auto object-contain drop-shadow-md select-none pointer-events-none"
        loading="lazy"
      />
      {/* 중앙 오버레이: 좀 더 위쪽 & 페이드아웃 */}
      <AnimatePresence>
        {burst && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              key={burst.key}
              initial={{ opacity: 0, y: -10, scale: 0.9 }}
              animate={{ opacity: 0.9, y: -40, scale: 1 }}
              exit={{ opacity: 0, y: -70 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 26,
                duration: 0.5,
              }}
              className="flex items-start gap-1"
            >
              <span className="text-5xl md:text-6xl drop-shadow-sm">
                {burst.emoji}
              </span>
              <span className="-ml-1 text-2xl md:text-3xl font-extrabold opacity-80">
                +
              </span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
