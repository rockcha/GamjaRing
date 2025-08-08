// components/HeroSection.tsx
import { useEffect, useRef, useState } from "react";

export default function HeroSection2() {
  const lines = ["씨를 심고,", "매일 가꾸며,", "감자를 키워가세요"];
  // "씨를 심고,",
  //     "매일 가꾸며,",
  //     "감자를 키우세요",
  // 타이밍
  const DELAY_FIRST = 600;
  const STEP = 1200;
  const HOLD = 4000;
  const FADE_OUT = 1000; // <- 이 시간이 정확히 적용되도록 인라인 style 사용

  const [visibleCount, setVisibleCount] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [loopKey, setLoopKey] = useState(0);

  const timers = useRef<number[]>([]);

  useEffect(() => {
    const t1 = window.setTimeout(() => setVisibleCount(1), DELAY_FIRST);
    const t2 = window.setTimeout(() => setVisibleCount(2), DELAY_FIRST + STEP);
    const t3 = window.setTimeout(
      () => setVisibleCount(3),
      DELAY_FIRST + STEP * 2
    );
    const t4 = window.setTimeout(
      () => setFadeOut(true),
      DELAY_FIRST + STEP * 2 + HOLD
    );
    const t5 = window.setTimeout(() => {
      setVisibleCount(0);
      setFadeOut(false);
      setLoopKey((k) => k + 1);
    }, DELAY_FIRST + STEP * 2 + HOLD + FADE_OUT);

    timers.current = [t1, t2, t3, t4, t5];
    return () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };
  }, [loopKey]);

  return (
    <section className="w-full mt-3 flex items-center justify-center">
      <div
        key={loopKey}
        className={[
          "flex flex-col items-center text-center select-none",
          "space-y-2 md:space-y-3",
          "transition-opacity",
          fadeOut ? "opacity-0" : "opacity-100",
        ].join(" ")}
        // ⭐ Tailwind가 못 읽는 동적 duration은 style로!
        style={{
          transitionDuration: fadeOut ? `${FADE_OUT}ms` : "700ms",
        }}
      >
        {lines.map((line, idx) => (
          <p
            key={idx}
            className={[
              "text-[#5b3d1d] leading-tight",
              "transition-opacity duration-700 ease-out",
              idx === 2
                ? "text-2xl md:text-3xl font-bold"
                : "text-2xl md:text-3xl font-semibold",
              visibleCount > idx ? "opacity-100" : "opacity-0",
            ].join(" ")}
          >
            {line}
          </p>
        ))}
      </div>
    </section>
  );
}
