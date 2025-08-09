import { useUser } from "@/contexts/UserContext";

//import SendUserNotificationSimulator from "@/components/tests/SendUserNotificationSimulator";
import PotatoPokeButton from "@/components/widgets/PotatoPokeButton";

export default function CoupleMainPage() {
  const { user, loading } = useUser();

  return <PotatoPokeButton />;
}
