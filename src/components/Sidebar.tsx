// src/components/Sidebar.tsx
import NavButton from "@/components/widgets/NavButton";

export default function Sidebar() {
  return (
    <aside className=" p-6 rounded-2xl">
      {/* 👉 flex 대신 grid 사용 */}
      <nav className="grid grid-cols-2 gap-2 place-items-center">
        <NavButton
          imgSrc="/navbuttons/nb-home.gif"
          description="메인페이지"
          to="/main"
        />
        <NavButton
          imgSrc="/navbuttons/nb-mypage.gif"
          description="마이페이지"
          to="/questions"
        />
        <NavButton
          imgSrc="/navbuttons/nb-q&a.gif"
          description="답변 꾸러미"
          to="/answerpage"
        />
        <NavButton
          imgSrc="/navbuttons/nb-memo.gif"
          description="메모"
          to="/schedule"
        />
        <NavButton
          imgSrc="/navbuttons/nb-memo.gif"
          description="테스트용"
          to="/schedule"
        />
        <NavButton
          imgSrc="/navbuttons/nb-memo.gif"
          description="테스트용"
          to="/schedule"
        />
        <NavButton
          imgSrc="/navbuttons/nb-memo.gif"
          description="테스트용"
          to="/schedule"
        />
        <NavButton
          imgSrc="/navbuttons/nb-memo.gif"
          description="테스트용"
          to="/schedule"
        />
        <NavButton
          imgSrc="/navbuttons/nb-memo.gif"
          description="테스트용"
          to="/schedule"
        />
        <NavButton
          imgSrc="/navbuttons/nb-memo.gif"
          description="테스트용"
          to="/schedule"
        />
        <NavButton
          imgSrc="/navbuttons/nb-memo.gif"
          description="테스트용"
          to="/schedule"
        />
        <NavButton
          imgSrc="/navbuttons/nb-memo.gif"
          description="테스트용"
          to="/schedule"
        />
      </nav>
    </aside>
  );
}
