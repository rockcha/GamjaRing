import { useState } from "react";

interface ToggleButtonProps {
  text: string;
  emoji?: string;
  children: React.ReactNode;
}

export default function ToggleButton({
  text,
  emoji,
  children,
}: ToggleButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-fit">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="border rounded-xl px-4 py-2 flex items-center gap-2 bg-white hover:bg-neutral-100"
      >
        {emoji && <span>{emoji}</span>}
        <span>{text}</span>
      </button>

      {/* ✅ 버튼 너비에 제한 안 받게 */}
      {open && (
        <div className="absolute top-full mt-2 z-10 min-w-[220px] max-w-[300px]">
          {children}
        </div>
      )}
    </div>
  );
}
