import { useState } from "react";
import NavButton from "@/components/widgets/NavButton";
import FullscreenOverlay, {
  type OverlayItem,
} from "@/components/FullscreenOverlay";
import IntroductionPanel from "./Panels/IntroductionPanel";
import OurPotatoPanel from "./Panels/OurPotatoPanel";
import AnswerPanel from "./Panels/AnswerPanel";
import TodayQuestionPanel from "./Panels/TodayQuestionPanel";
import NotificationPanel from "./Panels/NotificationPanel";
import MyPagePanel from "./Panels/MyPagePanel";
import SadPotatoGuard from "./SadPotatoGuard";
import { useUser } from "@/contexts/UserContext";
import CoupleSchedulerPage from "./Panels/CoupleSchedulerPanel";

export default function Navbar() {
  const [active, setActive] = useState<OverlayItem | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { isCoupled } = useUser();

  const open = (p: OverlayItem) => {
    setActiveId(p.id); // 어떤 버튼이 클릭됐는지 내려줘서 hover 막고 자연 전환
    setActive(p);
  };

  const close = () => {
    // 🔸 현재 열린 게 알림 패널이면 dot 끄는 신호 브로드캐스트
    if (active?.id === "updates") {
      window.dispatchEvent(new Event("notifications:cleared"));
    }
    setActive(null);
    setTimeout(() => setActiveId(null), 200);
  };

  return (
    <>
      <nav className="sticky top-[180px] z-50 flex flex-wrap justify-evenly gap-y-2">
        <NavButton
          id="about"
          imgSrc="/navbuttons/About.gif"
          label="소개페이지"
          onOpen={open}
          activeId={activeId}
          content={<IntroductionPanel />}
        />
        <NavButton
          id="updates"
          imgSrc="/navbuttons/Updates.gif"
          label="알림메세지"
          onOpen={open}
          activeId={activeId}
          content={<NotificationPanel />}
          enableNotificationDot={true}
        />
        <NavButton
          id="home"
          imgSrc="/potato-growth.gif"
          label="우리의 감자"
          onOpen={open}
          activeId={activeId}
          content={isCoupled ? <OurPotatoPanel /> : <SadPotatoGuard />}
        />
        <NavButton
          id="mypage"
          imgSrc="/navbuttons/nb-mypage.gif"
          label="마이페이지"
          onOpen={open}
          activeId={activeId}
          content={<MyPagePanel />}
        />
        <NavButton
          id="write"
          imgSrc="/navbuttons/nb-memo.gif"
          label="답변 작성"
          onOpen={open}
          activeId={activeId}
          content={isCoupled ? <TodayQuestionPanel /> : <SadPotatoGuard />}
        />
        <NavButton
          id="answers"
          imgSrc="/navbuttons/nb-q&a.gif"
          label="답변 꾸러미"
          onOpen={open}
          activeId={activeId}
          content={isCoupled ? <AnswerPanel /> : <SadPotatoGuard />}
        />
        <NavButton
          id="schedule"
          imgSrc="/navbuttons/nb-schedule.gif"
          label="커플 스케쥴러"
          onOpen={open}
          activeId={activeId}
          content={isCoupled ? <CoupleSchedulerPage /> : <SadPotatoGuard />}
        />
        <NavButton
          id="todo"
          imgSrc="/navbuttons/nb-todo.gif"
          label="오늘의 할일"
          onOpen={open}
          activeId={activeId}
          content={isCoupled ? <IntroductionPanel /> : <SadPotatoGuard />}
        />
      </nav>

      <FullscreenOverlay active={active} onDismiss={close} />
    </>
  );
}
