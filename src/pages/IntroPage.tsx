// src/pages/IntroPage.tsx
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import supabase from "@/lib/supabase";

// ===== Types =====
type IntroMsgRow = { text: string; created_at?: string | null };

/** ✅ noon 색/톤으로 고정 */
const FIXED_THEME = {
  vars: {
    "--ink": "#2b1f16",
    "--ink-strong": "#1f160f",
    "--accentA": "#f2c58b",
    "--accentB": "#b98243",
    "--grain": "0.02",
    "--scrim": "rgba(0,0,0,0.05)",
    "--saturate": "1.06",
    "--bg-from": "#fef7eb",
    "--bg-to": "#f3f7ff",
    "--halo": "rgba(255,215,170,0.68)",
  } as CSSProperties,
};

export default function IntroPage() {
  const navigate = useNavigate();

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  const [leaving, setLeaving] = useState(false);
  const locked = useRef(false);

  // ✅ server section data
  const [introText, setIntroText] = useState<string>(""); // 최신 멘트
  const [introImgUrl, setIntroImgUrl] = useState<string>(""); // storage intro.png
  const [introLoading, setIntroLoading] = useState(true);

  const continueRoute = () => {
    if (locked.current) return;
    locked.current = true;

    setLeaving(true);
    window.setTimeout(() => {
      navigate("/main", { replace: true });
    }, 220);
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

      if (e.code !== "Space" && e.key !== " " && e.key !== "Spacebar") return;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Intro: 이미지(storage) + 최신 텍스트(table) 가져오기
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setIntroLoading(true);

        // 1) image: storage intro/intro.png (public bucket 가정)
        const { data: imgData } = supabase.storage
          .from("intro")
          .getPublicUrl("intro.png");

        const url = imgData?.publicUrl
          ? `${imgData.publicUrl}?v=${Date.now()}`
          : "";

        // 2) text: 최신 1개
        const { data: msg, error } = await supabase
          .from("intro_msg")
          .select("text, created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle<IntroMsgRow>();

        if (error) throw error;
        if (!alive) return;

        setIntroImgUrl(url);
        setIntroText(msg?.text ?? "");
      } catch {
        if (!alive) return;
        setIntroImgUrl("");
        setIntroText("");
      } finally {
        if (!alive) return;
        setIntroLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div
      style={{
        ...FIXED_THEME.vars,
        backgroundColor: "var(--bg-from, #0b1020)",
        backgroundImage: `
          radial-gradient(circle at 0% 0%, var(--halo, rgba(255,255,255,0.18)), transparent 55%),
          radial-gradient(circle at 100% 100%, rgba(146, 182, 255, 0.26), transparent 55%),
          linear-gradient(145deg, var(--bg-from, #1f2933), var(--bg-to, #0b1020))
        `,
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
      }}
      className="relative min-h-[100svh] w-full overflow-hidden px-5 sm:px-10"
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

      {/* 스크림(대비 안정) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "var(--scrim, rgba(0,0,0,0.12))" }}
      />

      {/* ✅ LEFT TOP: 감자링 로고 고정 */}
      <div className="absolute left-4 top-4 z-30 select-none">
        <div
          className="inline-flex items-center gap-2"
          style={{ textShadow: "0 12px 40px rgba(0,0,0,0.18)" }}
        >
          <span className="text-[22px] sm:text-[26px]">🥔</span>
          <span
            className={[
              "text-[18px] sm:text-[22px] font-semibold",
              "tracking-[0.14em]",
              "text-amber-600",
            ].join(" ")}
          >
            감자링
          </span>
        </div>
      </div>

      {/* ✅ RIGHT TOP: 이미지 + 텍스트 깔끔 카드 (absolute) */}
      <aside
        aria-label="인트로 이미지와 멘트"
        className={[
          "absolute right-4 top-4 z-20",
          "w-[min(420px,calc(100vw-2rem))]",
          "hidden sm:block",
        ].join(" ")}
      >
        <section className="w-full">
          <div className="relative overflow-hidden rounded-[28px] border border-white/20 bg-white/10 backdrop-blur-sm">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-16 opacity-55 blur-3xl"
              style={{
                background:
                  "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.18), transparent 60%)",
              }}
            />

            <div className="relative">
              <div className="aspect-[16/9] w-full overflow-hidden">
                {introImgUrl ? (
                  <img
                    src={introImgUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="eager"
                  />
                ) : (
                  <div className="h-full w-full bg-white/10" />
                )}
              </div>

              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.22))",
                }}
              />
            </div>

            <div className="relative px-5 py-4">
              {introLoading ? (
                <div className="space-y-2">
                  <div className="h-4 w-24 rounded-full bg-white/15" />
                  <div className="h-4 w-full rounded-full bg-white/15" />
                  <div className="h-4 w-2/3 rounded-full bg-white/15" />
                </div>
              ) : introText ? (
                <p className="text-[14px] leading-relaxed text-[color:var(--ink-strong)]/90 font-sans break-keep">
                  {introText}
                </p>
              ) : (
                <p className="text-[13px] text-[color:var(--ink)]/65 font-sans">
                  (멘트를 추가하면 여기에 표시돼요)
                </p>
              )}
            </div>

            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, rgba(255,255,255,0.14), transparent 45%, rgba(255,255,255,0.05))",
              }}
            />
          </div>
        </section>
      </aside>

      <motion.section
        initial={
          prefersReducedMotion
            ? { opacity: 1 }
            : { opacity: 0, y: 10, scale: 0.99 }
        }
        animate={
          prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }
        }
        transition={{
          duration: prefersReducedMotion ? 0 : 0.65,
          ease: "easeOut",
        }}
        className="relative z-10 flex min-h-[100svh] items-center justify-center"
        onClick={continueRoute}
      >
        <motion.div
          animate={
            prefersReducedMotion
              ? { opacity: 1 }
              : leaving
              ? { opacity: 0, scale: 0.985, y: 6, filter: "blur(2px)" }
              : { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }
          }
          transition={{
            duration: prefersReducedMotion ? 0 : leaving ? 0.22 : 0.35,
            ease: "easeOut",
          }}
          className="w-full max-w-3xl"
        >
          <div className="flex flex-col items-center text-center">
            <div className="mt-2 relative">
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-12 opacity-50 blur-3xl"
                style={{
                  background:
                    "radial-gradient(circle at 50% 40%, rgba(255,255,255,0.22), transparent 62%)",
                }}
              />

              <h1
                className={[
                  "relative break-keep",
                  "tracking-[-0.02em]",
                  "text-[clamp(34px,6.2vw,60px)]",
                  "leading-[1.05]",
                  "text-[var(--ink-strong)]",
                ].join(" ")}
              >
                <span className="block opacity-90 font-medium text-[clamp(18px,3.2vw,22px)] text-[color:var(--ink)]/80 tracking-[-0.01em]">
                  우리의 순간이,
                </span>
                <span className="block mt-2">
                  감자처럼{" "}
                  <span className="bg-gradient-to-br from-[var(--accentA)] to-[var(--accentB)] bg-clip-text text-transparent drop-shadow-sm">
                    따뜻
                  </span>
                  하기를
                </span>
              </h1>

              <div
                aria-hidden
                className="pointer-events-none mt-5 mx-auto h-[7px] w-28 rounded-full blur-sm opacity-35"
                style={{
                  background:
                    "linear-gradient(90deg, var(--accentA), transparent)",
                }}
              />
            </div>

            <p
              className="mt-7 text-[13px] sm:text-sm text-[color:var(--ink)]/80 leading-relaxed font-sans"
              style={{ textShadow: "0 10px 34px rgba(0,0,0,0.16)" }}
            >
              클릭하거나 <span className="font-medium">SPACE</span>를 누르면
              시작해요.
            </p>
          </div>
        </motion.div>
      </motion.section>

      <p role="status" aria-live="polite" className="sr-only">
        SPACE 키를 누르거나 화면을 클릭하면 다음 화면으로 이동합니다.
      </p>
    </div>
  );
}
