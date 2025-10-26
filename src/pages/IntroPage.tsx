// src/pages/IntroPage.tsx
import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import supabase from "@/lib/supabase";
import { MorphingText } from "@/components/ui/morphing-text";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeartPulse } from "@fortawesome/free-solid-svg-icons";

/** ===== Phase utils ===== */
type Phase = "dawn" | "morning" | "noon" | "evening" | "night";

/**
 * 시간대 (로컬 시간 기준)
 * - 새벽(dawn):       03:30 ~ 05:00
 * - 아침(morning):    05:01 ~ 11:30
 * - 점심(noon):       11:31 ~ 17:30
 * - 저녁(evening):    17:31 ~ 20:30
 * - 밤(night):        그 외
 */
function getPhase(date = new Date()): Phase {
  const h = date.getHours();
  const m = date.getMinutes();
  const toMin = h * 60 + m;

  const m0330 = 3 * 60 + 30;
  const m0500 = 5 * 60 + 0;
  const m0501 = 5 * 60 + 1;
  const m1130 = 11 * 60 + 30;
  const m1131 = 11 * 60 + 31;
  const m1730 = 17 * 60 + 30;
  const m1731 = 17 * 60 + 31;
  const m2030 = 20 * 60 + 30;

  if (toMin >= m0330 && toMin <= m0500) return "dawn";
  if (toMin >= m0501 && toMin <= m1130) return "morning";
  if (toMin >= m1131 && toMin <= m1730) return "noon";
  if (toMin >= m1731 && toMin <= m2030) return "evening";
  return "night";
}

/** Phase별 색상 토큰 + 카드 프레임 톤 */
function getPhaseTheme(phase: Phase) {
  switch (phase) {
    case "dawn":
      return {
        vars: {
          "--ink": "#3b3a50",
          "--ink-strong": "#2e2d42",
          "--accentA": "#b8b6ff",
          "--accentB": "#a0e0ff",
          "--frame": "rgba(255,255,255,0.92)",
        } as React.CSSProperties,
        vignette:
          "bg-[radial-gradient(75%_55%_at_50%_42%,transparent,rgba(10,14,40,0.18))]",
      };
    case "morning":
      return {
        vars: {
          "--ink": "#6b4e2d",
          "--ink-strong": "#563f25",
          "--accentA": "#d2a56f",
          "--accentB": "#b88044",
          "--frame": "rgba(255,255,255,0.94)",
        } as React.CSSProperties,
        vignette:
          "bg-[radial-gradient(75%_55%_at_50%_42%,transparent,rgba(0,0,0,0.08))]",
      };
    case "noon":
      return {
        vars: {
          "--ink": "#6b4e2d",
          "--ink-strong": "#563f25",
          "--accentA": "#d2a56f",
          "--accentB": "#b88044",
          "--frame": "rgba(255,255,255,0.92)",
        } as React.CSSProperties,
        vignette:
          "bg-[radial-gradient(75%_55%_at_50%_42%,transparent,rgba(0,0,0,0.08))]",
      };
    case "evening":
      return {
        vars: {
          "--ink": "#604529",
          "--ink-strong": "#4e3821",
          "--accentA": "#c99a6b",
          "--accentB": "#a87443",
          "--frame": "rgba(255,255,255,0.90)",
        } as React.CSSProperties,
        vignette:
          "bg-[radial-gradient(75%_55%_at_50%_42%,transparent,rgba(0,0,0,0.10))]",
      };
    case "night":
    default:
      return {
        vars: {
          "--ink": "#563f25",
          "--ink-strong": "#46331e",
          "--accentA": "#b88c5b",
          "--accentB": "#8f6336",
          "--frame": "rgba(255,255,255,0.88)",
        } as React.CSSProperties,
        vignette:
          "bg-[radial-gradient(75%_55%_at_50%_42%,transparent,rgba(0,0,0,0.12))]",
      };
  }
}

export default function IntroPage() {
  const navigate = useNavigate();
  const phase = useMemo(() => getPhase(), []);
  const theme = useMemo(() => getPhaseTheme(phase), [phase]);

  /** ---- 배경 이미지 소스 ---- */
  const bgSrc = useMemo(() => {
    switch (phase) {
      case "dawn":
        return "/intro/dawn.png";
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

  /** ---- 프리로드 ---- */
  useEffect(() => {
    const img = new Image();
    img.src = bgSrc;
  }, [bgSrc]);

  /** ---- 아무 키/클릭 시 이동 ---- */
  const locked = useRef(false);
  const continueRoute = async () => {
    if (locked.current) return;
    locked.current = true;
    const { data } = await supabase.auth.getSession();
    navigate(data.session ? "/main" : "/login", { replace: true });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      continueRoute();
    };
    const onClick = () => continueRoute();
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    window.addEventListener("touchstart", onClick, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("touchstart", onClick);
    };
  }, []);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  return (
    <div
      style={theme.vars}
      className={[
        "relative min-h-screen w-full overflow-hidden",
        "bg-center bg-cover",
      ].join(" ")}
    >
      {/* 배경 이미지 */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-center bg-cover"
        style={{ backgroundImage: `url(${bgSrc})` }}
      />

      {/* 비네트 + 그레인 */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 ${theme.vignette}`}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-multiply opacity-[0.04]"
        style={{
          backgroundImage: "url(/images/grain.png)",
          backgroundSize: 280,
        }}
      />

      {/* 중앙 카드 */}
      <motion.section
        initial={
          prefersReducedMotion
            ? { opacity: 1 }
            : { opacity: 0, y: 8, scale: 0.98 }
        }
        animate={
          prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }
        }
        transition={{
          duration: prefersReducedMotion ? 0 : 0.6,
          ease: "easeOut",
        }}
        className="relative z-10 flex min-h-screen items-center justify-center px-4"
      >
        <figure
          className={[
            "w-full max-w-2xl",
            "rounded-[32px] p-6 sm:p-8",
            "bg-[var(--frame)] backdrop-blur-xl",
            "ring-1 ring-black/10 shadow-[0_22px_70px_rgba(0,0,0,0.18)]",
          ].join(" ")}
          role="group"
          aria-label="인트로 카드"
        >
          {/* 상단 브랜드 라인 */}
          <div className="flex items-center gap-2 text-[var(--ink)] drop-shadow-[0_0_8px_rgba(216,165,110,0.35)]">
            <FontAwesomeIcon
              icon={faHeartPulse}
              className="h-5 w-5"
              style={{
                animation: prefersReducedMotion
                  ? "none"
                  : "pulseMini 1.8s ease-in-out infinite",
              }}
              aria-hidden
            />
            <span className="font-semibold">감자링</span>
          </div>

          {/* 헤드라인 */}
          <div className="mt-4 sm:mt-6 min-h-[3.5rem] sm:min-h-[4.5rem] flex items-center w-full">
            <MorphingText
              texts={["우리의 기록들이", "자라나는 공간 ", "감자링"]}
              className="font-bold whitespace-nowrap tracking-[-0.02em] text-[clamp(26px,6vw,56px)] !leading-[0.95] text-[var(--ink-strong)] font-hand"
              reducedMotion={!!prefersReducedMotion}
              renderWord={(word: string) =>
                word.trim() === "감자링" ? (
                  <span className="bg-gradient-to-br from-[var(--accentA)] to-[var(--accentB)] bg-clip-text text-transparent drop-shadow-sm">
                    {word}
                  </span>
                ) : (
                  word
                )
              }
            />
          </div>

          {/* === 중앙 정렬 안내 문구 (시간대 멘트 제거) === */}
          <div className="mt-8 sm:mt-10 w-full flex justify-center">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-white/55 ring-1 ring-black/5">
                <span className="text-sm sm:text-base font-medium text-[color:var(--ink)]/90">
                  아무 키를 누르거나 화면을 클릭하면 계속합니다
                </span>
                <kbd className="rounded-md border border-black/10 bg-white/60 px-1.5 text-[11px] tracking-wide text-[color:var(--ink)]/80">
                  Any key
                </kbd>
              </div>
              <div className="mt-2 text-[12px] text-[color:var(--ink)]/60">
                입력창에 포커스가 있으면 키 입력이 동작하지 않을 수 있어요
              </div>
            </div>
          </div>

          {/* 보조 키프레임 */}
          <style>{`
            @keyframes pulseMini { 0%,100% { transform: scale(1); opacity: .95 } 50% { transform: scale(1.06); opacity: 1 } }
          `}</style>
        </figure>
      </motion.section>

      {/* 스크린리더 안내 */}
      <p role="status" aria-live="polite" className="sr-only">
        아무 키를 누르거나 화면을 클릭하면 다음 화면으로 이동합니다.
      </p>
    </div>
  );
}
