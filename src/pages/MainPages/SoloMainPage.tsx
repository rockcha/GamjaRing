import { useState, useEffect } from "react";
import { useCoupleContext } from "@/contexts/CoupleContext";
import PotatoButton from "@/components/widgets/PotatoButton";
import PopupWithInput from "@/components/widgets/PopupWithInput";
import { useUser } from "@/contexts/UserContext";

export default function SoloMainPage() {
  const { requestCouple } = useCoupleContext();
  const [showPopup, setShowPopup] = useState(false);
  const { user, isCoupled, loading } = useUser();

  const handleSubmit = async (nickname: string): Promise<string> => {
    const { error } = await requestCouple(nickname);
    if (error) return `❗ ${error.message}`;

    return "요청이 성공적으로 전송되었습니다! 💌";
  };

  // if (loading || !user) {
  //   return <PotatoLoading />;
  // }

  return (
    <>
      {/* 메인 콘텐츠 */}
      <div className="min-h-screen  flex flex-col items-center  text-center px-4 py-10 ">
        {/* 슬픈 감자 이미지 */}
        <img
          src="/images/potato-sad.png"
          alt="슬픈 감자"
          className="w-40 h-40 object-contain mb-6"
        />

        {/* 상태 문구 */}
        <p className="text-[#5b3d1d] text-xl font-semibold mb-3">
          감자를 같이 키울 상대방이 없어요... 🥲
        </p>

        {/* 커플 요청 버튼 */}
        <PotatoButton
          text="요청 보내기"
          emoji="💌"
          onClick={() => setShowPopup(true)}
        />
      </div>
      <PopupWithInput
        show={showPopup}
        onClose={() => setShowPopup(false)}
        onSubmit={handleSubmit}
        title="상대 닉네임을 입력해주세요"
        placeholder="닉네임 입력"
        confirmText="요청 보내기"
        emoji="💌"
      />
    </>
  );
}
