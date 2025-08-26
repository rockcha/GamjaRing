"use client";

import { cn } from "@/lib/utils";
import { motion, useInView } from "motion/react";
import type { MotionProps } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

interface TypingAnimationProps extends MotionProps {
  children: string; // 타이핑할 문자열
  className?: string;
  duration?: number; // 글자당 간격(ms) 기본 140
  delay?: number; // 시작 지연(ms)
  as?: React.ElementType; // 렌더 태그
  startOnView?: boolean; // 뷰포트 진입 시 시작
  loop?: boolean; // 완료 후 재시작
  pauseAfterDoneMs?: number; // 완료 후 대기(ms)
  showCursor?: boolean; // 커서 표시
  cursorChar?: string; // 커서 문자
}

export function TypingAnimation({
  children,
  className,
  duration = 140,
  delay = 0,
  as: Component = "div",
  startOnView = false,
  loop = true,
  pauseAfterDoneMs = 5000,
  showCursor = true,
  cursorChar = "|",
  ...props
}: TypingAnimationProps) {
  const MotionComponent = motion.create(Component, {
    forwardMotionProps: true,
  });

  const [displayedText, setDisplayedText] = useState<string>("");
  const [started, setStarted] = useState(false);
  const [cycle, setCycle] = useState(0);

  const elRef = useRef<HTMLElement | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const pauseTimerRef = useRef<number | null>(null);

  const isInView = useInView(elRef as React.RefObject<Element>, {
    amount: 0.3,
    once: true,
  });

  // ✅ 문자열 정규화 (undefined 방지)
  const text = useMemo(
    () => (typeof children === "string" ? children : String(children ?? "")),
    [children]
  );

  // ✅ 그래핌 분해(이모지 안전) + 빈 세그먼트 제거
  const segments = useMemo(() => {
    try {
      if (typeof Intl !== "undefined" && (Intl as any).Segmenter) {
        const seg = new (Intl as any).Segmenter(undefined, {
          granularity: "grapheme",
        });
        return Array.from(
          seg.segment(text),
          (s: any) => s.segment as string
        ).filter(Boolean);
      }
    } catch {}
    return Array.from(text);
  }, [text]);

  // 시작 타이밍
  useEffect(() => {
    const start = () => setStarted(true);
    if (!startOnView) {
      const t = window.setTimeout(start, delay);
      return () => window.clearTimeout(t);
    }
    if (!isInView) return;
    const t = window.setTimeout(start, delay);
    return () => window.clearTimeout(t);
  }, [delay, startOnView, isInView, cycle]);

  // 타이핑 루프 (첫 글자 즉시 출력)
  useEffect(() => {
    if (!started) return;

    const clearTimers = () => {
      if (typingTimerRef.current) {
        window.clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      if (pauseTimerRef.current) {
        window.clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }
    };

    clearTimers();
    setDisplayedText("");

    let i = 0;

    // 첫 글자 즉시
    if (segments.length > 0) {
      setDisplayedText(segments[0]);
      i = 1;
    }

    typingTimerRef.current = window.setInterval(() => {
      if (i < segments.length) {
        setDisplayedText((prev) => prev + segments[i]);
        i++;
      } else {
        clearTimers();
        if (loop) {
          pauseTimerRef.current = window.setTimeout(() => {
            setStarted(false);
            setCycle((c) => c + 1);
          }, pauseAfterDoneMs);
        }
      }
    }, duration) as unknown as number;

    return clearTimers;
  }, [started, segments, duration, pauseAfterDoneMs, loop]);

  return (
    <MotionComponent
      ref={elRef}
      className={cn("leading-relaxed tracking-[-0.01em]", className)}
      {...props}
    >
      {displayedText}
      {showCursor && (
        <motion.span
          aria-hidden
          className="ml-1 inline-block align-baseline"
          initial={{ opacity: 1 }}
          animate={{ opacity: [1, 0.1] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        >
          {cursorChar}
        </motion.span>
      )}
    </MotionComponent>
  );
}
