// hooks/useHasNotifications.ts
import { useEffect, useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";

export function useHasNotifications(enabled = true) {
  const { user } = useUser();
  const [has, setHas] = useState(false);

  useEffect(() => {
    if (!enabled || !user?.id) {
      setHas(false);
      return;
    }

    let mounted = true;

    // 처음에 존재 여부 확인
    (async () => {
      const head = await supabase
        .from("user_notification")
        .select("*", { head: true, count: "exact" })
        .eq("receiver_id", user.id);
      if (mounted) setHas((head.count ?? 0) > 0);
    })();

    // INSERT 들어오면 dot ON (원래 쓰던 부분)
    const ch = supabase
      .channel(`notif:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notification",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => setHas(true)
      )
      .subscribe();

    // 🔹 패널이 닫히며 일괄 삭제했음을 알리는 커스텀 이벤트 수신 → 즉시 OFF
    const onCleared = () => setHas(false);
    window.addEventListener("notifications:cleared", onCleared);

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
      window.removeEventListener("notifications:cleared", onCleared);
    };
  }, [enabled, user?.id]);

  return has;
}
