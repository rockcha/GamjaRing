// src/components/widgets/SimplePopup.tsx
import { useEffect } from "react";

interface SimplePopupProps {
  open: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export default function SimplePopup({
  open,
  onClose,
  title,
  content,
}: SimplePopupProps) {
  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 shadow-xl w-[90%] max-w-md relative animate-fade-in-up"
        onClick={(e) => e.stopPropagation()} // 팝업 클릭 시 닫히지 않게
      >
        <button
          onClick={onClose}
          className="absolute top-1 right-2 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>

        <h2 className="text-lg font-bold text-gray-800 mb-3">{title}</h2>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}
