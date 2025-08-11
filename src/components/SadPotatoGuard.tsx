import React from "react";

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
  hint = "상대 닉네임으로 요청을 보내보세요 💌",
  showRequestButton = false,
  requestText = "요청 보내기",
  onRequestClick,
  className = "",
}: Props) {
  return (
    <div
      className={[
        "min-h-[60vh] w-full flex items-center justify-center px-4",
        className,
      ].join(" ")}
    >
      <div className="max-w-[520px] w-full text-center bg-white/70 border  rounded-2xl shadow-sm p-6 sm:p-8">
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

        {/* 액션 버튼 (선택) */}
        {showRequestButton && (
          <button
            type="button"
            onClick={onRequestClick}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-[#fdf6ee] px-4 py-2 text-sm sm:text-base font-medium text-[#3d2b1f] transition-transform duration-200 hover:scale-[1.02] hover:border-amber-400 active:scale-[0.98]"
          >
            <span
              role="img"
              aria-hidden
              className="inline-block animate-bounce"
            >
              💌
            </span>
            {requestText}
          </button>
        )}
      </div>
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
