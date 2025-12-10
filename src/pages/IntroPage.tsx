// src/pages/IntroPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import supabase from "@/lib/supabase";
import { MorphingText } from "@/components/ui/morphing-text";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeartPulse } from "@fortawesome/free-solid-svg-icons";

import { Card, CardContent } from "@/components/ui/card";

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

/** Phase별 색/톤 + 카드 프레임 투명도/블러 강도 + 배경 그라디언트 */
function getPhaseTheme(phase: Phase) {
  switch (phase) {
    case "dawn":
      return {
        vars: {
          "--ink": "#2f2e47",
          "--ink-strong": "#24233a",
          "--accentA": "#bfc2ff",
          "--accentB": "#9fd6ff",
          "--frame": "#ffffff",
          "--grain": "0.03",
          "--scrim": "rgba(10,14,40,0.04)",
          "--blur": "10px",
          "--saturate": "1.15",
          "--bg-from": "#101226",
          "--bg-to": "#445a82",
          "--halo": "rgba(255,214,165,0.55)",
        } as CSSProperties,
      };
    case "morning":
      return {
        vars: {
          "--ink": "#5b452a",
          "--ink-strong": "#46351f",
          "--accentA": "#f1c58d",
          "--accentB": "#d7ab74",
          "--frame": "#ffffff",
          "--grain": "0.02",
          "--scrim": "rgba(255,255,255,0.12)",
          "--blur": "10px",
          "--saturate": "1.12",
          "--bg-from": "#fff7ea",
          "--bg-to": "#e0f0ff",
          "--halo": "rgba(255,230,190,0.8)",
        } as CSSProperties,
      };
    case "noon":
      return {
        vars: {
          "--ink": "#5b452a",
          "--ink-strong": "#46351f",
          "--accentA": "#f2c58b",
          "--accentB": "#b98243",
          "--frame": "#ffffff",
          "--grain": "0.02",
          "--scrim": "rgba(0,0,0,0.02)",
          "--blur": "10px",
          "--saturate": "1.1",
          "--bg-from": "#fef7eb",
          "--bg-to": "#f3f7ff",
          "--halo": "rgba(255,215,170,0.7)",
        } as CSSProperties,
      };
    case "evening":
      return {
        vars: {
          "--ink": "#553f28",
          "--ink-strong": "#44321f",
          "--accentA": "#e0b18c",
          "--accentB": "#c99a6b",
          "--frame": "#ffffff",
          "--grain": "0.025",
          "--scrim": "rgba(0,0,0,0.03)",
          "--blur": "12px",
          "--saturate": "1.14",
          "--bg-from": "#241621",
          "--bg-to": "#664058",
          "--halo": "rgba(255,189,150,0.6)",
        } as CSSProperties,
      };
    case "night":
    default:
      return {
        vars: {
          "--ink": "#2b2430",
          "--ink-strong": "#18111b",
          "--accentA": "#f4c58c",
          "--accentB": "#c98557",
          "--frame": "#ffffff",
          "--grain": "0.03",
          "--scrim": "rgba(0,0,0,0.05)",
          "--blur": "12px",
          "--saturate": "1.12",
          "--bg-from": "#0b1020",
          "--bg-to": "#332648",
          "--halo": "rgba(255,214,165,0.55)",
        } as CSSProperties,
      };
  }
}

// 시간대 ➜ 라벨 + 이모지
const PHASE_LABEL: Record<Phase, string> = {
  dawn: "새벽",
  morning: "아침",
  noon: "한낮",
  evening: "저녁",
  night: "밤",
};

const PHASE_EMOJI: Record<Phase, string> = {
  dawn: "🌅",
  morning: "☀️",
  noon: "🌤️",
  evening: "🌇",
  night: "🌙",
};

export default function IntroPage() {
  const navigate = useNavigate();
  const phase = useMemo(() => getPhase(), []);
  const theme = useMemo(() => getPhaseTheme(phase), [phase]);
  const phaseLabel = PHASE_LABEL[phase];
  const phaseEmoji = PHASE_EMOJI[phase];

  // 배경 이미지 소스 (액자 안에 넣을 용도)
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

  // 이미지 로딩 페이드
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const i = new Image();
    i.onload = () => setReady(true);
    i.src = bgSrc;
  }, [bgSrc]);

  // Space / 클릭 시 이동
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

      // Space 키에서만 동작
      if (
        e.code !== "Space" &&
        e.key !== " " &&
        e.key !== "Spacebar" // 구 브라우저 호환
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

  const phaseSubcopy =
    phase === "night"
      ? "오늘 하루, 여기서 천천히 마무리해요."
      : phase === "morning"
      ? "조용한 아침, 오늘의 페이지를 열어볼까요?"
      : phase === "dawn"
      ? "아직 캄캄한 새벽, 작은 마음들을 살짝 모아둬요."
      : phase === "evening"
      ? "노을이 남긴 온도를, 오늘의 기록에 붙여둘까요?"
      : "빛이 가장 강한 시간, 대신 마음은 천천히 기록해요.";

  return (
    <div
      style={{
        ...theme.vars,
        backgroundColor: "var(--bg-from, #0b1020)",
        backgroundImage: `
          radial-gradient(circle at 0% 0%, var(--halo, rgba(255,255,255,0.18)), transparent 55%),
          radial-gradient(circle at 100% 100%, rgba(146, 182, 255, 0.3), transparent 55%),
          linear-gradient(145deg, var(--bg-from, #1f2933), var(--bg-to, #0b1020))
        `,
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
      }}
      className="relative min-h-[100svh] w-full overflow-hidden px-4 sm:px-6"
    >
      {/* 그레인 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-soft-light"
        style={{
          opacity: `var(--grain, 0.02)`,
          backgroundImage: "url(/images/grain.png)",
          backgroundSize: 260,
        }}
      />

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
        className="relative z-10 flex min-h-[100svh] items-center justify-center"
      >
        <Card
          role="group"
          aria-label="감자링 인트로 카드"
          className={[
            "relative w-full max-w-5xl",
            "h-[90svh]",
            "p-2",
            "rounded-[32px] border border-black/5",
            "bg-[rgba(255,252,247,0.92)]",
            "shadow-[0_24px_70px_rgba(15,23,42,0.18)]",
            "backdrop-blur-[var(--blur)]",
            "overflow-hidden",
          ].join(" ")}
          style={{
            backdropFilter: `blur(var(--blur)) saturate(var(--saturate))`,
            WebkitBackdropFilter: `blur(var(--blur)) saturate(var(--saturate))`,
          }}
        >
          {/* 종이 테두리 */}
          <div className="pointer-events-none absolute inset-[3px] rounded-[28px] border border-white/60" />

          {/* 귀퉁이 테이프 느낌 */}
          <div className="pointer-events-none absolute -left-2 top-6 h-8 w-10 rotate-[-8deg] bg-gradient-to-br from-white/80 to-white/30 shadow-md" />
          <div className="pointer-events-none absolute -right-3 top-10 h-7 w-9 rotate-[6deg] bg-gradient-to-br from-white/75 to-white/20 shadow-md" />

          {/* 우 상단 마이크로 카피 */}
          <div className="pointer-events-none absolute right-10 top-8 text-right">
            <p className="text-[10px] sm:text-[11px] text-[color:var(--ink)]/70">
              지금 이 순간이, 감자처럼 따뜻하기를
            </p>
          </div>

          <CardContent className="relative px-6 py-6 sm:px-9 sm:py-8">
            <div className="relative grid gap-8 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1.3fr)] md:gap-10">
              {/* ===== 왼쪽: 액자 속 일러스트 ===== */}
              <figure className="relative mx-auto flex w-full max-w-[420px] flex-col items-center">
                <div className="relative w-full">
                  <div className="absolute inset-0 translate-y-[7px] rounded-[30px] bg-black/10 blur-xl" />
                  <div className="relative aspect-[3/4] w-full rounded-[28px] border border-black/10 bg-white/85 shadow-[0_16px_40px_rgba(15,23,42,0.16)] overflow-hidden">
                    <div className="absolute inset-[10px] rounded-[22px] overflow-hidden">
                      <img
                        src={bgSrc}
                        alt=""
                        className={[
                          "h-full w-full object-cover",
                          "transition-opacity duration-500",
                          ready ? "opacity-100" : "opacity-0",
                        ].join(" ")}
                      />
                      {!prefersReducedMotion && (
                        <>
                          <div
                            className="pointer-events-none absolute inset-0 opacity-25 mix-blend-soft-light animate-[float_18s_ease-in-out_infinite]"
                            style={{
                              backgroundImage: "url(/intro/particles-1.png)",
                              backgroundSize: 420,
                            }}
                          />
                          <div
                            className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-overlay animate-[float2_26s_ease-in-out_infinite]"
                            style={{
                              backgroundImage: "url(/intro/particles-2.png)",
                              backgroundSize: 580,
                            }}
                          />
                          {/* 빛 반사 레이어 */}
                          <div
                            className="pointer-events-none absolute -inset-10 opacity-[0.18] mix-blend-screen animate-[float_14s_ease-in-out_infinite]"
                            style={{
                              backgroundImage: `
                                radial-gradient(circle at 0% 0%, rgba(255,255,255,0.5), transparent 55%),
                                radial-gradient(circle at 100% 100%, rgba(255,255,255,0.35), transparent 55%)
                              `,
                            }}
                          />
                        </>
                      )}
                    </div>
                    <div className="pointer-events-none absolute inset-[10px] rounded-[22px] ring-1 ring-white/70" />
                  </div>
                </div>

                {/* ✅ 이미지 아래 한 줄 mood 텍스트 */}
                <figcaption className="mt-3 text-center text-[10px] sm:text-[11px] text-[color:var(--ink)]/70">
                  <span className="mr-1">{phaseEmoji}</span>
                  <span>{phaseSubcopy}</span>
                </figcaption>
              </figure>

              {/* ===== 오른쪽: 텍스트 영역 ===== */}
              <div className="flex flex-col justify-center mb-20">
                {/* 브랜드 / 로고 + 메인 카피 */}
                <div className="flex flex-col gap-3">
                  <div className="inline-flex items-center gap-2 text-[color:var(--ink)] drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]">
                    <FontAwesomeIcon
                      icon={faHeartPulse}
                      className="h-5 w-5"
                      style={{
                        animation: prefersReducedMotion
                          ? "none"
                          : "pulseMini 1.8s ease-in-out infinite",
                        filter: "drop-shadow(0 0 4px rgba(255,184,120,0.4))",
                      }}
                      aria-hidden
                    />
                    <span className="text-xl font-semibold tracking-[0.18em] uppercase text-[color:var(--ink)]/80">
                      GAMJARING
                    </span>
                  </div>
                  <p className="text-[13px] sm:text-sm text-[color:var(--ink)]/85 leading-relaxed">
                    우리의 기록이{" "}
                    <span className="font-semibold text-[color:var(--ink-strong)]">
                      감자처럼 자라나는 공간
                    </span>
                    이에요.
                  </p>
                </div>

                {/* 헤드라인 (Morphing Text) */}
                <div className="mt-5 min-h-[3.2rem] sm:min-h-[4.2rem] flex items-center w-full">
                  <MorphingText
                    texts={["우리의 기록들이", "조용히 자라나는 곳", "감자링"]}
                    className="font-bold break-keep tracking-[-0.02em] text-[clamp(26px,6vw,46px)] !leading-[1.02] text-[var(--ink-strong)] font-hand text-left"
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
              </div>
            </div>

            {/* 하단 화면전환 힌트: 우하단 배치 */}
            <div className=" flex flex-col items-end gap-2 text-[11px] sm:text-xs text-[color:var(--ink)]/65">
              <div className="flex items-center gap-2 justify-end">
                <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-[3px]">
                  <span className="rounded-md border border-black/10 bg-white px-[6px] py-[2px] text-[10px] font-medium shadow-sm">
                    SPACE
                  </span>
                  <span className="text-[10px]">또는 클릭</span>
                </span>
                <span>을 누르면 다음 장으로 넘겨요.</span>
              </div>
            </div>
          </CardContent>

          {/* Keyframes */}
          <style>{`
            @keyframes pulseMini {
              0%, 100% { transform: scale(1); opacity: .95 }
              50% { transform: scale(1.06); opacity: 1 }
            }
            @keyframes breathe {
              0%, 100% { opacity: .7 }
              50% { opacity: 1 }
            }
            .animate-breathe { animation: breathe 1.8s ease-in-out infinite; }
            @keyframes float {
              0%,100%{ transform: translateY(-1.2%) }
              50%{ transform: translateY(1.2%) }
            }
            @keyframes float2{
              0%,100%{ transform: translateY(0.8%) }
              50%{ transform: translateY(-0.8%) }
            }
          `}</style>
        </Card>
      </motion.section>

      {/* 스크린리더 안내 */}
      <p role="status" aria-live="polite" className="sr-only">
        SPACE 키를 누르거나 화면을 클릭하면 다음 화면으로 이동합니다.
      </p>
    </div>
  );
}
