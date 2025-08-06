import { useEffect, useState } from "react";
import { Bell, Circle } from "lucide-react";
import { motion } from "framer-motion";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { getUserNotifications } from "@/utils/notifications/getUserNotifications";
import { deleteUserNotification } from "@/utils/notifications/deleteUserNotification";
import type { NotificationType } from "@/types/notificationType";

interface Notification {
  id: string;
  type: NotificationType;
  created_at: string;
  description: string;
  sender_id: string;
  receiver_id: string;
  is_request: boolean;
}

export default function NotificationButton() {
  const { user } = useUser();
  const { acceptRequest, rejectRequest } = useCoupleContext();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasUnread, setHasUnread] = useState(false); // ✅ 빨간 점 표시 여부

  // ✅ 알림 가져오기
  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await getUserNotifications(user.id);
    if (data) {
      setNotifications(data);
      setHasUnread(data.length > 0); // 빨간 점 표시
    }
  };

  // ✅ 드롭다운 열기 토글
  const toggleDropdown = () => {
    const next = !dropdownOpen;
    setDropdownOpen(next);
    if (next) {
      fetchNotifications(); // 열릴 때마다 최신 알림 조회
      setHasUnread(false); // 열었으니 읽음 처리
    }
  };

  // ✅ 커플요청 수락
  const handleAccept = async (n: Notification) => {
    await acceptRequest(n.id);
    await deleteUserNotification(n.id);
    setNotifications((prev) => prev.filter((noti) => noti.id !== n.id));
  };

  // ✅ 커플요청 거절
  const handleReject = async (n: Notification) => {
    await rejectRequest(n.id);
    await deleteUserNotification(n.id);
    setNotifications((prev) => prev.filter((noti) => noti.id !== n.id));
  };

  // ✅ 일반 알림 클릭 시 삭제 및 상태 제거
  const handleGeneralNotificationClick = async (n: Notification) => {
    await deleteUserNotification(n.id);
    setNotifications((prev) => prev.filter((noti) => noti.id !== n.id));
  };

  // ✅ 마운트 시 알림 확인 (자동 반영)
  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 5000); // 5초마다 새로고침

      return () => clearInterval(interval);
    }
  }, [user?.id]);

  return (
    <div className="relative">
      {/* 버튼 */}
      <button
        onClick={toggleDropdown}
        className="relative p-2 rounded-full bg-white hover:bg-gray-100 transition"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        {hasUnread && (
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

      {/* 드롭다운 */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 shadow-lg rounded-lg z-50">
          <div className="p-3 max-h-80 overflow-auto">
            {notifications.length > 0 && (
              <p className="text-xs text-gray-400 text-right mb-2">
                📌 알림 클릭 시 삭제됩니다
              </p>
            )}
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
                  {!n.is_request ? (
                    <div
                      onClick={() => handleGeneralNotificationClick(n)}
                      className="cursor-pointer hover:text-blue-600 transition"
                    >
                      {n.description}
                    </div>
                  ) : (
                    <>
                      <div>{n.description}</div>
                      {n.type === "커플요청" && (
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
                      )}
                    </>
                  )}
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
