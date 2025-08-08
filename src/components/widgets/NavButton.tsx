import { motion } from "framer-motion";

export interface NavOverlayPayload {
  id: string;
  imgSrc: string;
  title: string;
  content: React.ReactNode;
}

interface NavButtonProps {
  id: string;
  imgSrc: string;
  label: string; // 버튼 라벨 (= title)
  content?: React.ReactNode | (() => React.ReactNode);
  onOpen?: (payload: NavOverlayPayload) => void;
  activeId?: string | null; // 클릭된 버튼 id (애니 제어)
}

export default function NavButton({
  id,
  imgSrc,
  label,
  content,
  onOpen,
  activeId,
}: NavButtonProps) {
  const isActive = activeId === id;

  const handleClick = () => {
    if (!onOpen) return;
    const resolved = typeof content === "function" ? content() : content;
    onOpen({
      id,
      imgSrc,
      title: label,
      content: resolved ?? <div className="text-gray-600">내용 준비 중…</div>,
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="
        block
        basis-[15.5%] shrink-0 grow-0
        sm:basis-[30%] md:basis-[22%] lg:basis-[16%] xl:basis-[15.5%]
      "
    >
      {/* 카드 전체에 shared transition */}
      <motion.div
        layoutId={`card-${id}`}
        {...(!isActive
          ? { whileHover: { scale: 1.04 }, whileTap: { scale: 0.98 } }
          : {})}
        transition={{ layout: { duration: 1, ease: "easeInOut" }, duration: 1 }}
        className="
          w-full aspect-[2/1]
          rounded-xl overflow-hidden border bg-white
          group flex items-center gap-4 px-4
        "
      >
        {/* GIF 이미지 shared transition */}
        <motion.img
          layoutId={`thumb-${id}`}
          src={imgSrc}
          alt={label}
          className="w-1/4 h-auto object-contain mr-4"
          transition={{
            layout: { duration: 1, ease: "easeInOut" },
            duration: 1,
          }}
        />

        {/* 텍스트도 shared transition → 상단 헤더로 자연 이동 */}
        <motion.span
          layoutId={`title-${id}`}
          className="hidden sm:block text-sm md:text-base font-semibold text-[#3d2b1f] relative"
          transition={{
            layout: { duration: 1, ease: "easeInOut" },
            duration: 1,
          }}
        >
          {label}
          <span className="absolute left-0 -bottom-1 w-0 h-1 bg-amber-300 rounded-full transition-all duration-700 group-hover:w-full" />
        </motion.span>
      </motion.div>
    </button>
  );
}
