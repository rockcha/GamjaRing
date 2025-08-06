// src/pages/IntroPage.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function IntroPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/main"); // 로그인 페이지나 메인페이지로 이동
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[white] px-4">
      {/* 배경 GIF */}
      <img
        src="/images/potato-intro.gif"
        alt="감자 귀여움"
        className="w-25 h-25 mb-2 object-contain"
      />

      {/* 멘트 */}
      <motion.p
        className="text-lg text-[#6b4e2d] font-semibold mb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        함께한 추억, 감자처럼 싹을 틔워요
      </motion.p>

      {/* 서비스 이름 등장 */}
      <motion.h1
        className="text-4xl  text-[#6b4e2d] tracking-wide"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
      >
        <strong>감자링(GamjaRing)</strong>
      </motion.h1>
    </div>
  );
}
