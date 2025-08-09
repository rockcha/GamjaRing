import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface PopupProps {
  message: string;
  show: boolean;
  onClose?: () => void;
}

export default function Popup({ message, show, onClose }: PopupProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-4 right-4 border-2 z-[10000] border-[#bfa07e] bg-[#fdf6ec] px-4 py-3 rounded-lg shadow-lg font-semibold text-sm  flex items-center gap-2 text-[#5b3d1d]"
        >
          <span> {message}</span>
          {onClose && (
            <button
              onClick={onClose}
              className="text-pink-600 hover:text-pink-800 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
