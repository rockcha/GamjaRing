import React from "react";

interface PotatoButtonProps {
  text?: string;
  emoji?: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  bounce?: boolean;
}

export default function PotatoButton({
  text = "감자링",
  emoji = "🥔",
  onClick,
  disabled = false,
  loading = false,
  fullWidth = false,
  bounce = true,
}: PotatoButtonProps) {
  const baseStyle =
    "rounded-full   font-semibold transition duration-200 px-5 py-3 w-fit";
  const layoutStyle = "flex items-center gap-2 justify-center text-[#5b3d1d]";
  const hoverStyle = !disabled && "hover:text-amber-600 hover:scale-105";
  const borderStyle = "border border-2 border-[#bfa07e] bg-[#fdf6ec]"; // 연한 배경 + 테두리

  const disabledStyle = "disabled:opacity-50 disabled:cursor-not-allowed";

  const fullWidthStyle = fullWidth ? "w-full" : "";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        baseStyle,
        layoutStyle,
        hoverStyle,
        borderStyle,
        disabledStyle,
        fullWidthStyle,
      ].join(" ")}
    >
      {loading ? (
        "로딩 중...⏳"
      ) : (
        <>
          {text}
          <span
            className={[
              "w-6 h-6 flex items-center justify-center",
              bounce ? "animate-bounce" : "",
            ].join(" ")}
          >
            {emoji}
          </span>
        </>
      )}
    </button>
  );
}
