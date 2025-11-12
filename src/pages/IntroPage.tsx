// src/pages/IntroPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import supabase from "@/lib/supabase";
import { MorphingText } from "@/components/ui/morphing-text";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeartPulse } from "@fortawesome/free-solid-svg-icons";

// ===== Pretty one-liners (랜덤 한 줄) =====
const QUOTES = [
  "작은 기록이 큰 마음을 지켜줘요.",
  "오늘의 장면을 살짝 포개어 둘까요?",
  "빛은 늘 가까운 곳에서 시작돼요.",
  "소란한 하루에도, 나를 놓지 않기.",
  "천천히, 그러나 분명하게.",
  "한 줄의 문장이 마음을 데워요.",
  "지금 이 순간도 너를 완성해요.",
  "숨 고르고, 다시 가볍게.",
  "좋았던 것은 더 오래, 아팠던 것은 더 얕게.",
  "오늘을 좋아하는 방식으로 살아볼까요?",
  "잠깐 멈추면 들리는 마음의 목소리.",
  "하루의 끝에서 내가 나를 토닥여요.",
  "작은 기쁨을 크게 껴안기.",
  "빛나는 건 대단함보다 진심이래요.",
  "기억은 사라져도 마음은 자라나요.",
  "걱정보다 가능성에 표를 던져요.",
  "천천히 가도 괜찮아요. 함께니까.",
  "지금의 나도 충분히 예뻐요.",
  "어제를 용서하고 오늘을 사랑해요.",
  "눈을 감으면 떠오르는 고마운 얼굴들.",
  "별은 어둠 속에서 더 반짝이죠.",
  "내일의 햇살이 오늘을 안아줄 거예요.",
  "비 온 뒤엔 흙냄새처럼 평온이 와요.",
  "작은 변화가 큰 용기가 돼요.",
  "사소한 친절이 하루를 바꿔요.",
  "말 대신 마음으로 남기는 편지.",
  "나는 나의 안전한 집이 될래요.",
  "괜찮다는 말보다 함께라는 말.",
  "잊지 말자, 우리는 충분히 잘하고 있어요.",
  "오늘도, 나답게, 다정하게.",
] as const;

// ===== Types =====
type Phase = "dawn" | "morning" | "noon" | "evening" | "night";

/** 시간대 계산 (로컬) */
function getPhase(date = new Date()): Phase {
  const h = date.getHours();
  const m = date.getMinutes();
  const toMin = h * 60 + m;
  const M = (hh: number, mm: number) => hh * 60 + mm;
  if (toMin >= M(3, 30) && toMin <= M(5, 0)) return "dawn";
  if (toMin >= M(5, 1) && toMin <= M(11, 30)) return "morning";
  if (toMin >= M(11, 31) && toMin <= M(17, 30)) return "noon";
  if (toMin >= M(17, 31) && toMin <= M(20, 30)) return "evening";
  return "night";
}

/** Phase별 색/톤 + 카드 프레임 투명도/블러 강도 */
function getPhaseTheme(phase: Phase) {
  // 배경이 더 보이게: frame 투명도 하향, 대신 backdrop blur/채도 보강
  switch (phase) {
    case "dawn":
      return {
        vars: {
          "--ink": "#2f2e47",
          "--ink-strong": "#24233a",
          "--accentA": "#bfc2ff",
          "--accentB": "#9fd6ff",
          "--frame": "rgba(255,255,255,0.46)",
          "--grain": "0.04",
          "--scrim": "rgba(10,14,40,0.14)", // 비네트 농도
          "--blur": "10px", // 약하게 (오버레이 느낌)
          "--saturate": "1.35",
        } as CSSProperties,
        vignette:
          "bg-[radial-gradient(75%_55%_at_50%_42%,transparent,var(--scrim))]",
      };
    case "morning":
    case "noon":
      return {
        vars: {
          "--ink": "#5b452a",
          "--ink-strong": "#46351f",
          "--accentA": "#d7ab74",
          "--accentB": "#b98243",
          "--frame": "rgba(255,255,255,0.42)",
          "--grain": "0.03",
          "--scrim": "rgba(0,0,0,0.06)",
          "--blur": "10px",
          "--saturate": "1.4",
        } as CSSProperties,
        vignette:
          "bg-[radial-gradient(75%_55%_at_50%_42%,transparent,var(--scrim))]",
      };
    case "evening":
      return {
        vars: {
          "--ink": "#553f28",
          "--ink-strong": "#44321f",
          "--accentA": "#c99a6b",
          "--accentB": "#a87443",
          "--frame": "rgba(255,255,255,0.44)",
          "--grain": "0.035",
          "--scrim": "rgba(0,0,0,0.09)",
          "--blur": "10px",
          "--saturate": "1.35",
        } as CSSProperties,
        vignette:
          "bg-[radial-gradient(75%_55%_at_50%_42%,transparent,var(--scrim))]",
      };
    case "night":
    default:
      return {
        vars: {
          "--ink": "#e9e1d6",
          "--ink-strong": "#f2eee9",
          "--accentA": "#f4d2a0",
          "--accentB": "#be8a55",
          "--frame": "rgba(30,30,30,0.38)", // 밤엔 유리색 어둡게 → 배경 강조
          "--grain": "0.05",
          "--scrim": "rgba(0,0,0,0.14)",
          "--blur": "12px", // 밤만 약간 더
          "--saturate": "1.25",
        } as CSSProperties,
        vignette:
          "bg-[radial-gradient(75%_55%_at_50%_42%,transparent,var(--scrim))]",
      };
  }
}

function getPhaseCopy(phase: Phase) {
  switch (phase) {
    case "dawn":
      return "새벽 공기와 함께, 오늘의 한 줄을 남겨요.";
    case "morning":
      return "햇살처럼 가벼운 기록부터 시작해요.";
    case "noon":
      return "한낮의 순간들을 담아둘까요?";
    case "evening":
      return "저녁 바람처럼 차분히 정리해요.";
    case "night":
    default:
      return "오늘의 마음을 살짝 남겨둘까요?";
  }
}

export default function IntroPage() {
  const navigate = useNavigate();
  const phase = useMemo(() => getPhase(), []);
  const theme = useMemo(() => getPhaseTheme(phase), [phase]);
  const copy = useMemo(() => getPhaseCopy(phase), [phase]);
  const quote = useMemo(
    () => QUOTES[Math.floor(Math.random() * QUOTES.length)],
    []
  );

  // 배경 이미지 소스 (png 유지)
  const bgSrc = useMemo(() => {
    const base = "/intro";
    const name =
      phase === "dawn"
        ? "dawn"
        : phase === "morning"
        ? "morning"
        : phase === "noon"
        ? "noon"
        : phase === "evening"
        ? "evening"
        : "night";
    return `${base}/${name}.png`;
  }, [phase]);

  // 로딩 페이드
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const i = new Image();
    i.onload = () => setReady(true);
    i.src = bgSrc;
  }, [bgSrc]);

  // 아무 키/클릭 시 이동
  const locked = useRef(false);
  const continueRoute = async () => {
    if (locked.current) return;
    locked.current = true;
    const { data } = await supabase.auth.getSession();
    navigate(data.session ? "/main" : "/login", { replace: true });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        tag === "BUTTON" ||
        el?.getAttribute("contenteditable") === "true"
      ) {
        return;
      }
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
        "relative min-h-[100svh] w-full overflow-hidden",
        "bg-center bg-cover bg-fixed",
      ].join(" ")}
    >
      {/* 배경 이미지 */}
      <div
        aria-hidden
        className={[
          "absolute inset-0 -z-20 bg-center bg-cover bg-no-repeat",
          "transition-opacity duration-300 will-change-opacity",
          ready ? "opacity-100" : "opacity-0",
        ].join(" ")}
        style={{ backgroundImage: `url(${bgSrc})` }}
      />

      {/* 얕은 스크림 */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0.04), transparent 22%, transparent 78%, rgba(0,0,0,0.06))",
          mixBlendMode: "normal",
        }}
      />

      {/* 비네트 + 그레인 */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 ${theme.vignette}`}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-multiply"
        style={{
          opacity: `var(--grain, 0.03)`,
          backgroundImage: "url(/images/grain.png)",
          backgroundSize: 280,
        }}
      />

      {/* 파티클 */}
      {!prefersReducedMotion && (
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-20 animate-[float_18s_ease-in-out_infinite]"
            style={{
              backgroundImage: "url(/intro/particles-1.png)",
              backgroundSize: 440,
              mixBlendMode: "soft-light",
            }}
          />
          <div
            className="absolute inset-0 opacity-12 animate-[float2_28s_ease-in-out_infinite]"
            style={{
              backgroundImage: "url(/intro/particles-2.png)",
              backgroundSize: 620,
              mixBlendMode: "overlay",
            }}
          />
        </div>
      )}

      {/* 카드 */}
      <motion.section
        initial={
          prefersReducedMotion
            ? { opacity: 1 }
            : { opacity: 0, y: 8, scale: 0.985 }
        }
        animate={
          prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }
        }
        transition={{
          duration: prefersReducedMotion ? 0 : 0.6,
          ease: "easeOut",
        }}
        className="relative z-10 flex min-h-[100svh] items-center justify-center px-4"
      >
        <figure
          className={[
            "relative w-full max-w-2xl",
            "rounded-[28px] p-6 sm:p-8",
            "supports-[backdrop-filter]:bg-white/30 bg-white/60",
            "ring-1 ring-black/10 shadow-[0_22px_70px_rgba(0,0,0,0.18)]",
          ].join(" ")}
          style={{
            background: "var(--frame)",
            backdropFilter: `blur(var(--blur)) saturate(var(--saturate))`,
            WebkitBackdropFilter: `blur(var(--blur)) saturate(var(--saturate))`,
          }}
          role="group"
          aria-label="인트로 카드"
        >
          {/* 내부 보더 */}
          <div className="pointer-events-none absolute inset-0 rounded-[26px] ring-1 ring-white/35" />

          {/* 브랜드 */}
          <div className="flex items-center gap-2 text-[var(--ink)] drop-shadow-[0_0_8px_rgba(216,165,110,0.28)]">
            <FontAwesomeIcon
              icon={faHeartPulse}
              className="h-5 w-5"
              style={{
                animation: prefersReducedMotion
                  ? "none"
                  : "pulseMini 1.8s ease-in-out infinite",
                filter: "drop-shadow(0 0 6px rgba(184,140,91,0.3))",
              }}
              aria-hidden
            />
            <span className="font-semibold">감자링</span>
          </div>

          {/* 헤드라인 */}
          <div className="mt-4 sm:mt-6 min-h-[3.5rem] sm:min-h-[4.5rem] flex items-center w-full">
            <MorphingText
              texts={["우리의 기록들이", "자라나는 공간", "감자링"]}
              className="font-bold whitespace-nowrap break-keep tracking-[-0.02em] text-[clamp(26px,6vw,56px)] !leading-[1.02] text-[var(--ink-strong)] font-hand"
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

          {/* 랜덤 한 줄 (가로 중앙, 예쁜 폰트 톤) */}
          <p
            className={[
              "mt-4",
              "text-center", // ⬅ 가로 중앙
              "text-[color:var(--ink)]/80",
              "text-[clamp(14px,2.6vw,18px)]",
              "leading-relaxed",
              "font-serif", // ⬅ 부드러운 서체 톤 (프로젝트 폰트셋에 맞게 조정)
              "italic", // ⬅ 은은한 이탤릭
              "tracking-wide",
              "drop-shadow-[0_1px_6px_rgba(255,255,255,0.35)]",
            ].join(" ")}
            style={{
              // 한글 가독 보강(지원 브라우저에서만 적용)
              fontFeatureSettings: "'ss01' on, 'liga' on, 'kern' on",
              // 너무 얇지 않게
              fontWeight: 500,
            }}
          >
            {quote}
          </p>

          {/* Keyframes */}
          <style>{`
            @keyframes pulseMini { 0%,100% { transform: scale(1); opacity: .95 } 50% { transform: scale(1.06); opacity: 1 } }
            @keyframes breathe { 0%,100% { opacity: .7 } 50% { opacity: 1 } }
            .animate-breathe { animation: breathe 1.8s ease-in-out infinite; }
            @keyframes float { 0%,100%{ transform: translateY(-1.2%) } 50%{ transform: translateY(1.2%) } }
            @keyframes float2{ 0%,100%{ transform: translateY(0.8%) } 50%{ transform: translateY(-0.8%) } }
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
