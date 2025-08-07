// src/components/Sidebar.tsx
import NavButton from "@/components/widgets/NavButton";

export default function Sidebar() {
  return (
    <aside className="w-[350px]   p-6 rounded-xl ">
      <nav className="flex flex-col gap-6 items-center">
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
          imgSrc="/navbuttons/nb-memo.png"
          description="지수 바보"
          to="/schedule"
        />
      </nav>
    </aside>
  );
}
