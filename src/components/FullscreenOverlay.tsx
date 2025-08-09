import { AnimatePresence, motion } from "framer-motion";

export type OverlayItem = {
  id: string;
  imgSrc: string;
  title: string;
  content: React.ReactNode;
};

export default function FullscreenOverlay({
  active,
  onDismiss,
}: {
  active: OverlayItem | null;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {active && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center">
          {/* 백드롭 */}
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            onClick={onDismiss}
          />

          {/* 패널 */}
          <motion.div
            layoutId={`card-${active.id}`}
            transition={{
              layout: { duration: 1, ease: "easeInOut" },
              duration: 1,
            }}
            className="relative w-[80%] h-[80%] bg-white rounded-xl overflow-hidden shadow-xl z-[1000] flex flex-col"
          >
            {/* 상단 고정 헤더 */}
            <div className="sticky top-0 flex items-center gap-3 px-6 py-4 border-b bg-white backdrop-blur-md z-[1001]">
              <motion.img
                layoutId={`thumb-${active.id}`}
                src={active.imgSrc}
                alt=""
                className="w-8 h-8 object-contain"
                transition={{
                  layout: { duration: 1, ease: "easeInOut" },
                  duration: 1,
                }}
              />
              <motion.h1
                layoutId={`title-${active.id}`}
                className="text-lg md:text-xl font-semibold text-[#3d2b1f]"
                transition={{
                  layout: { duration: 1, ease: "easeInOut" },
                  duration: 1,
                }}
              >
                {active.title}
              </motion.h1>

              <div className="ml-auto">
                <button
                  onClick={onDismiss}
                  className="px-3 py-1.5 rounded-md border hover:bg-gray-50 "
                >
                  닫기
                </button>
              </div>
            </div>

            {/* 본문 */}
            <div className="flex-1 overflow-auto p-12 items-center">
              {active.content}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
