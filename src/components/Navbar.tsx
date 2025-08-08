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

export default function Navbar() {
  const [active, setActive] = useState<OverlayItem | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const open = (p: OverlayItem) => {
    setActiveId(p.id); // 어떤 버튼이 클릭됐는지 내려줘서 hover 막고 자연 전환
    setActive(p);
  };

  const close = () => {
    setActive(null);
    // 살짝 지연 후 해제하면 레이아웃 전환 잔상 최소화
    setTimeout(() => setActiveId(null), 200);
  };

  return (
    <>
      <nav className="flex flex-wrap justify-evenly gap-y-2">
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
        />
        <NavButton
          id="home"
          imgSrc="/potato-growth.gif"
          label="우리의 감자"
          onOpen={open}
          activeId={activeId}
          content={<OurPotatoPanel />}
        />
        <NavButton
          id="mypage"
          imgSrc="/navbuttons/nb-mypage.gif"
          label="마이페이지"
          onOpen={open}
          activeId={activeId}
        />
        <NavButton
          id="write"
          imgSrc="/navbuttons/nb-memo.gif"
          label="답변 작성"
          onOpen={open}
          activeId={activeId}
          content={<TodayQuestionPanel />}
        />
        <NavButton
          id="answers"
          imgSrc="/navbuttons/nb-q&a.gif"
          label="답변 꾸러미"
          onOpen={open}
          activeId={activeId}
          content={<AnswerPanel />}
        />
      </nav>

      <FullscreenOverlay active={active} onDismiss={close} />
    </>
  );
}
