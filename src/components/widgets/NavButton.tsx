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
  enableNotificationDot?: boolean;
}

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

const CARD_VARIANTS: Variants = {
  rest: { scale: 1, transition: { duration: 0.12, ease: EASE_OUT } },
  hover: { scale: 1.04, transition: { duration: 0.12, ease: EASE_OUT } },
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

  const showBlinkingDot = enableNotificationDot && hasAlert;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex-none"
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
        className="
          relative rounded-xl overflow-hidden border bg-white group
          flex flex-col items-center justify-center p-3
          w-[96px] md:w-[120px]   /* ✅ 이미지보다 살짝 넓게 */
          h-[120px] md:h-[148px]  /* ✅ 라벨 자리까지 높이 미리 확보 */
          mx-auto
        "
      >
        {/* 🔴 알림 점(옵션) */}
        {showBlinkingDot && (
          <motion.span
            className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full bg-red-500 ring-2 ring-white"
            aria-hidden="true"
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* 🖼️ 이미지: 살짝 축소 */}
        <motion.img
          layoutId={`thumb-${id}`}
          src={imgSrc}
          alt={label}
          className="w-14 h-14 md:w-16 md:h-16 object-contain"
          transition={{ layout: { duration: 0.35, ease: EASE_OUT } }}
        />

        {/* 🔤 라벨: 높이 예약(h-5/md:h-6) → hover시만 보이게 */}
        <div className="mt-1 h-5 md:h-6 w-full flex items-center justify-center overflow-hidden">
          <motion.span
            layoutId={`title-${id}`}
            className="relative text-xs md:text-sm font-semibold text-[#3d2b1f] opacity-100 translate-y-0 transition-all duration-300"
            transition={{ layout: { duration: 0.35, ease: EASE_OUT } }}
          >
            {label}
            {/* 밑줄 애니메이션 유지 */}
            <span className="absolute left-0 -bottom-1 w-0 h-5 bg-amber-400 opacity-30 rounded-full transition-all duration-700 group-hover:w-full" />
          </motion.span>
        </div>
      </motion.div>
    </button>
  );
}
