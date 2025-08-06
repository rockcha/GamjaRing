import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface Props {
  show: boolean;
  onClose: () => void;
  onSubmit: (input: string) => Promise<string>;
  title: string;
  placeholder?: string;
  confirmText?: string;
  emoji?: string;
  inputType?: "text" | "email" | "number";
}

export default function PopupWithInput({
  show,
  onClose,
  onSubmit,
  title,
  placeholder = "",
  confirmText = "확인",
  emoji = "🥔",
  inputType = "text",
}: Props) {
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    if (!input.trim()) {
      setMessage("입력값을 작성해주세요.");
      return;
    }

    const result = await onSubmit(input.trim());
    setMessage(result);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose} // 오버레이 클릭 시 닫힘
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()} // 내부 클릭 시 닫힘 방지
            className="bg-[#fdf6ec] border-2 border-[#bfa07e] p-8 rounded-2xl shadow-2xl w-[90%] max-w-lg text-[#5b3d1d]"
          >
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-bold">
                {emoji} {title}
              </span>
              <button
                onClick={onClose}
                className="text-pink-600 hover:text-pink-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <input
              type={inputType}
              placeholder={placeholder}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full px-6 py-3 border border-[#d6bfa5] rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />

            <button
              onClick={handleSubmit}
              className="w-full rounded-full bg-[#e4c8a0] hover:bg-[#d9b988] text-[#5b3d1d] font-semibold py-3 transition-all duration-200 shadow-sm"
            >
              {confirmText}
            </button>

            {message && (
              <p className="text-sm mt-3 text-center text-[#5b3d1d]">
                {message}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
