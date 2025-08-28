// src/components/magiciui/cool-mode.tsx
"use client";

import React, { useEffect, useRef } from "react";
import type { ReactNode } from "react";

export interface BaseParticle {
  element: HTMLElement | SVGSVGElement;
  left: number;
  size: number;
  top: number;
}

export interface BaseParticleOptions {
  /** 고정 파티클: "❤️" 같은 이모지, "circle", 또는 이미지 URL("/..." | "http...") */
  particle?: string;
  /** 파티클 크기(px). 미지정 시 preset에서 선택 */
  size?: number;
}

export interface CoolParticle extends BaseParticle {
  direction: number;
  speedHorz: number;
  speedUp: number;
  spinSpeed: number;
  spinVal: number;
}

export interface CoolParticleOptions extends BaseParticleOptions {
  /** 클릭 1회당 생성 개수 (기본 20) */
  particleCount?: number;
  /** 속도 기본값(미지정 시 약간의 랜덤) */
  speedHorz?: number;
  speedUp?: number;
}

/* 전역 컨테이너 */
const getContainer = () => {
  const id = "_coolMode_effect";
  const existing = document.getElementById(id);
  if (existing) return existing;

  const el = document.createElement("div");
  el.id = id;
  el.setAttribute(
    "style",
    "overflow:hidden;position:fixed;height:100%;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:2147483647"
  );
  document.body.appendChild(el);
  return el;
};

let instanceCounter = 0;

/** noUncheckedIndexedAccess 대응: 배열에서 안전하게 하나 가져오기 */
function pickOne<T>(arr: readonly T[]): T {
  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx]!; // 인덱스 범위 내: non-null 단언
}

const installEffect = (host: HTMLElement, options?: CoolParticleOptions) => {
  instanceCounter++;

  const container = getContainer();
  const sizes = [15, 20, 25, 35, 45] as const;
  const particles: CoolParticle[] = [];

  /* 파티클 1개 생성 */
  const spawnOne = (x: number, y: number, particleType: string) => {
    // ---- 옵션 로컬 복사 & 가드 (strict friendly) ----
    const optSize = options?.size;
    const size: number = typeof optSize === "number" ? optSize : pickOne(sizes);

    const optH = options?.speedHorz;
    const speedHorz: number =
      typeof optH === "number" ? optH : Math.random() * 10;

    const optU = options?.speedUp;
    const speedUp: number =
      typeof optU === "number" ? optU : Math.random() * 25;

    const spinVal = Math.random() * 360;
    const spinSpeed = Math.random() * 35 * (Math.random() < 0.5 ? -1 : 1);
    const top = y - size / 2;
    const left = x - size / 2;
    const direction = Math.random() < 0.5 ? -1 : 1;

    const root = document.createElement("div");

    if (particleType === "circle") {
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("cx", String(size / 2));
      circle.setAttribute("cy", String(size / 2));
      circle.setAttribute("r", String(size / 2));
      circle.setAttribute("fill", `hsl(${Math.random() * 360}, 70%, 50%)`);
      svg.setAttribute("width", String(size));
      svg.setAttribute("height", String(size));
      svg.appendChild(circle);
      root.appendChild(svg);
    } else if (
      particleType.startsWith("/") ||
      particleType.startsWith("http")
    ) {
      root.innerHTML = `<img src="${particleType}" width="${size}" height="${size}" style="border-radius:50%">`;
    } else {
      // 이모지/문자 (고정 particle 사용)
      const scale = 3;
      const emojiSize = size * scale;
      root.innerHTML = `<div style="font-size:${emojiSize}px;line-height:1;text-align:center;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;transform:scale(${scale});transform-origin:center;">${particleType}</div>`;
    }

    root.style.position = "absolute";
    root.style.transform = `translate3d(${left}px, ${top}px, 0) rotate(${spinVal}deg)`;
    container.appendChild(root);

    particles.push({
      direction,
      element: root,
      left,
      size,
      speedHorz,
      speedUp,
      spinSpeed,
      spinVal,
      top,
    });
  };

  /* 이동/소멸 (생성은 클릭 때만) */
  const step = () => {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]!; // non-null 확정

      p.left -= p.speedHorz * p.direction;
      p.top -= p.speedUp;
      p.speedUp = Math.min(p.size, p.speedUp - 1);
      p.spinVal += p.spinSpeed;

      if (
        p.top >=
        Math.max(window.innerHeight, document.body.clientHeight) + p.size
      ) {
        p.element.remove();
        particles.splice(i, 1);
        continue;
      }

      (p.element as HTMLElement).setAttribute(
        "style",
        [
          "position:absolute",
          "will-change:transform",
          `top:${p.top}px`,
          `left:${p.left}px`,
          `transform:rotate(${p.spinVal}deg)`,
        ].join(";")
      );
    }
    raf = requestAnimationFrame(step);
  };

  let raf = requestAnimationFrame(step);

  /* 클릭 순간 버스트 생성 (길게 눌러도 추가 생성 X) */
  const onPointerDown = (e: PointerEvent) => {
    const x = e.clientX;
    const y = e.clientY;

    // 이모지/문자 고정 (랜덤 없음)
    const particleType = options?.particle ?? "❤️";

    const optCount = options?.particleCount;
    const count: number = typeof optCount === "number" ? optCount : 20;

    for (let i = 0; i < count; i++) {
      const jx = (Math.random() - 0.5) * 12; // 살짝 흩뿌림용
      const jy = (Math.random() - 0.5) * 8;
      spawnOne(x + jx, y + jy, particleType);
    }
  };

  host.addEventListener("pointerdown", onPointerDown, { passive: true });

  /* 정리 */
  return () => {
    host.removeEventListener("pointerdown", onPointerDown);
    cancelAnimationFrame(raf);

    const interval = window.setInterval(() => {
      if (particles.length === 0) {
        clearInterval(interval);
        if (--instanceCounter === 0) {
          document.getElementById("_coolMode_effect")?.remove();
        }
      }
    }, 300);
  };
};

interface CoolModeProps {
  children: ReactNode;
  options?: CoolParticleOptions;
}

export const CoolMode: React.FC<CoolModeProps> = ({ children, options }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!ref.current) return;
    return installEffect(ref.current, options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(options)]); // 옵션 변경 시에만 재설치

  return (
    <div ref={ref} style={{ display: "inline-block", position: "relative" }}>
      {children}
    </div>
  );
};
