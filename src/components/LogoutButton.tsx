import { useUser } from "@/contexts/UserContext";

export default function LogoutButton() {
  const { logout } = useUser();

  return (
    <button
      type="button"
      aria-label="로그아웃"
      onClick={async () => {
        try {
          await logout(); // 로그아웃 실행
        } catch (error) {
          console.error("로그아웃 실패:", error);
        }
      }}
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
        src="/navbuttons/logout.gif"
        alt=""
        className="w-8 h-8 object-contain pointer-events-none"
      />
      <span className="mt-1 text-xs font-semibold text-[#3d2b1f]">
        로그아웃
      </span>
    </button>
  );
}
