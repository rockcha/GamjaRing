import { motion } from "framer-motion";

interface Props {
  title?: string;
  imageSrc?: string;
  className?: string;
}

export default function SubHeader({
  title = "부실감자록 키우기",
  imageSrc = "/images/potato-watering.png",
  className = "",
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`flex flex-col items-center justify-center text-center ${className}`}
    >
      {/* 말풍선 영역 */}
      <div className="relative bg-[#fff7e6] border border-[#f4c989] text-[#5b3d1d] px-6 py-4 rounded-[24px] shadow-[0_4px_10px_rgba(0,0,0,0.1)] mb-6 max-w-[280px]">
        <p className="text-lg font-semibold leading-snug tracking-wide">
          {title}
        </p>

        {/* 뭉게뭉게 말풍선 꼬리 - 2개 */}
        <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1">
          <motion.div
            className="w-3.5 h-3.5 bg-[#fff7e6] border border-[#f4c989] rounded-full  "
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.3, type: "spring" }}
          />
          <motion.div
            className="w-2.5 h-2.5 bg-[#fff7e6] border border-[#f4c989] rounded-full mt-[10px]"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, duration: 0.3, type: "spring" }}
          />
        </div>
      </div>

      {/* 감자 이미지 */}
      <motion.img
        src={imageSrc}
        alt="부실감자"
        className="w-28 h-28 object-contain"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      />
    </motion.div>
  );
}
