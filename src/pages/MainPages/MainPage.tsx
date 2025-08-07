import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import PotatoLoading from "@/components/PotatoLoading";
import CoupleMainPage from "./CoupleMainPage";
import SoloMainPage from "./SoloMainPage";

export default function MainPage() {
  const { user, isCoupled, loading } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return <PotatoLoading />;
  }

  return isCoupled ? <CoupleMainPage /> : <SoloMainPage />;
}
