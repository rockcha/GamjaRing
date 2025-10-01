// src/pages/IntroPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import supabase from "@/lib/supabase";
import { MorphingText } from "@/components/ui/morphing-text";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeartPulse } from "@fortawesome/free-solid-svg-icons";

/** ===== Phase utils ===== */
type Phase = "morning" | "noon" | "evening" | "night";

function getPhase(date = new Date()): Phase {
  const h = date.getHours();
  const m = date.getMinutes();
  const toMin = h * 60 + m;
  if (toMin >= 5 * 60 && toMin <= 11 * 60 + 30) return "morning";
  if (toMin >= 11 * 60 + 31 && toMin <= 17 * 60 + 30) return "noon";
  if (toMin >= 17 * 60 + 31 && toMin <= 20 * 60 + 30) return "evening";
  return "night";
}

function phaseBackgroundClass(phase: Phase) {
  // 배경 톤을 시간대별로 아주 미세하게 바꿔줍니다.
  switch (phase) {
    case "morning":
      return "bg-[linear-gradient(160deg,#f9f3ea,#f2e6d3,#e9d9c5)]";
    case "noon":
      return "bg-[linear-gradient(160deg,#f6efe4,#eedec8,#e4cfb2)]";
    case "evening":
      return "bg-[linear-gradient(160deg,#f1e7db,#e5d3c0,#d8c0a8)]";
    case "night":
    default:
      return "bg-[linear-gradient(160deg,#efe9df,#e3d6c6,#d6c4ad)]";
  }
}

function phaseLabel(phase: Phase) {
  switch (phase) {
    case "morning":
      return "지금은 아침입니다!";
    case "noon":
      return "지금은 낮입니다!";
    case "evening":
      return "지금은 저녁입니다!";
    case "night":
      return "지금은 밤입니다!";
  }
}

/** ===== Progress & Potato utils ===== */
const LOADING_MS = 3500;
const FINISH_BREATH_MS = 260; // ‘한 호흡 더’ 연출 시간

function potatoColor(progress: number) {
  // 25% → 연노랑, 50% → 금색, 75% → 노릇갈색, 100% → 바삭갈색
  if (progress >= 100) return "#7a4e1f"; // 바삭갈색
  if (progress >= 75) return "#9a662a"; // 노릇갈색
  if (progress >= 50) return "#c9903d"; // 금색
  if (progress >= 25) return "#e9d07a"; // 연노랑
  return "#f3eab4"; // 아주 연한 반죽색
}

/** 작은 감자 ‘오벌’ 아이콘 (색상/미세 펄스 애니메이션) */
function PotatoIcon({ progress }: { progress: number }) {
  const bg = potatoColor(progress);
  return (
    <span
      aria-hidden
      className="inline-block align-[-0.12em] mr-1 h-[0.9em] w-[1.1em] rounded-[999px] relative
                 ring-1 ring-black/5 shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]
                 animate-[potatoPulse_1.6s_ease-in-out_infinite]"
      style={{ backgroundColor: bg }}
      title="감자 진행 아이콘"
    >
      {/* 살짝 점(감자 눈) */}
      <span
        className="absolute left-[22%] top-[35%] h-[0.12em] w-[0.12em] rounded-full bg-black/20"
        style={{ boxShadow: "0.32em 0.06em 0 0 rgba(0,0,0,0.16)" }}
      />
    </span>
  );
}

export default function IntroPage() {
  const navigate = useNavigate();

  /** ---- Phase & assets ---- */
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

  // 첫 프레임 깔끔하게: 이미지 프리로드
  useEffect(() => {
    const img = new Image();
    img.src = bgSrc;
  }, [bgSrc]);

  /** ---- Loading & route ---- */
  const [progress, setProgress] = useState(0);
  const [finishing, setFinishing] = useState(false); // 마감 연출 트리거
  const routedRef = useRef(false);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();

    const tick = async (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, Math.round((elapsed / LOADING_MS) * 100));
      setProgress(pct);

      if (pct >= 100 && !routedRef.current) {
        routedRef.current = true;
        // ‘한 호흡 더’ — 짧은 플래시/스케일 연출 후 라우팅
        setFinishing(true);
        setTimeout(async () => {
          const { data } = await supabase.auth.getSession();
          navigate(data.session ? "/main" : "/login", { replace: true });
        }, FINISH_BREATH_MS);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [navigate]);

  /** ---- Loading message ---- */
  const loadingMessage = useMemo(() => {
    const candidates = [
      "감자 껍질 까는 중...",
      "감자 삶는 중...",
      "버터와 치즈 섞는 중...",
      "감자 물주는 중...",
      "감자 노릇노릇 굽는 중...",
      "소금 톡톡 뿌리는 중...",
      "감자 이뻐하는 중...",
      "감자밭에서 노는 중...",
    ];
    return candidates[Math.floor(Math.random() * candidates.length)];
  }, []);

  /** ---- Headline layout constants ---- */
  const HEADLINE_TXT =
    "text-[26pt] md:text-[34pt] lg:text-[4rem] font-bold whitespace-nowrap";
  const HEADLINE_BOX = "relative w-full h-14 md:h-20 lg:h-24"; // 살짝 키워서 시프트 0에 가깝게
  const HEADLINE_POS =
    "absolute inset-x-0 top-1/2 -translate-y-1/2 text-center md:text-left translate-z-0";

  /** ---- Reduced motion ---- */
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  return (
    <div
      className={[
        "relative min-h-screen w-full overflow-hidden flex items-center justify-center px-4",
        phaseBackgroundClass(phase),
        "before:absolute before:inset-0 before:content-[''] before:bg-[radial-gradient(900px_600px_at_50%_-10%,rgba(255,255,255,0.35),transparent_70%)]",
      ].join(" ")}
    >
      {/* 전역 키프레임: 감자 펄스 & 피니시 플래시 */}
      <style>{`
        @keyframes potatoPulse {
          0%, 100% { transform: translateZ(0) scale(1); }
          50% { transform: translateZ(0) scale(1.05); }
        }
        @keyframes introFlash {
          0%   { opacity: 0; transform: scale(1) }
          30%  { opacity: .72; transform: scale(1.012) }
          100% { opacity: 0; transform: scale(1) }
        }
      `}</style>

      {/* 그레인 (밤에는 살짝 더 진하게) */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 mix-blend-multiply ${
          phase === "night" ? "opacity-[0.06]" : "opacity-[0.05]"
        }`}
        style={{
          backgroundImage: "url(/images/grain.png)",
          backgroundSize: 240,
        }}
      />

      {/* 마감 연출: 아주 얇은 플래시 레이어 */}
      {finishing && (
        <div
          aria-hidden
          className="intro-flash pointer-events-none absolute inset-0 bg-white/70 animate-[introFlash_0.26s_ease-out_1]"
        />
      )}

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
          duration: prefersReducedMotion ? 0 : 0.7,
          ease: "easeOut",
        }}
        className="relative z-10 grid w-full max-w-5xl gap-8 md:gap-10 md:grid-cols-2 items-center"
      >
        {/* ── (좌) 액자 + 시간대 멘트 ── */}
        <div className="flex flex-col items-center gap-3 md:items-start">
          <figure
            className={[
              "relative w-[82%] max-w-sm aspect-[4/5] rounded-[28px]",
              "bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(255,255,255,0.6))]",
              "shadow-[0_18px_50px_rgba(140,105,65,0.22)]",
              "ring-1 ring-white/70",
            ].join(" ")}
          >
            <div className="absolute inset-3 rounded-2xl bg-amber-800 ring-1 ring-black/5 overflow-hidden">
              <div
                className="absolute inset-2 rounded-xl bg-center bg-cover"
                style={{ backgroundImage: `url(${bgSrc})` }}
              />
              <div className="absolute inset-2 rounded-xl pointer-events-none">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/35 to-transparent mix-blend-screen" />
                <div className="absolute -top-6 -left-10 w-56 h-56 rotate-12 bg-white/25 blur-2xl" />
              </div>
            </div>
          </figure>

          {/* 시간대 멘트 */}
          <figcaption className="text-sm md:text-base font-medium text-[#6b4e2d]">
            {phaseLabel(phase)}
          </figcaption>
        </div>

        {/* ── (우) 타이틀 + 헤드라인 + 로딩바 ── */}
        <div className="flex flex-col items-center md:items-start text-[#6b4e2d]">
          {/* 상단: HeartPulse + 감자링 */}
          <div className="flex items-center gap-2 text-[#6b4e2d]">
            <FontAwesomeIcon
              icon={faHeartPulse}
              className="h-5 w-5 animate-[pulseMini_1.8s_ease-in-out_infinite]"
              aria-hidden
            />
            <span className="font-semibold">감자링</span>
          </div>

          <style>{`
            @keyframes pulseMini {
              0%,100% { transform: scale(1); opacity: .9 }
              50%     { transform: scale(1.06); opacity: 1 }
            }
          `}</style>

          {/* 헤드라인: MorphingText */}
          <div className={`mt-6 ${HEADLINE_BOX}`}>
            <div className={`${HEADLINE_POS}`}>
              <MorphingText
                texts={["우리의 기록들이", "자라나는 공간 ", "감자링"]}
                className={`${HEADLINE_TXT} !leading-[0.9] text-[#6b4e2d]`}
              />
            </div>
          </div>

          {/* 로딩바 + 퍼센트(감자 아이콘 포함) */}
          <div className="mt-6 w-full max-w-xl">
            <div className="mb-1 flex items-center justify-between text-sm text-[#5d4428]">
              <span className="font-medium">{loadingMessage}</span>

              {/* 감자 아이콘 + 탭룰러 숫자 */}
              <span className="tabular-nums flex items-center">
                <PotatoIcon progress={progress} />
                {progress}%
              </span>
            </div>

            {/* 접근성 배려 */}
            <div
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2 w-full overflow-hidden rounded-full bg-[#e9d9c5] ring-1 ring-black/5"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#d2a56f] to-[#b88044] transition-[width] duration-[120ms] ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </motion.section>

      {/* 비네트 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(75%_55%_at_50%_42%,transparent,rgba(0,0,0,0.08))]"
      />

      {/* SR 텍스트 */}
      <p role="status" aria-live="polite" className="sr-only">
        로딩 중…
      </p>
    </div>
  );
}
