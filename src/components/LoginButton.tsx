import { useNavigate } from "react-router-dom";

export default function LoginButton() {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      aria-label="로그인"
      onClick={() => navigate("/login")}
      className="
        group inline-flex flex-col items-center justify-center
        border border-gray-200 bg-white shadow-sm
        rounded-xl
        transition-transform duration-200 hover:scale-105 cursor-pointer
        focus:outline-none
      "
      style={{ width: 80, height: 80 }}
    >
      <img
        src="/login.gif" // 로그인용 gif로 교체 가능
        alt=""
        className="w-8 h-8 object-contain pointer-events-none"
      />
      <span className="mt-1 text-xs font-semibold text-[#3d2b1f]">로그인</span>
    </button>
  );
}
