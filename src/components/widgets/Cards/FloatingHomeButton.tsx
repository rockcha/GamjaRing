// src/components/common/FloatingHomeButton.tsx
"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouse } from "@fortawesome/free-solid-svg-icons";

type Props = {
  tooltip?: string; // 툴팁 문구 (기본: 홈으로)
  className?: string; // 추가 커스텀 클래스
  size?: "sm" | "md" | "lg"; // 버튼 크기
};

const sizeMap = {
  // 1.2배 키운 임의 크기 (Tailwind arbitrary size)
  sm: { box: "h-[3.6rem] w-[3.6rem]", icon: "text-2xl" }, // 기존 h-10(2.5rem)→3rem 기준 1.2x ≈ 3.6rem
  md: { box: "h-[4.8rem] w-[4.8rem]", icon: "text-3xl" }, // 기존 h-12(3rem)→3.6rem이지만 전체적으로 더 시원하게
  lg: { box: "h-[5.6rem] w-[5.6rem]", icon: "text-4xl" },
};

export default function FloatingHomeButton({
  tooltip = "홈으로",
  className = "",
  size = "sm",
}: Props) {
  const nav = useNavigate();
  const sz = sizeMap[size];

  return (
    <button
      type="button"
      aria-label="Go to home"
      title={tooltip}
      onClick={() => nav("/main")}
      className={[
        // 위치 고정 + z-order 최상단
        "fixed left-4 bottom-4 z-50",
        // 모바일 safe-area 대응
        "pl-[max(env(safe-area-inset-left),0px)] pb-[max(env(safe-area-inset-bottom),0px)]",
        // 모양 & 베이스 스타일
        "rounded-full border border-black/5",
        "bg-gradient-to-br from-white/95 to-white/85 dark:from-neutral-900/95 dark:to-neutral-900/85",
        "backdrop-blur supports-[backdrop-filter]:backdrop-blur",
        // 트랜지션
        "transition-all duration-200 ease-out",
        // 호버(글로우 + 리프트 + 살짝 선명해짐). ring 대신 그림자와 채도 강조
        "shadow-md hover:shadow-2xl hover:-translate-y-0.5 hover:saturate-125",
        // 액티브(살짝 눌림)
        "active:translate-y-[1px] active:shadow-lg",
        // 포커스(접근성: outline 없이 살짝 스케일/그림자 유지)
        "focus:outline-none focus:-translate-y-0.5",
        // 내부 정렬
        "grid place-items-center",
        // 크기
        sz.box,
        className,
      ].join(" ")}
    >
      <FontAwesomeIcon icon={faHouse} className={sz.icon} />
    </button>
  );
}
