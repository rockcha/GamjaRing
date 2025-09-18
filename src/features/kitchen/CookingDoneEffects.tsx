"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Props = {
  emoji: string; // 요리 이모지 (예: 🍲)
  gold?: number; // 보상 골드가 있으면 +G 텍스트 표시
  durationMs?: number; // 전체 이펙트 유지 시간
  className?: string; // 위치 커스터마이즈 시
};

type Particle = {
  id: number;
  char: string;
  x: number;
  y: number;
  rot: number;
  scale: number;
  delay: number;
  duration: number;
};

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export default function CookingDoneEffects({
  emoji,
  gold,
  durationMs = 1200,
  className,
}: Props) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShow(false), durationMs);
    return () => clearTimeout(t);
  }, [durationMs]);

  // 파티클 이모지 후보 (요리 + 약간의 재료 테마)
  const palette = useMemo(() => {
    const extra = ["🥔", "🧅", "🧂", "🍳", "✨"];
    return [emoji, ...extra];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emoji]);

  // 최초 1회 랜덤 파티클 생성
  const particles = useMemo<Particle[]>(() => {
    const N = 24;
    const arr: Particle[] = [];
    for (let i = 0; i < N; i++) {
      const angle = rand(0, Math.PI * 2);
      const dist = rand(60, 140);
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist;
      arr.push({
        id: i,
        char: palette[Math.floor(rand(0, palette.length))],
        x,
        y,
        rot: rand(-90, 90),
        scale: rand(0.8, 1.2),
        delay: rand(0, 0.08),
        duration: rand(0.45, 0.75),
      });
    }
    return arr;
  }, [palette]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={cn(
            "pointer-events-none absolute inset-0 grid place-items-center overflow-hidden",
            className
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* 1) 라디얼 플래시 */}
          <motion.div
            className="absolute w-[120vmax] h-[120vmax] rounded-full"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.05) 40%, rgba(255,255,255,0) 60%)",
            }}
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          />

          {/* 2) 충격파 링 2겹 */}
          <Ring delay={0.02} />
          <Ring delay={0.12} />

          {/* 3) 중앙 ‘완성’ 이모지 스탬프 + 샤인 */}
          <div className="relative">
            <motion.div
              className="text-6xl md:text-7xl drop-shadow"
              initial={{ scale: 0.2, rotate: -10, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
            >
              {emoji}
            </motion.div>

            {/* 샤인 스윕 */}
            <motion.div
              className="absolute -inset-6 -skew-x-12"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%)",
              }}
              initial={{ x: "-120%", opacity: 0.0 }}
              animate={{ x: "120%", opacity: 0.8 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            />
          </div>

          {/* 4) 이모지 파티클 버스트 */}
          <div className="absolute inset-0">
            {particles.map((p) => (
              <motion.span
                key={p.id}
                className="absolute left-1/2 top-1/2 text-xl md:text-2xl"
                initial={{ x: 0, y: 0, rotate: 0, opacity: 0 }}
                animate={{
                  x: p.x,
                  y: p.y,
                  rotate: p.rot,
                  opacity: [0, 1, 0],
                  scale: p.scale,
                }}
                transition={{
                  delay: 0.06 + p.delay,
                  duration: p.duration,
                  ease: "easeOut",
                }}
              >
                {p.char}
              </motion.span>
            ))}
          </div>

          {/* 5) 골드 플로팅 넘버 (선택) */}
          {typeof gold === "number" && gold > 0 && (
            <motion.div
              className="absolute right-6 top-6 rounded-full bg-amber-100/80 border border-amber-200 px-3 py-1 text-sm text-amber-900 shadow"
              initial={{ y: 6, opacity: 0, scale: 0.9 }}
              animate={{ y: -10, opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            >
              +{gold}G
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Ring({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      className="absolute w-56 h-56 md:w-72 md:h-72 rounded-full border-2"
      style={{
        borderColor: "rgba(255,255,255,0.6)",
        boxShadow: "0 0 40px rgba(255,255,255,0.35) inset",
      }}
      initial={{ scale: 0.2, opacity: 0.9 }}
      animate={{ scale: 1.25, opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeOut", delay }}
    />
  );
}
