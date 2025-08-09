import { useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/contexts/ToastContext";

import CoupleMainPage from "./CoupleMainPage";
import SoloMainPage from "./SoloMainPage";

export default function MainPage() {
  const { user, isCoupled, loading } = useUser();

  const { open } = useToast();
  useEffect(() => {
    open("환영합니다! 🥔 감자링에 오신 걸 환영해요.");
  }, [open]);
  return isCoupled || !user ? <CoupleMainPage /> : <SoloMainPage />;

  //비로그인 상태에서는 herosection 보여줌
}
