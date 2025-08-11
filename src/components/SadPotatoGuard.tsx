import { useState } from "react";
import { useCoupleContext } from "@/contexts/CoupleContext";
import PotatoButton from "@/components/widgets/PotatoButton";
import PopupWithInput from "@/components/widgets/PopupWithInput";
interface Props {
  /** 이미지 경로 (기본: /images/potato-sad.png) */
  imageSrc?: string;
  /** 메인 안내 문구 */
  message?: string;
  /** 추가 힌트 문구 (선택) */
  hint?: string;
  /** 요청 버튼 노출 여부 */
  showRequestButton?: boolean;
  /** 요청 버튼 라벨 */
  requestText?: string;
  /** 요청 버튼 클릭 핸들러 */
  onRequestClick?: () => void;
  /** 래퍼에 추가 클래스 */
  className?: string;
}

/**
 * 속상한 감자 안내 컴포넌트
 * - 커플 연결이 필요한 페이지에서 빈 상태로 사용
 * - Tailwind CSS 기반, 외부 라이브러리 의존 없음
 */
export default function SadPotatoGuard({
  imageSrc = "/images/potato-sad.png",
  message = "커플 추가가 되어야 확인할 수 있는 페이지 입니다.",
  hint = "상대 닉네임으로 요청을 보내보세요 ",

  className = "",
}: Props) {
  const [showPopup, setShowPopup] = useState(false);
  const { requestCouple } = useCoupleContext();
  const handleSubmit = async (nickname: string): Promise<string> => {
    const { error } = await requestCouple(nickname);
    if (error) return `❗ ${error.message}`;

    return "요청이 성공적으로 전송되었습니다! 💌";
  };
  return (
    <div
      className={[
        "min-h-[40vh] w-full flex items-center justify-center px-4",
        className,
      ].join(" ")}
    >
      <div className="max-w-[520px] w-full  text-center  bg-white/70  rounded-2xl  p-6 sm:p-8">
        {/* 이미지 */}
        <img
          src={imageSrc}
          alt="속상한 감자"
          className="mx-auto w-36 h-36 sm:w-40 sm:h-40 object-contain mb-5 select-none"
          draggable={false}
        />

        {/* 메인 문구 */}
        <p className="text-[#5b3d1d] text-lg sm:text-xl font-semibold leading-relaxed">
          {message}
        </p>

        {/* 보조 힌트 */}
        {hint && (
          <p className="mt-2 text-[15px] sm:text-base text-[#6b533b]">{hint}</p>
        )}
        <div className="mt-4 flex justify-center">
          <PotatoButton
            text="요청 보내기"
            emoji="💌"
            onClick={() => setShowPopup(true)}
          />
        </div>
      </div>
      {/* 액션 버튼 (선택) */}

      <PopupWithInput
        show={showPopup}
        onClose={() => setShowPopup(false)}
        onSubmit={handleSubmit}
        title="상대 닉네임을 입력해주세요"
        placeholder="닉네임 입력"
        confirmText="요청 보내기"
        emoji=""
      />
    </div>
  );
}

/* 사용 예시

<SadPotatoGuard
  showRequestButton
  onRequestClick={() => setShowPopup(true)}
  hint="프로필에서 상대 닉네임을 확인해보세요"
/>

*/
