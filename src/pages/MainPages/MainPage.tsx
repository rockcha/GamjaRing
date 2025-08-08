import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";

import CoupleMainPage from "./CoupleMainPage";
import SoloMainPage from "./SoloMainPage";

export default function MainPage() {
  const { user, isCoupled, loading } = useUser();
  const navigate = useNavigate();

  // if (loading) {
  //   return <PotatoLoading />;
  // }

  return isCoupled || !user ? <CoupleMainPage /> : <SoloMainPage />;

  //비로그인 상태에서는 herosection 보여줌
}
