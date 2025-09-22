"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

type Phase = "show" | "hold" | "input";

export type CanvasSequenceViewHandle = {
  /** 화면 전체를 살짝 흔듭니다. (기본 120ms, 진폭 8px) */
  shake: (ms?: number, amp?: number) => void;
  /** 짧은 슬로모(히트스톱)와 함께 흔듭니다. (기본 90ms, slow=0.05) */
  hitStop: (ms?: number, slow?: number) => void;
  /** 소프트 파티클을 원하는 위치에 한번 뿌립니다. */
  emitBurst: (x?: number, y?: number, count?: number) => void;
};

type Props = {
  titles: string[]; // 보여줄 재료 시퀀스(제목)
  emojisByTitle: Record<string, string>; // title -> emoji 매핑
  phase: Phase;
  maxCols?: number;
  className?: string;
  style?: React.CSSProperties;
  /** 입력 단계에서 카드 클릭을 캔버스가 처리합니다. */
  onPick?: (title: string, index: number) => void;
};

type Cell = { x: number; y: number; w: number; h: number };

export default forwardRef<CanvasSequenceViewHandle, Props>(
  function CanvasSequenceView(
    { titles, emojisByTitle, phase, maxCols, className, style, onPick },
    ref
  ) {
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    /** 반응형 사이즈 */
    const [size, setSize] = useState({ w: 720, h: 220 });
    useEffect(() => {
      const el = wrapRef.current!;
      const ro = new ResizeObserver(() => {
        const w = el.clientWidth;
        const h = Math.max(160, Math.min(400, Math.round(w * 0.32)));
        setSize({ w, h });
      });
      if (el) ro.observe(el);
      return () => ro.disconnect();
    }, []);

    /** 레이아웃 캐시 */
    const layoutRef = useRef<{
      cells: Cell[];
      cols: number;
      rows: number;
    } | null>(null);
    const recomputeLayout = () => {
      const n = titles.length;
      const cols = maxCols ? Math.min(maxCols, Math.max(1, n)) : n; // 기본 1행
      const rows = Math.ceil(n / cols);
      const pad = 12;
      const cellW = Math.floor((size.w - pad * (cols + 1)) / cols);
      const cellH = Math.floor((size.h - pad * (rows + 1)) / rows);
      const cells: Cell[] = [];
      for (let i = 0; i < n; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = pad + col * (cellW + pad);
        const y = pad + row * (cellH + pad);
        cells.push({ x, y, w: cellW, h: cellH });
      }
      layoutRef.current = { cells, cols, rows };
    };
    useEffect(() => {
      recomputeLayout();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [titles, size.w, size.h, maxCols]);

    /** show 시작 기준 시각 */
    const phaseStartRef = useRef<number>(performance.now());
    useEffect(() => {
      if (phase === "show") {
        phaseStartRef.current = performance.now();
      }
    }, [phase, titles.length]);

    /** 캔버스 DPR 세팅 */
    const setupCanvas = () => {
      const cvs = canvasRef.current!;
      const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
      cvs.style.width = `${size.w}px`;
      cvs.style.height = `${size.h}px`;
      cvs.width = Math.floor(size.w * dpr);
      cvs.height = Math.floor(size.h * dpr);
      const ctx = cvs.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { ctx, dpr };
    };

    /** 입력(히트테스트) + 1차 이펙트 */
    const ripplesRef = useRef<
      Array<{ x: number; y: number; t: number; dur: number }>
    >([]);
    const onPointerDown = (e: PointerEvent) => {
      if (phase !== "input" || !layoutRef.current) return;
      const cvs = canvasRef.current!;
      const rect = cvs.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const idx = layoutRef.current.cells.findIndex(
        (c) => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h
      );
      if (idx >= 0) {
        const c = layoutRef.current.cells[idx];
        ripplesRef.current.push({
          x: c.x + c.w / 2,
          y: c.y + c.h / 2,
          t: 0,
          dur: 520,
        });
        onPick?.(titles[idx], idx);
        emitBurst(c.x + c.w / 2, c.y + c.h / 2, 10);
      }
    };
    useEffect(() => {
      const cvs = canvasRef.current!;
      cvs.addEventListener("pointerdown", onPointerDown);
      return () => cvs.removeEventListener("pointerdown", onPointerDown);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase, titles, onPick]);

    /** 흔들림 / 히트스톱 */
    const shakeRef = useRef<{ t: number; dur: number; amp: number }>({
      t: 0,
      dur: 0,
      amp: 0,
    });
    const timeScaleRef = useRef(1); // 1=정상, 0.05=슬로모
    const hitStop = (ms = 90, slow = 0.05) => {
      timeScaleRef.current = slow;
      window.setTimeout(() => (timeScaleRef.current = 1), ms);
      shake(ms + 80, 8);
    };
    const shake = (ms = 120, amp = 8) => {
      shakeRef.current = { t: 0, dur: ms, amp };
    };

    /** 소프트 파티클 */
    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      max: number;
      size: number;
      spin: number;
      hue: number;
    };
    const particlesRef = useRef<Particle[]>([]);
    const emitBurst = (x?: number, y?: number, count = 16) => {
      const cx = x ?? size.w / 2;
      const cy = y ?? size.h / 2;
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + Math.random() * 0.4;
        const spd = 60 + Math.random() * 160;
        particlesRef.current.push({
          x: cx,
          y: cy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 30,
          life: 700 + Math.random() * 400,
          max: 700 + Math.random() * 400,
          size: 2 + Math.random() * 3,
          spin: (Math.random() - 0.5) * 2,
          hue: 42 + Math.random() * 30, // 노랑~주황
        });
      }
    };

    /** 외부 제어 노출 */
    useImperativeHandle(
      ref,
      (): CanvasSequenceViewHandle => ({
        shake,
        hitStop,
        emitBurst,
      }),
      []
    );

    /** 이모지 비트맵 캐시 */
    const emojiCache = useRef<Map<string, ImageBitmap>>(new Map());
    const ensureEmojiBitmap = async (emoji: string) => {
      if (emojiCache.current.has(emoji)) return emojiCache.current.get(emoji)!;
      const off = document.createElement("canvas");
      off.width = off.height = 256;
      const c = off.getContext("2d")!;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.font =
        "200px Apple Color Emoji, Noto Color Emoji, Segoe UI Emoji, EmojiOne, sans-serif";
      c.fillText(emoji, off.width / 2, off.height / 2);
      const bmp = await createImageBitmap(off, {
        imageOrientation: "none",
        premultiplyAlpha: "premultiply",
      });
      emojiCache.current.set(emoji, bmp);
      return bmp;
    };
    useEffect(() => {
      const uniq = Array.from(
        new Set(titles.map((t) => emojisByTitle[t] ?? "❓"))
      );
      uniq.forEach((e) => ensureEmojiBitmap(e));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [titles]);

    /** show 타이밍 (stagger + fade) */
    const reveal = useMemo(() => {
      const stagger = 120; // ms
      const fade = 240; // ms
      const starts = titles.map((_, i) => i * stagger);
      return { starts, fade, total: (starts.at(-1) ?? 0) + fade };
    }, [titles]);

    /** 드로잉 루프 */
    useEffect(() => {
      if (!canvasRef.current) return;
      const { ctx } = setupCanvas();

      let raf = 0;
      let prev = performance.now();

      const drawRoundedRect = (
        x: number,
        y: number,
        w: number,
        h: number,
        r: number
      ) => {
        const rr = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + rr, y);
        ctx.arcTo(x + w, y, x + w, y + h, rr);
        ctx.arcTo(x + w, y + h, x, y + h, rr);
        ctx.arcTo(x, y + h, x, y, rr);
        ctx.arcTo(x, y, x + w, y, rr);
        ctx.closePath();
      };

      const easeOutCubic = (k: number) => 1 - Math.pow(1 - k, 3);
      const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

      const drawEmojiWithBloom = (
        emoji: string,
        cx: number,
        cy: number,
        fontSize: number
      ) => {
        // Bloom 레이어
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (let p = 0; p < 3; p++) {
          ctx.globalAlpha = 0.18;
          ctx.shadowColor = "rgba(255, 204, 64, 0.9)";
          ctx.shadowBlur = 8 + p * 6;
          const bmp = emojiCache.current.get(emoji);
          if (bmp) {
            const dw = fontSize,
              dh = fontSize;
            ctx.drawImage(bmp, cx - dw / 2, cy - dh / 2, dw, dh);
          } else {
            ctx.font = `${Math.floor(
              fontSize
            )}px Apple Color Emoji, Noto Color Emoji, Segoe UI Emoji, EmojiOne, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(emoji, cx, cy);
          }
        }
        ctx.restore();

        // 선명 레이어
        const bmp = emojiCache.current.get(emoji);
        if (bmp) {
          ctx.drawImage(
            bmp,
            cx - fontSize / 2,
            cy - fontSize / 2,
            fontSize,
            fontSize
          );
        } else {
          ctx.font = `${Math.floor(
            fontSize
          )}px Apple Color Emoji, Noto Color Emoji, Segoe UI Emoji, EmojiOne, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(emoji, cx, cy);
        }
      };

      const draw = () => {
        const now = performance.now();
        const dtMsRaw = now - prev;
        prev = now;

        const dt = (dtMsRaw / 1000) * timeScaleRef.current;

        // 흔들림 오프셋
        let offX = 0,
          offY = 0;
        if (shakeRef.current.dur > 0) {
          shakeRef.current.t += dtMsRaw;
          const k = clamp01(shakeRef.current.t / shakeRef.current.dur);
          const a = shakeRef.current.amp * (1 - k);
          offX = (Math.random() * 2 - 1) * a;
          offY = (Math.random() * 2 - 1) * a * 0.6;
          if (k >= 1) shakeRef.current = { t: 0, dur: 0, amp: 0 };
        }

        // 배경
        ctx.clearRect(0, 0, size.w, size.h);
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, size.w, size.h);

        ctx.save();
        ctx.translate(offX, offY);

        // 레이아웃
        if (!layoutRef.current) recomputeLayout();
        const { cells } = layoutRef.current ?? { cells: [] };
        const n = titles.length;
        const r = Math.min(12, Math.round((cells[0]?.w ?? 60) * 0.12 || 8));
        const elapsed = now - phaseStartRef.current; // ms

        // INPUT 단계 셔머
        const shimmer = (Math.sin(now / 280) + 1) * 0.5;

        for (let i = 0; i < n; i++) {
          const cell = cells[i];
          if (!cell) continue;
          const { x, y, w, h } = cell;

          if (phase === "input") {
            // 뒷면 + 셔머
            drawRoundedRect(x, y, w, h, r);
            ctx.fillStyle = "#ffffff";
            ctx.fill();
            ctx.save();
            ctx.globalCompositeOperation = "source-in";
            const gx = x + w * (0.2 + 0.6 * shimmer);
            const grad = ctx.createLinearGradient(gx - 40, y, gx + 40, y + h);
            grad.addColorStop(0, "rgba(255,255,255,0)");
            grad.addColorStop(0.5, "rgba(255,255,255,0.35)");
            grad.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, w, h);
            ctx.restore();

            // 외곽선
            ctx.lineWidth = 1;
            ctx.strokeStyle = "rgba(2,6,23,0.08)";
            ctx.stroke();
            continue;
          }

          // SHOW/HOLD 단계 — 개별 페이드 + 스크래치 리빌
          let alpha = 1;
          let maskK = 1;
          if (phase === "show") {
            const t0 = reveal.starts[i];
            const k = clamp01((elapsed - t0) / reveal.fade);
            alpha = 0.6 + 0.4 * easeOutCubic(k); // 카드 표면
            maskK = easeOutCubic(k); // 리빌 진행도
          } else {
            alpha = 1;
            maskK = 1;
          }

          // 카드 바탕(옅은 앰버)
          ctx.globalAlpha = alpha;
          ctx.fillStyle = "rgba(251,191,36,0.15)";
          drawRoundedRect(x, y, w, h, r);
          ctx.fill();
          ctx.globalAlpha = 1;

          const emoji = emojisByTitle[titles[i]] ?? "❓";
          const cx = x + w / 2;
          const cy = y + h * 0.52;
          const fontSize = Math.min(w, h) * 0.6;

          // --- 중요: 카드 단위 클리핑 ---
          // 1) 카드 영역으로 클립(라운드 사각형 외부 차단)
          ctx.save();
          drawRoundedRect(x, y, w, h, r);
          ctx.clip();

          // 2) show 단계에서는 좌->우 진행폭만 추가 클립
          if (phase === "show") {
            const mw = w * maskK; // 공개된 폭
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, y, mw, h);
            ctx.clip();
            drawEmojiWithBloom(emoji, cx, cy, fontSize);
            ctx.restore();
          } else {
            // hold 등 전체 표시
            drawEmojiWithBloom(emoji, cx, cy, fontSize);
          }

          ctx.restore(); // 카드 클립 해제
          // --- 끝: 카드 단위 클리핑 ---

          // 타이틀
          ctx.fillStyle = "rgba(15,23,42,0.65)";
          ctx.font = `${Math.floor(
            fontSize * 0.22
          )}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica`;
          ctx.textAlign = "center";
          ctx.textBaseline = "alphabetic";
          ctx.fillText(titles[i], cx, y + h - Math.max(10, fontSize * 0.18));
        }

        ctx.restore();

        // 리플
        ripplesRef.current = ripplesRef.current.filter((r) => {
          r.t += dtMsRaw;
          const k = clamp01(r.t / r.dur);
          const rad = 14 + k * 52;
          const g = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, rad);
          g.addColorStop(0, `rgba(251,191,36,${0.35 * (1 - k)})`);
          g.addColorStop(1, `rgba(251,191,36,0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
          ctx.fill();
          return k < 1;
        });

        // 파티클
        particlesRef.current = particlesRef.current.filter((p) => {
          p.life -= dtMsRaw;
          if (p.life <= 0) return false;
          const k = 1 - p.life / p.max;
          p.vy += 280 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;

          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          const a = Math.max(0, Math.min(1, 0.8 * (1 - k)));
          ctx.globalAlpha = a;
          ctx.fillStyle = `hsl(${p.hue} 90% 55%)`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 - k * 0.4), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          return true;
        });

        raf = requestAnimationFrame(draw);
      };

      raf = requestAnimationFrame(draw);
      return () => cancelAnimationFrame(raf);
    }, [titles, phase, size, maxCols, emojisByTitle]);

    return (
      <div ref={wrapRef} className={className} style={style}>
        <canvas ref={canvasRef} />
      </div>
    );
  }
);
