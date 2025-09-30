// src/pages/IntroPage.tsx
import { useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { HeartHandshake } from "lucide-react";
import supabase from "@/lib/supabase";

function getPhase(date = new Date()) {
  const h = date.getHours();
  const m = date.getMinutes();
  const toMin = h * 60 + m;
  if (toMin >= 5 * 60 && toMin <= 11 * 60 + 30) return "morning" as const;
  if (toMin >= 11 * 60 + 31 && toMin <= 17 * 60 + 30) return "noon" as const;
  if (toMin >= 17 * 60 + 31 && toMin <= 20 * 60 + 30) return "evening" as const;
  return "night" as const;
}

export default function IntroPage() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  // 배경 페이드만 reduce 반영
  const FADE_SEC = reduce ? 0.3 : 3.7;

  const phase = useMemo(() => getPhase(), []);
  const bgSrc = useMemo(() => {
    switch (phase) {
      case "morning":
        return "/intro/morning.png";
      case "noon":
        return "/intro/noon.png";
      case "evening":
        return "/intro/evening.png";
      default:
        return "/intro/night.png";
    }
  }, [phase]);

  // 애니메이션 완료 후 시작되는 1.5s 타이머를 관리
  const routedRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  // 언마운트시 타이머 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  async function goAfterDelay() {
    if (routedRef.current) return;
    routedRef.current = true;

    // 1) 글자 다 보인 시점으로부터 1.5초 대기
    await new Promise<void>((r) => {
      timerRef.current = window.setTimeout(() => r(), 1500);
    });

    // 2) 그 때의 세션으로 판단해서 라우팅
    const { data } = await supabase.auth.getSession();
    navigate(data.session ? "/main" : "/login", { replace: true });
  }

  return (
    <div
      className={[
        "relative min-h-screen w-full overflow-hidden",
        "flex items-center justify-center",
        "bg-[radial-gradient(1100px_700px_at_50%_-10%,#f6ebdd_10%,#e7c8a4_48%,#c08b4f_92%)]",
        "px-4",
      ].join(" ")}
    >
      {/* 그레인 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-multiply"
        style={{
          backgroundImage: "url(/images/grain.png)",
          backgroundSize: 300,
        }}
      />

      {/* 시간대별 배경: 페이드 인 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: FADE_SEC, ease: "easeOut" }}
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `url(${bgSrc})`,
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* 🔽 중앙 스팟 스크림 (가독성 향상용) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(44% 28% at 50% 50%, rgba(0,0,0,0.22) 0%, rgba(0,0,0,0.08) 60%, rgba(0,0,0,0) 100%)",
          mixBlendMode: "multiply",
        }}
      />

      {/* 중앙 타이포 */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="inline-flex items-center gap-3"
        >
          <HeartHandshake
            aria-hidden
            className="h-9 w-9 sm:h-11 sm:w-11 text-amber-700 drop-shadow-[0_2px_6px_rgba(107,78,45,0.25)]"
          />
          <h1
            className="
              text-4xl sm:text-5xl font-black tracking-tight
              bg-clip-text text-transparent
              bg-[linear-gradient(135deg,#6b4e2d_0%,#a0713f_45%,#d39a5b_100%)]
              drop-shadow-[0_1px_0_rgba(0,0,0,0.08)]
            "
            style={{
              // 스팟 스크림과 시너지를 주는 얇은 외곽/그림자 (가독성 +)
              WebkitTextStroke: "0.6px rgba(255,255,255,0.55)",
              textShadow:
                "0 1px 2px rgba(0,0,0,0.45), 0 0 8px rgba(0,0,0,0.18)",
            }}
          >
            감자링
          </h1>
        </motion.div>

        {/* ⬇️ 이 애니메이션이 '끝난 시점' 기준으로 1.5초 후 라우팅 */}
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 0.95, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6, ease: "easeOut" }}
          className="mt-3 text-[13px] sm:text-base text-[#705537]"
          style={{
            textShadow: "0 1px 2px rgba(0,0,0,0.35)",
          }}
          onAnimationComplete={() => {
            // 중복 방지
            if (!routedRef.current) {
              void goAfterDelay();
            }
          }}
        >
          우리의 기록이 자라나는 공간
        </motion.p>

        <p role="status" aria-live="polite" className="sr-only">
          로딩 중…
        </p>
      </div>

      {/* 비네트 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(75%_55%_at_50%_42%,transparent,rgba(0,0,0,0.16))]"
      />
    </div>
  );
}
