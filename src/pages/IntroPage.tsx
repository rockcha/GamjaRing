// src/pages/IntroPage.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";

export default function IntroPage() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/main");
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      className={[
        "relative min-h-screen w-full overflow-hidden",
        "flex flex-col items-center justify-center",
        "bg-[radial-gradient(1200px_800px_at_50%_-10%,#fff7ec_10%,#fde9c9_45%,#f8d6a0_70%,#f6c77e_90%)]",
        "px-4",
      ].join(" ")}
    >
      {/* 소프트 비네팅 */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_400px_at_50%_30%,transparent,rgba(0,0,0,0.04))]" />

      {/* 은은한 그레인 */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.045] mix-blend-multiply"
        style={{
          backgroundImage:
            "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%224%22 height=%224%22 viewBox=%220 0 4 4%22><path fill=%22%23000%22 fill-opacity=%220.2%22 d=%22M0 0h1v1H0zm2 0h1v1H2zM1 1h1v1H1zm2 1h1v1H3zM0 2h1v1H0zM2 3h1v1H2z%22/></svg>')",
        }}
      />

      {/* 떠다니는 이모지 (감자/하트) */}
      {!prefersReducedMotion && (
        <>
          <FloatingEmoji emoji="🥔" x="12%" delay={0.0} />
          <FloatingEmoji emoji="❤️" x="22%" delay={0.5} />
          <FloatingEmoji emoji="🥔" x="78%" delay={0.2} />
          <FloatingEmoji emoji="💛" x="88%" delay={0.6} />
        </>
      )}

      {/* 로고/콘텐츠 카드 느낌 */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-3xl border border-[#6b4e2d]/10 bg-white/70 backdrop-blur-sm shadow-[0_15px_40px_rgba(107,78,45,0.15)] px-6 py-8 text-center">
          {/* 상단 감자 GIF + 글로우 */}
          <div className="relative mx-auto mb-3 w-28 h-28 sm:w-32 sm:h-32">
            <motion.div
              className="absolute inset-0 rounded-full blur-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              style={{
                background:
                  "conic-gradient(from 180deg, #ffdcae, #ffb86b, #ffdcae)",
              }}
            />
            <img
              src="/images/potato-intro.gif"
              alt="감자 귀여움"
              className="relative z-10 w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(107,78,45,0.25)]"
            />
          </div>

          {/* 멘트 */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-base sm:text-lg text-[#6b4e2d] font-semibold"
          >
            함께한 추억, 감자처럼 싹을 틔워요
          </motion.p>

          {/* 브랜드 네임 */}
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.7 }}
            className="mt-1 text-3xl sm:text-4xl font-extrabold tracking-wide text-[#6b4e2d]"
          >
            <span className="relative inline-block">
              감자링
              <span className="sr-only">(GamjaRing)</span>
              <span className="ml-2 align-middle text-[.65em] font-black text-[#a0713f]">
                (GamjaRing)
              </span>
            </span>
          </motion.h1>

          {/* 슬로건 보조 문구 */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="mt-3 text-sm text-[#705537]"
          >
            우리만의 기록이 자라나는 공간
          </motion.p>

          {/* 진행 바 */}
          <div className="mt-6">
            <div className="h-1.5 w-full rounded-full bg-[#6b4e2d]/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-[#6b4e2d]"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 2.6, ease: "easeInOut" }}
              />
            </div>
            <p className="mt-2 text-xs text-[#6b4e2d]/70">곧 시작할게요…</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/** 떠다니는 이모지 컴포넌트 */
function FloatingEmoji({
  emoji,
  x,
  delay = 0,
}: {
  emoji: string;
  x: string;
  delay?: number;
}) {
  return (
    <motion.span
      className="absolute z-0 text-4xl sm:text-5xl select-none"
      style={{ left: x, bottom: "-24px" }}
      initial={{ opacity: 0, y: 60, rotate: -8 }}
      animate={{ opacity: 0.65, y: -140, rotate: 8 }}
      transition={{
        duration: 5.5,
        delay,
        ease: "easeOut",
        repeat: Infinity,
        repeatType: "reverse",
      }}
    >
      {emoji}
    </motion.span>
  );
}
