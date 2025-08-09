import { useCallback } from "react";
import { motion, type Variants } from "framer-motion";
import { useHasNotifications } from "../hooks/useHasNotifications";

export interface NavOverlayPayload {
  id: string;
  imgSrc: string;
  title: string;
  content: React.ReactNode;
}

interface NavButtonProps {
  id: string;
  imgSrc: string;
  label: string;
  content?: React.ReactNode | (() => React.ReactNode);
  onOpen?: (payload: NavOverlayPayload) => void;
  activeId?: string | null;

  /** 🔸 선택: 알림 점 표시 기능을 사용할지 */
  enableNotificationDot?: boolean; // 기본값 false
  /** 🔸 선택: 강제로 알림 점을 끄기 */
}

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

const CARD_VARIANTS: Variants = {
  rest: { scale: 1, transition: { duration: 0.12, ease: EASE_OUT } },
  hover: { scale: 1.1, transition: { duration: 0.12, ease: EASE_OUT } },
  tap: { scale: 0.98, transition: { duration: 0.08, ease: EASE_OUT } },
};

export default function NavButton({
  id,
  imgSrc,
  label,
  content,
  onOpen,
  activeId,
  enableNotificationDot = false,
}: NavButtonProps) {
  const isActive = activeId === id;

  // 알림 빨간점: 옵션이 켜졌을 때만 훅 구독
  const hasAlert = useHasNotifications(enableNotificationDot);

  const handleClick = useCallback(() => {
    if (!onOpen) return;
    const resolved = typeof content === "function" ? content() : content;
    onOpen({
      id,
      imgSrc,
      title: label,
      content: resolved ?? <div className="text-gray-600">내용 준비 중…</div>,
    });
  }, [onOpen, id, imgSrc, label, content]);

  // ✅ 최종 표시 여부 (깜빡임 전용)
  const showBlinkingDot = enableNotificationDot && hasAlert;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="
        block basis-[15.5%] shrink-0 grow-0
        sm:basis-[30%] md:basis-[22%] lg:basis-[16%] xl:basis-[15.5%]
      "
      aria-label={label}
    >
      <motion.div
        layoutId={`card-${id}`}
        variants={CARD_VARIANTS}
        initial="rest"
        animate="rest"
        whileTap="tap"
        transition={{ layout: { duration: 0.35, ease: EASE_OUT } }}
        {...({ whileHover: "hover" } as const)}
        className="relative w-full aspect-[2/1] rounded-xl overflow-hidden border bg-white group flex items-center gap-4 px-4"
      >
        {/* 🔴 깜빡이는 알림 점 (다른 기능 변경 없음) */}
        {showBlinkingDot && (
          <motion.span
            className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full bg-red-500 ring-2 ring-white"
            aria-hidden="true"
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        <motion.img
          layoutId={`thumb-${id}`}
          src={imgSrc}
          alt={label}
          className="w-1/4 h-auto object-contain mr-4"
          transition={{ layout: { duration: 0.35, ease: EASE_OUT } }}
        />
        <motion.span
          layoutId={`title-${id}`}
          className="hidden sm:block text-sm md:text-base font-semibold text-[#3d2b1f] relative"
          transition={{ layout: { duration: 0.35, ease: EASE_OUT } }}
        >
          {label}
          <span className="absolute left-0 -bottom-1 w-0 h-1 bg-amber-300 rounded-full transition-all duration-700 group-hover:w-full" />
        </motion.span>
      </motion.div>
    </button>
  );
}
