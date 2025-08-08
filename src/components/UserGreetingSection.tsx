import LogoutButton from "@/components/LogoutButton"; // 로그아웃 버튼 컴포넌트
import LoginButton from "./LoginButton";
import type { FC } from "react";

interface UserGreetingSectionProps {
  user: { nickname: string } | null;
  isCoupled?: boolean; // 커플 상태 여부
}

const UserGreetingSection: FC<UserGreetingSectionProps> = ({
  user,
  isCoupled,
}) => {
  return (
    <div className="basis-[10%] grow-0 shrink-0 flex items-center justify-end gap-2">
      {user ? (
        <>
          <div className="px-2 py-1 rounded-md text-center w-[120px]">
            <p className="text-gray-800 text-lg font-semibold truncate">
              {user.nickname}님,
            </p>
            <p className="font-semibold text-[#3d2b1f] text-lg">환영합니다</p>

            {/* 커플 상태 표시 */}
            <p
              className={`text-sm  mt-1 font-semibold${
                isCoupled ? "text-pink-500" : "text-gray-500"
              }`}
            >
              {isCoupled ? "💖 연애중" : "😢 솔로"}
            </p>
          </div>

          {/* 로그아웃 버튼 */}
          <LogoutButton />
        </>
      ) : (
        <LoginButton />
      )}
    </div>
  );
};

export default UserGreetingSection;
