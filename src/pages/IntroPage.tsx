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

/** Phase별 색상 토큰 + 배경 그라데이션 클래스 */
function getPhaseTheme(phase: Phase) {
  switch (phase) {
    case "morning":
      return {
        /** CSS 변수 */
        vars: {
          "--ink": "#6b4e2d",
          "--ink-strong": "#563f25",
          "--accentA": "#d2a56f",
          "--accentB": "#b88044",
          "--frame": "rgba(255,255,255,0.92)",
          "--track": "#e9d9c5",
        } as React.CSSProperties,
        /** 배경 */
        bgClass: "bg-[linear-gradient(160deg,#f9f3ea,#f2e6d3,#e9d9c5)]",
      };
    case "noon":
      return {
        vars: {
          "--ink": "#6b4e2d",
          "--ink-strong": "#563f25",
          "--accentA": "#d2a56f",
          "--accentB": "#b88044",
          "--frame": "rgba(255,255,255,0.9)",
          "--track": "#e9d9c5",
        } as React.CSSProperties,
        bgClass: "bg-[linear-gradient(160deg,#f6efe4,#eedec8,#e4cfb2)]",
      };
    case "evening":
      return {
        vars: {
          "--ink": "#604529",
          "--ink-strong": "#4e3821",
          "--accentA": "#c99a6b",
          "--accentB": "#a87443",
          "--frame": "rgba(255,255,255,0.88)",
          "--track": "#e6d6c2",
        } as React.CSSProperties,
        bgClass: "bg-[linear-gradient(160deg,#f1e7db,#e5d3c0,#d8c0a8)]",
      };
    case "night":
    default:
      return {
        vars: {
          "--ink": "#563f25",
          "--ink-strong": "#46331e",
          "--accentA": "#b88c5b",
          "--accentB": "#8f6336",
          "--frame": "rgba(255,255,255,0.86)",
          "--track": "#ddccb7",
        } as React.CSSProperties,
        bgClass: "bg-[linear-gradient(160deg,#efe9df,#e3d6c6,#d6c4ad)]",
      };
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
const FINISH_BREATH_MS = 260; // ‘한 호흡 더’

function potatoColor(progress: number) {
  // 25% → 연노랑, 50% → 금색, 75% → 노릇갈색, 100% → 바삭갈색
  if (progress >= 100) return "#7a4e1f"; // 바삭갈색
  if (progress >= 75) return "#9a662a"; // 노릇갈색
  if (progress >= 50) return "#c9903d"; // 금색
  if (progress >= 25) return "#e9d07a"; // 연노랑
  return "#f3eab4"; // 아주 연한 반죽색
}

/** 작은 감자 ‘오벌’ 아이콘 (색상/미세 펄스 + 광택 스윕) */
function PotatoIcon({ progress }: { progress: number }) {
  const bg = potatoColor(progress);
  const faster = progress >= 75; // 75%↑ 살짝 빠르게
  return (
    <span
      aria-hidden
      className="inline-block align-[-0.12em] mr-1 h-[0.9em] w-[1.1em] rounded-[999px] relative
                 ring-1 ring-black/5 shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]"
      style={{
        backgroundColor: bg,
        animation: `${
          faster
            ? "potatoPulse 1.3s ease-in-out infinite"
            : "potatoPulse 1.6s ease-in-out infinite"
        }`,
      }}
      title="감자 진행 아이콘"
    >
      {/* 살짝 점(감자 눈) */}
      <span
        className="absolute left-[22%] top-[35%] h-[0.12em] w-[0.12em] rounded-full bg-black/20"
        style={{ boxShadow: "0.32em 0.06em 0 0 rgba(0,0,0,0.16)" }}
      />
      {/* 광택 스윕 */}
      <span
        className="absolute inset-y-[30%] left-0 w-[35%] skew-x-[12deg] rounded
                   bg-white/35 blur-[1px] pointer-events-none"
        style={{
          animation: `${
            faster
              ? "shineSweep 2.1s ease-in-out infinite"
              : "shineSweep 2.6s ease-in-out infinite"
          }`,
        }}
      />
    </span>
  );
}

export default function IntroPage() {
  const navigate = useNavigate();

  /** ---- Phase & assets ---- */
  const phase = useMemo(() => getPhase(), []);
  const theme = useMemo(() => getPhaseTheme(phase), [phase]);

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
        // ‘한 호흡 더’ — 상단 라이트 스윕 후 라우팅
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
    const base = [
      "감자 껍질 까는 중...",
      "감자 삶는 중...",
      "버터와 치즈 섞는 중...",
      "감자 물주는 중...",
      "감자 노릇노릇 굽는 중...",
      "소금 톡톡 뿌리는 중...",
      "감자 이뻐하는 중...",
      "감자밭에서 노는 중...",
    ];
    const phaseAdds: Record<Phase, string[]> = {
      morning: ["햇살로 깨우는 중..."],
      noon: ["파릇파릇한 잎을 살피는 중..."],
      evening: ["노을빛 양념 준비 중..."],
      night: ["감자에게 이불 덮는 중..."],
    };
    const pool = [...base, ...phaseAdds[phase]];
    return pool[Math.floor(Math.random() * pool.length)];
  }, [phase]);

  /** ---- Headline layout ---- */
  const HEADLINE_TXT =
    "font-bold whitespace-nowrap tracking-[-0.02em] text-[clamp(28px,6vw,64px)]";
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  return (
    <div
      style={theme.vars}
      className={[
        "relative min-h-screen w-full overflow-hidden flex items-center justify-center px-4",
        theme.bgClass,
        // 상단/하단 세이프 에어리어 보정
        "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
        // 상단 라이트 오라
        "before:absolute before:inset-0 before:content-[''] before:bg-[radial-gradient(900px_600px_at_50%_-10%,rgba(255,255,255,0.35),transparent_70%)]",
      ].join(" ")}
    >
      {/* 전역 키프레임: 감자 펄스/광택 스윕 & 상단 스윕 */}
      <style>{`
        @keyframes potatoPulse {
          0%, 100% { transform: translateZ(0) scale(1); }
          50% { transform: translateZ(0) scale(1.05); }
        }
        @keyframes shineSweep {
          0% { opacity: 0; transform: translateX(-120%); }
          20% { opacity: .5; }
          100% { opacity: 0; transform: translateX(120%); }
        }
        @keyframes pulseMini {
          0%,100% { transform: scale(1); opacity: .9 }
          50%     { transform: scale(1.06); opacity: 1 }
        }
        @keyframes topSweep {
          0%   { transform: translateY(-100%); opacity: 0 }
          40%  { opacity: .6 }
          100% { transform: translateY(0%); opacity: 0 }
        }
      `}</style>

      {/* 그레인 (밤에는 진하게, 낮에는 살짝) */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 mix-blend-multiply ${
          phase === "night" ? "opacity-[0.06]" : "opacity-[0.04]"
        }`}
        style={{
          backgroundImage: "url(/images/grain.png)",
          backgroundSize: 280,
        }}
      />

      {/* 마감 연출: 상단 라이트 스윕 */}
      {finishing && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-white/60 blur-lg animate-[topSweep_0.26s_ease-out]"
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
        className="relative z-10 grid w-full max-w-5xl gap-10 md:grid-cols-2 items-center pt-8 pb-12"
      >
        {/* ── (좌) 액자 + 시간대 멘트 ── */}
        <div className="flex flex-col items-center gap-3 md:items-start">
          <figure
            className={[
              "relative w-[82%] max-w-sm aspect-[4/5] rounded-[28px]",
              "bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(255,255,255,0.6))]",
              "shadow-[0_18px_50px_rgba(184,128,68,0.18)]",
              "ring-1 ring-white/70",
            ].join(" ")}
          >
            {/* 프레임 내부 여백 살짝 축소 (꽉찬 느낌) */}
            <div className="absolute inset-[10px] rounded-2xl bg-[#8b5e34] ring-1 ring-black/5 overflow-hidden">
              <div
                className="absolute inset-[7px] rounded-xl bg-center bg-cover"
                style={{ backgroundImage: `url(${bgSrc})` }}
              />
              {/* 광택/반사 레이어 살짝 약화 */}
              <div className="absolute inset-[7px] rounded-xl pointer-events-none">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/25 to-transparent mix-blend-screen" />
                <div className="absolute -top-6 -left-10 w-56 h-56 rotate-12 bg-white/20 blur-2xl" />
              </div>
            </div>
          </figure>

          {/* 시간대 멘트 */}
          <figcaption className="font-round text-sm md:text-base font-medium text-[var(--ink)]">
            {phaseLabel(phase)}
          </figcaption>
        </div>

        {/* ── (우) 타이틀 + 헤드라인 + 로딩바 ── */}
        <div className="flex flex-col items-center md:items-start text-[var(--ink)]">
          {/* 상단: HeartPulse + 감자링 */}
          <div className="flex items-center gap-2 text-[var(--ink)] drop-shadow-[0_0_8px_rgba(216,165,110,0.35)]">
            <FontAwesomeIcon
              icon={faHeartPulse}
              className="h-5 w-5"
              style={{ animation: "pulseMini 1.8s ease-in-out infinite" }}
              aria-hidden
            />
            <span className="font-semibold">감자링</span>
          </div>

          {/* 헤드라인: MorphingText (클램프 폰트 + 그라데이션 키워드) */}
          <div className="mt-6 min-h-[3.75rem] md:min-h-[5rem] lg:min-h-[6rem] flex items-center w-full">
            <MorphingText
              texts={["우리의 기록들이", "자라나는 공간 ", "감자링"]}
              className={`${HEADLINE_TXT} !leading-[0.9] text-[var(--ink-strong)] font-gowun`}
              // MorphingText가 옵션을 지원한다면 전달 (지원 안 해도 무해)
              reducedMotion={!!prefersReducedMotion}
              renderWord={(word: string) => {
                // 마지막 키워드만 그라데이션 텍스트
                if (word.trim() === "감자링") {
                  return (
                    <span className="bg-gradient-to-br from-[var(--accentA)] to-[var(--accentB)] bg-clip-text text-transparent drop-shadow-sm">
                      {word}
                    </span>
                  );
                }
                return word;
              }}
            />
          </div>

          {/* 로딩바 + 퍼센트(감자 아이콘 포함) */}
          <div className="mt-6 w-full max-w-xl">
            <div className="mb-1 flex items-center justify-between text-sm text-[color:var(--ink)]/90">
              <span className="font-medium">{loadingMessage}</span>

              {/* 감자 아이콘 + 탭룰러 숫자 */}
              <span className="tabular-nums flex items-center">
                <PotatoIcon progress={progress} />
                {progress}%
              </span>
            </div>

            {/* 접근성 배려: role=progressbar */}
            <div
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2 w-full overflow-hidden rounded-full"
              style={{ backgroundColor: "var(--track)" }}
            >
              {/* 채우기 레이어 + 하이라이트 링 */}
              <div
                className="h-full rounded-full relative transition-[width] duration-[120ms] ease-out"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[var(--accentA)] to-[var(--accentB)]" />
                <div className="absolute inset-0 rounded-full ring-1 ring-white/25" />
              </div>
            </div>

            {/* 선택: 바로 시작 (시각적 위계 낮게) */}
            <button
              className="mt-6 text-sm underline decoration-dotted opacity-70 hover:opacity-100 focus:outline-none"
              onClick={async () => {
                const { data } = await supabase.auth.getSession();
                navigate(data.session ? "/main" : "/login", { replace: true });
              }}
            >
              바로 시작하기
            </button>
          </div>
        </div>
      </motion.section>

      {/* 비네트: 중앙 집중감, 낮엔 약하게/밤엔 약간 진하게 */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 ${
          phase === "night"
            ? "bg-[radial-gradient(75%_55%_at_50%_42%,transparent,rgba(0,0,0,0.10))]"
            : "bg-[radial-gradient(75%_55%_at_50%_42%,transparent,rgba(0,0,0,0.08))]"
        }`}
      />

      {/* SR 텍스트: 진행률 포함 */}
      <p role="status" aria-live="polite" className="sr-only">
        로딩 중… {progress}%
      </p>
    </div>
  );
}
