// src/contexts/CoupleContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "./UserContext";
import { sendUserNotification } from "@/utils/notifications/sendUserNotification";
import { deleteUserNotification } from "@/utils/notifications/deleteUserNotification";
import { getUserNotifications } from "@/utils/notifications/getUserNotifications";

interface Couple {
  id: string;
  user1_id: string;
  user2_id: string;
  started_at: string;
  created_at: string;
}

interface UserNotification {
  id: string;
  sender_id: string;
  receiver_id: string;
  type: string;
  description: string;
  created_at: string;
  is_request: boolean;
}

interface CoupleContextType {
  couple: Couple | null;
  isCoupled: boolean;
  partnerId: string | null;
  fetchCoupleData: () => Promise<void>;
  connectToPartner: (nickname: string) => Promise<{ error: Error | null }>;
  disconnectCouple: () => Promise<{ error: Error | null }>;
  requestCouple: (nickname: string) => Promise<{ error: Error | null }>;
  fetchIncomingRequests: () => Promise<UserNotification[]>;
  acceptRequest: (notificationId: string) => Promise<{ error: Error | null }>;
  rejectRequest: (notificationId: string) => Promise<{ error: Error | null }>;
}

const CoupleContext = createContext<CoupleContextType | undefined>(undefined);

export const CoupleProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, fetchUser } = useUser();
  const [couple, setCouple] = useState<Couple | null>(null);

  const isCoupled = !!couple;
  const partnerId =
    user?.id === couple?.user1_id
      ? couple?.user2_id ?? null
      : couple?.user1_id ?? null;

  const fetchCoupleData = async () => {
    if (!user?.couple_id) return setCouple(null);
    const { data, error } = await supabase
      .from("couples")
      .select("*")
      .eq("id", user.couple_id)
      .maybeSingle();
    if (!error && data) setCouple(data as Couple);
  };

  const connectToPartnerById = async (partnerId: string) => {
    const { data: coupleData, error: coupleError } = await supabase
      .from("couples")
      .insert({
        user1_id: user?.id,
        user2_id: partnerId,
        started_at: new Date().toISOString().split("T")[0],
      })
      .select()
      .single();

    if (coupleError || !coupleData) return { error: coupleError };

    await Promise.all([
      supabase
        .from("users")
        .update({ couple_id: coupleData.id, partner_id: partnerId })
        .eq("id", user?.id),
      supabase
        .from("users")
        .update({ couple_id: coupleData.id, partner_id: user?.id })
        .eq("id", partnerId),
    ]);

    await fetchUser();
    await fetchCoupleData();
    return { error: null };
  };

  const connectToPartner = async (nickname: string) => {
    const { data: partnerUser, error: findError } = await supabase
      .from("users")
      .select("id")
      .eq("nickname", nickname)
      .maybeSingle();

    if (findError || !partnerUser)
      return { error: new Error("상대방을 찾을 수 없습니다.") };
    return await connectToPartnerById(partnerUser.id);
  };

  const disconnectCouple = async () => {
    if (!user?.couple_id) return { error: null };
    await Promise.all([
      supabase
        .from("users")
        .update({ couple_id: null, partner_id: null })
        .eq("id", user.id),
      partnerId &&
        supabase
          .from("users")
          .update({ couple_id: null, partner_id: null })
          .eq("id", partnerId),
      supabase.from("couples").delete().eq("id", user.couple_id),
    ]);
    await fetchUser();
    setCouple(null);
    return { error: null };
  };

  const requestCouple = async (nickname: string) => {
    if (!user) return { error: new Error("로그인 필요") };
    if (isCoupled) return { error: new Error("이미 커플 상태입니다") };

    const { data: receiver, error } = await supabase
      .from("users")
      .select("id")
      .eq("nickname", nickname)
      .maybeSingle();

    if (error || !receiver)
      return { error: new Error("상대방을 찾을 수 없습니다.") };

    // 중복 확인
    const { data: existing } = await getUserNotifications(receiver.id);
    const duplicate = existing?.some(
      (n) =>
        n.sender_id === user.id &&
        n.receiver_id === receiver.id &&
        n.type === "커플요청" &&
        n.is_request
    );
    if (duplicate) return { error: new Error("이미 요청을 보냈습니다.") };

    await sendUserNotification({
      senderId: user.id,
      receiverId: receiver.id,
      type: "커플요청",
      description: `${user.nickname}님이 커플 요청을 보냈어요 💌`,
      isRequest: true,
    });

    return { error: null };
  };

  const fetchIncomingRequests = async () => {
    if (!user) return [];
    const { data, error } = await getUserNotifications(user.id);
    return error || !data ? [] : data.filter((n) => n.is_request);
  };

  //요청 수락
  const acceptRequest = async (notificationId: string) => {
    if (!user) return { error: new Error("로그인 필요") };

    // 🔍 notificationId로 상대방(receiver)을 조회
    const { data: notificationData, error: fetchError } = await supabase
      .from("user_notification")
      .select("sender_id")
      .eq("id", notificationId)
      .maybeSingle();

    if (fetchError || !notificationData)
      return { error: new Error("알림을 찾을 수 없습니다.") };

    const partnerId = notificationData.sender_id;

    if (user?.id === partnerId) {
      return { error: new Error("자기 자신과는 커플을 맺을 수 없습니다.") };
    }

    // ✅ 커플 연결
    const { error: coupleError } = await connectToPartnerById(partnerId);
    if (coupleError) return { error: coupleError };

    // ✅ 수락 알림 전송
    await sendUserNotification({
      senderId: user.id,
      receiverId: partnerId,
      type: "커플수락",
      description: `${user.nickname}님이 커플 요청을 수락했어요! 💘`,
      isRequest: false,
    });

    // ✅ 기존 요청 알림 삭제
    await deleteUserNotification(notificationId);

    return { error: null };
  };

  const rejectRequest = async (notificationId: string) => {
    if (!user) return { error: new Error("로그인 필요") };

    // 🔍 notificationId로 상대방(receiver)을 조회
    const { data: notificationData, error: fetchError } = await supabase
      .from("user_notification")
      .select("sender_id")
      .eq("id", notificationId)
      .maybeSingle();

    if (fetchError || !notificationData)
      return { error: new Error("알림을 찾을 수 없습니다.") };

    const senderId = notificationData.sender_id;

    // ✅ 거절 알림 전송
    await sendUserNotification({
      senderId: user.id,
      receiverId: senderId,
      type: "커플거절",
      description: `${user.nickname}님이 커플 요청을 거절했어요 🙅`,
      isRequest: false,
    });

    // ✅ 기존 요청 알림 삭제
    await deleteUserNotification(notificationId);

    return { error: null };
  };

  useEffect(() => {
    if (user?.couple_id) fetchCoupleData();
    else setCouple(null);
  }, [user?.couple_id]);

  return (
    <CoupleContext.Provider
      value={{
        couple,
        isCoupled,
        partnerId,
        fetchCoupleData,
        connectToPartner,
        disconnectCouple,
        requestCouple,
        fetchIncomingRequests,
        acceptRequest,
        rejectRequest,
      }}
    >
      {children}
    </CoupleContext.Provider>
  );
};

export const useCoupleContext = () => {
  const ctx = useContext(CoupleContext);
  if (!ctx)
    throw new Error("useCoupleContext must be used within a CoupleProvider");
  return ctx;
};
