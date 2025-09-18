// src/components/PoemOfTheDayButton.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { KOREAN_PUBLIC_POEMS, type LocalKoPoem } from "./poem.ko";

type ApiPoem = {
  title: string;
  author: string;
  lines: string[];
  url?: string; // poetrydb는 별도 URL 없음
};

type Mode = "api" | "kr";

const KST_TZ = "Asia/Seoul";
const MAX_LINES = 12;

function clipLines(lines: string[], max = MAX_LINES) {
  if (!Array.isArray(lines)) return [];
  if (lines.length <= max) return lines;
  return [...lines.slice(0, max), "…"];
}

async function fetchPoetryDB(timeoutMs = 7000): Promise<ApiPoem> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    // 무작위 1편
    const r = await fetch("https://poetrydb.org/random", {
      cache: "no-store",
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const item = Array.isArray(j) ? j[0] : j;

    const title: string = item?.title ?? "Untitled";
    const author: string = item?.author ?? "Unknown";
    const lines: string[] = Array.isArray(item?.lines) ? item.lines : [];

    return { title, author, lines: clipLines(lines) };
  } finally {
    clearTimeout(t);
  }
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function PoemOfTheDayButton({
  className,
  buttonEmoji = "📜",
  ariaLabel = "오늘의 시",
}: {
  className?: string;
  buttonEmoji?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("api");
  const [poemApi, setPoemApi] = useState<ApiPoem | null>(null);
  const [poemKr, setPoemKr] = useState<LocalKoPoem | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // 최근 중복 방지(각 모드 별 content 기준)
  const recentApi = useRef<string[]>([]);
  const recentKr = useRef<string[]>([]);

  async function loadApi() {
    setLoading(true);
    setErr("");
    try {
      // 중복 피하려고 3회까지 재시도
      for (let i = 0; i < 3; i++) {
        const p = await fetchPoetryDB();
        const key = p.lines.join("\n");
        if (!recentApi.current.includes(key)) {
          setPoemApi(p);
          recentApi.current.unshift(key);
          if (recentApi.current.length > 10) recentApi.current.pop();
          return;
        }
      }
      // 그래도 중복이면 마지막 결과라도 표시
      const p = await fetchPoetryDB();
      setPoemApi(p);
    } catch {
      setErr("시를 불러오지 못했어요. 한국 시로 전환할게요.");
      setMode("kr");
      loadKr(); // 페일오버
    } finally {
      setLoading(false);
    }
  }

  function loadKr() {
    setErr("");
    const pool = KOREAN_PUBLIC_POEMS;
    // 중복 피하려 5회 시도
    for (let i = 0; i < 5; i++) {
      const p = pick(pool);
      const key = `${p.title}|${p.author}|${p.lines.join("\n")}`;
      if (!recentKr.current.includes(key)) {
        setPoemKr(p);
        recentKr.current.unshift(key);
        if (recentKr.current.length > 10) recentKr.current.pop();
        return;
      }
    }
    setPoemKr(pick(pool));
  }

  // 모달 열 때 기본 로드
  useEffect(() => {
    if (!open) return;
    if (mode === "api") void loadApi();
    else loadKr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  const todayKST = new Date(
    new Date().toLocaleString("en-US", { timeZone: KST_TZ })
  ).toLocaleDateString("ko-KR", { timeZone: KST_TZ });

  async function handleCopy() {
    const txt =
      mode === "api" && poemApi
        ? `『${poemApi.title}』 — ${poemApi.author}\n\n${poemApi.lines.join(
            "\n"
          )}`
        : mode === "kr" && poemKr
        ? `『${poemKr.title}』 — ${poemKr.author}\n\n${poemKr.lines.join("\n")}`
        : "";
    if (!txt) return;
    try {
      await navigator.clipboard.writeText(txt);
    } catch {}
  }

  // 원형 버튼(텍스트 없음) + 리플
  const [ripple, setRipple] = useState(false);
  const rippleTimer = useRef<number | null>(null);
  const startRipple = () => {
    setRipple(false);
    requestAnimationFrame(() => {
      setRipple(true);
      if (rippleTimer.current) window.clearTimeout(rippleTimer.current);
      rippleTimer.current = window.setTimeout(() => setRipple(false), 1200);
    });
  };
  useEffect(
    () => () => {
      if (rippleTimer.current) window.clearTimeout(rippleTimer.current);
    },
    []
  );

  const CircleButton = (
    <div className={cn("inline-flex flex-col items-center gap-2", className)}>
      <motion.button
        type="button"
        onClick={() => {
          startRipple();
          setOpen(true);
        }}
        aria-label={ariaLabel}
        className={cn(
          "relative grid place-items-center",
          "h-14 w-14 rounded-full border",
          "bg-white/70 dark:bg-zinc-900/40 backdrop-blur",
          "hover:scale-105 transition-all duration-300"
        )}
      >
        {ripple && (
          <span
            className="pointer-events-none absolute inset-0 rounded-full ring-4 ring-rose-300/50 animate-[pokePing_1.2s_ease-out_forwards]"
            aria-hidden
          />
        )}
        <span className="text-xl leading-none select-none" aria-hidden>
          {buttonEmoji}
        </span>
        <span className="sr-only">{ariaLabel}</span>

        <style>{`
          @keyframes pokePing {
            0%   { transform: scale(1); opacity:.75 }
            70%  { transform: scale(1.9); opacity:0 }
            100% { transform: scale(1.9); opacity:0 }
          }
        `}</style>
      </motion.button>
    </div>
  );

  const title =
    mode === "api"
      ? poemApi?.title ?? (loading ? "불러오는 중…" : "—")
      : poemKr?.title ?? (loading ? "불러오는 중…" : "—");
  const author = mode === "api" ? poemApi?.author ?? "" : poemKr?.author ?? "";
  const lines = mode === "api" ? poemApi?.lines ?? [] : poemKr?.lines ?? [];

  return (
    <>
      {CircleButton}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>오늘의 시</span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={mode === "kr" ? "default" : "outline"}
                  onClick={() => setMode("kr")}
                >
                  한국 시
                </Button>
                <Button
                  size="sm"
                  variant={mode === "api" ? "default" : "outline"}
                  onClick={() => setMode("api")}
                >
                  영어 랜덤
                </Button>
              </div>
            </DialogTitle>
            <DialogDescription>
              {todayKST} · {mode === "api" ? "PoetryDB" : "Public Domain(한국)"}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border p-4 bg-white/60 dark:bg-zinc-900/40 min-h-[140px]">
            {err ? (
              <div className="text-sm text-rose-600">{err}</div>
            ) : loading ? (
              <div className="text-sm text-neutral-600">불러오는 중…</div>
            ) : (
              <>
                <div className="text-base font-semibold">{title}</div>
                <div className="text-sm text-neutral-600 mt-0.5">
                  — {author}
                </div>
                <div className="mt-3 whitespace-pre-wrap leading-relaxed text-[15px]">
                  {lines.join("\n")}
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="secondary"
              onClick={() => (mode === "api" ? void loadApi() : loadKr())}
              disabled={loading}
            >
              다시 뽑기
            </Button>
            <Button
              onClick={handleCopy}
              disabled={loading || (!poemApi && !poemKr)}
            >
              복사
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
