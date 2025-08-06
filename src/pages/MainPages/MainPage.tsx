import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import SoloMainPage from "./SoloMainPage";
import CoupleMainPage from "./CoupleMainPage";
import PotatoLoading from "@/components/PotatoLoading";

export default function MainPage() {
  const { user, isCoupled, loading } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login"); // 로그인 페이지로 이동
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return <PotatoLoading />;
  }

  return isCoupled ? <CoupleMainPage /> : <SoloMainPage />;
}
