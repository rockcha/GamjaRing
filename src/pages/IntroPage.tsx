// src/pages/IntroPage.tsx
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { HeartHandshake } from "lucide-react";
import supabase from "@/lib/supabase";

/** 시간대 판별 (분 단위로 비교) */
function getPhase(date = new Date()) {
  const h = date.getHours();
  const m = date.getMinutes();
  const toMin = h * 60 + m; // 0~1439

  const MORN_START = 5 * 60 + 0; // 05:00
  const MORN_END = 11 * 60 + 30; // 11:30
  const NOON_START = 11 * 60 + 31; // 11:31
  const NOON_END = 17 * 60 + 30; // 17:30
  const EVE_START = 17 * 60 + 31; // 17:31
  const EVE_END = 20 * 60 + 30; // 20:30
  // NIGHT: 20:31 ~ 04:59

  if (toMin >= MORN_START && toMin <= MORN_END) return "morning" as const;
  if (toMin >= NOON_START && toMin <= NOON_END) return "noon" as const;
  if (toMin >= EVE_START && toMin <= EVE_END) return "evening" as const;
  return "night" as const;
}

export default function IntroPage() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  // ⏱️ 스플래시 최소 노출 시간 = 배경 페이드 길이
  const FADE_SEC = reduce ? 0.5 : 3.7;
  const MIN_SPLASH_MS = Math.round(FADE_SEC * 1000);

  // 시간대별 배경 이미지 (이번엔 '페이드 인'으로 등장)
  const phase = useMemo(() => getPhase(), []);
  const bgSrc = useMemo(() => {
    switch (phase) {
      case "morning":
        return "/intro/morning.png";
      case "noon":
        return "/intro/noon.png";
      case "evening":
        return "/intro/evening.png";
      case "night":
      default:
        return "/intro/night.png";
    }
  }, [phase]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sessionPromise = supabase.auth.getSession();
      const timerPromise = new Promise<void>((r) =>
        setTimeout(r, MIN_SPLASH_MS)
      );
      const sessionRes = await sessionPromise;
      await timerPromise;
      if (cancelled) return;
      navigate(sessionRes.data.session ? "/main" : "/login", { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, MIN_SPLASH_MS]);

  return (
    <div
      className={[
        "relative min-h-screen w-full overflow-hidden",
        "flex items-center justify-center",
        // ▶ 처음엔 '브랜드 브라운' 계열이 보이고…
        "bg-[radial-gradient(1100px_700px_at_50%_-10%,#f6ebdd_10%,#e7c8a4_48%,#c08b4f_92%)]",
        "px-4",
      ].join(" ")}
    >
      {/* 은은한 그레인 (초반 브라운 톤 강화) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-multiply"
        style={{
          backgroundImage: "url(/images/grain.png)",
          backgroundSize: 300,
        }}
      />

      {/* …그 위로 시간대별 PNG 배경이 '서서히 나타남(페이드 인)' */}
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

      {/* 중앙 타이포 (고정 서브타이틀) */}
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
          >
            감자링
          </h1>
        </motion.div>

        {/* 요청: 시간대 무관 고정 카피 */}
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 0.95, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="mt-3 text-[13px] sm:text-base text-[#705537]"
        >
          우리의 기록이 자라나는 공간
        </motion.p>

        <p role="status" aria-live="polite" className="sr-only">
          로딩 중…
        </p>
      </div>

      {/* 미세 비네트 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(75%_55%_at_50%_42%,transparent,rgba(0,0,0,0.16))]"
      />
    </div>
  );
}
