"use client";

import { motion, useAnimation } from "motion/react";
import React, { useEffect, useRef, useState } from "react";

export interface ScratchToRevealProps {
  children: React.ReactNode; // 스크래치로 드러날 콘텐츠(타로 이미지 등)
  width: number;
  height: number;
  minScratchPercentage?: number; // 완료 판정(%) 기본 50
  className?: string;
  onComplete?: () => void; // 전부 문질렀을 때 호출
  gradientColors?: [string, string, string]; // 스크래치 레이어 색
  eraserRadius?: number; // 지우개 반지름(px)
  overlay?: React.ReactNode; // 스크래치 위 안내 문구
}

export const ScratchToReveal: React.FC<ScratchToRevealProps> = ({
  width,
  height,
  minScratchPercentage = 50,
  className,
  onComplete,
  // ✨ 튀지 않는 중성 톤(미확인 상태)
  gradientColors = ["#f5f5f4", "#e5e7eb", "#f5f5f4"],
  eraserRadius = 30,
  overlay,
  children,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScratching, setIsScratching] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const controls = useAnimation();

  // 초기 페인트(레티나 대응 + 그라데이션)
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, gradientColors[0]);
    gradient.addColorStop(0.5, gradientColors[1]);
    gradient.addColorStop(1, gradientColors[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }, [width, height, gradientColors]);

  // 문서 레벨 포인터 이벤트
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!isScratching || isComplete) return;
      scratch(e.clientX, e.clientY);
    };
    const up = () => {
      if (!isScratching) return;
      setIsScratching(false);
      checkCompletion();
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", up);
    return () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", up);
    };
  }, [isScratching, isComplete]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isComplete) return;
    setIsScratching(true);
    scratch(e.clientX, e.clientY);
  };

  const scratch = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, eraserRadius, 0, Math.PI * 2);
    ctx.fill();
  };

  const startFinishAnimation = async () => {
    await controls.start({
      scale: [1, 1.05, 1],
      rotate: [0, 1.5, -1.5, 0],
      transition: { duration: 0.35 },
    });
    onComplete?.();
  };

  const checkCompletion = () => {
    if (isComplete) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { width: w, height: h } = canvas;
    const pixels = ctx.getImageData(0, 0, w, h).data;
    let cleared = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] === 0) cleared++;
    const percent = (cleared / (pixels.length / 4)) * 100;
    if (percent >= minScratchPercentage) {
      setIsComplete(true);
      ctx.clearRect(0, 0, w, h);
      startFinishAnimation();
    }
  };

  return (
    <motion.div
      className={[
        "relative select-none rounded-3xl overflow-hidden border",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ width, height, touchAction: "none", cursor: "pointer" }}
      onPointerDown={handlePointerDown}
      animate={controls}
      role="group"
      aria-label="문질러서 확인"
    >
      {/* 아래 콘텐츠(드러날 내용) */}
      <div style={{ width, height }}>{children}</div>

      {/* 스크래치 레이어 + 안내 */}
      {!isComplete && (
        <>
          <canvas ref={canvasRef} className="absolute inset-0" />
          {overlay && (
            <div className="absolute inset-0 grid place-items-center pointer-events-none select-none">
              {overlay}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default ScratchToReveal;
