import { useState } from "react";
import { Bell, Circle } from "lucide-react";
import { motion } from "framer-motion";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { getNotifications } from "@/utils/GetNotifications";
import supabase from "@/lib/supabase";

interface Notification {
  id: string;
  type: string;
  created_at: string;
  message: string;
  from_user_id?: string;
}

export default function NotificationButton() {
  const { user } = useUser();
  const { acceptRequest, rejectRequest } = useCoupleContext();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchAndFilterNotifications = async () => {
    if (!user) return;

    const data = await getNotifications(user.id);
    const limited = data.slice(0, 5); // 최대 5개만

    // 커플요청 아닌 알림 → DB에서 삭제
    const deletableIds = limited
      .filter((n) => n.type !== "커플요청")
      .map((n) => n.id);

    if (deletableIds.length > 0) {
      await supabase.from("notifications").delete().in("id", deletableIds);
    }

    // 상태에선 커플요청만 유지
    const filtered = limited.filter((n) => n.type === "커플요청");
    setNotifications(filtered);
  };

  const handleAccept = async (notification: Notification) => {
    if (!notification.from_user_id) return;

    await acceptRequest(notification.id);
    await supabase.from("notifications").delete().eq("id", notification.id);
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
  };

  const handleReject = async (notification: Notification) => {
    await rejectRequest(notification.id);
    await supabase.from("notifications").delete().eq("id", notification.id);
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
  };

  const toggleDropdown = () => {
    const next = !dropdownOpen;
    setDropdownOpen(next);
    if (next) {
      fetchAndFilterNotifications();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="relative p-2 rounded-full bg-white hover:bg-gray-100 transition"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        {notifications.length > 0 && (
          <motion.div
            className="absolute top-1 right-1"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              repeat: Infinity,
              repeatType: "mirror",
              duration: 0.8,
            }}
          >
            <Circle className="w-3 h-3 text-red-500" fill="red" />
          </motion.div>
        )}
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 shadow-lg rounded-lg z-50">
          <div className="p-3 max-h-80 overflow-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-500 text-center">
                새 알림이 없어요
              </p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="text-sm text-gray-800 py-2 border-b last:border-none"
                >
                  <div>{n.message}</div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleAccept(n)}
                      className="flex-1 text-xs bg-green-100 hover:bg-green-200 rounded px-2 py-1 text-green-700"
                    >
                      수락
                    </button>
                    <button
                      onClick={() => handleReject(n)}
                      className="flex-1 text-xs bg-red-100 hover:bg-red-200 rounded px-2 py-1 text-red-700"
                    >
                      거절
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="text-center text-sm text-blue-600 py-2 hover:underline cursor-pointer">
            전체 보기
          </div>
        </div>
      )}
    </div>
  );
}
