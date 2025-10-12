"use client";

import { AnimatePresence, motion } from "framer-motion";

export default function CenterAddFx({
  emoji,
  show,
  size = 220,
}: {
  emoji: string;
  show: boolean;
  size?: number;
}) {
  const center = size / 2;
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ width: size, height: size }}
    >
      <AnimatePresence>
        {show && (
          <>
            {/* emoji pop */}
            <motion.div
              key="fx-emoji"
              initial={{ scale: 0.7, opacity: 0.0, filter: "blur(2px)" }}
              animate={{ scale: 1.08, opacity: 1, filter: "blur(0px)" }}
              exit={{ scale: 0.9, opacity: 0, filter: "blur(1px)" }}
              transition={{ duration: 0.42, ease: [0.22, 0.8, 0.35, 1] }}
              className="absolute grid place-items-center text-3xl"
              style={{
                left: center,
                top: center,
                transform: "translate(-50%, -50%)",
              }}
            >
              {emoji}
            </motion.div>

            {/* ring pulses */}
            {[0, 1].map((k) => (
              <motion.span
                key={`ring-${k}`}
                initial={{ scale: 1, opacity: 0.28 }}
                animate={{ scale: 1.8, opacity: 0 }}
                transition={{ duration: 0.7, delay: 0.06 * k, ease: "easeOut" }}
                className="absolute rounded-full ring-2 ring-amber-400/50"
                style={{
                  left: center,
                  top: center,
                  width: size * 0.38,
                  height: size * 0.38,
                  transform: "translate(-50%, -50%)",
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
