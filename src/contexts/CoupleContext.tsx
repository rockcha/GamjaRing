// src/contexts/CoupleContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "./UserContext";
import { sendNotification } from "@/utils/SendNotification";

interface Couple {
  id: string;
  user1_id: string;
  user2_id: string;
  started_at: string;
  created_at: string;
}

interface CoupleRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
}

interface CoupleContextType {
  couple: Couple | null;
  isCoupled: boolean;
  partnerId: string | null;
  fetchCoupleData: () => Promise<void>;
  connectToPartner: (nickname: string) => Promise<{ error: Error | null }>;
  disconnectCouple: () => Promise<{ error: Error | null }>;
  requestCouple: (nickname: string) => Promise<{ error: Error | null }>;
  fetchIncomingRequests: () => Promise<CoupleRequest[]>;
  acceptRequest: (requestId: string) => Promise<{ error: Error | null }>;
  rejectRequest: (requestId: string) => Promise<{ error: Error | null }>;
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

    const { data: receiver, error: findError } = await supabase
      .from("users")
      .select("id, nickname")
      .eq("nickname", nickname)
      .maybeSingle();

    if (findError || !receiver)
      return { error: new Error("상대방을 찾을 수 없습니다.") };

    const { data: existing } = await supabase
      .from("couple_requests")
      .select("id")
      .eq("sender_id", user.id)
      .eq("receiver_id", receiver.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) return { error: new Error("이미 요청을 보냈습니다.") };

    const { error: insertError } = await supabase
      .from("couple_requests")
      .insert({ sender_id: user.id, receiver_id: receiver.id });

    if (!insertError) {
      await sendNotification({
        toUserId: receiver.id,
        fromUserId: user.id,
        type: "커플요청",
        partnerNickname: user.nickname,
      });
    }

    return { error: insertError ?? null };
  };

  const fetchIncomingRequests = async () => {
    if (!user) return [];
    const { data, error } = await supabase
      .from("couple_requests")
      .select("*")
      .eq("receiver_id", user.id)
      .eq("status", "pending");
    return error || !data ? [] : data;
  };

  const acceptRequest = async (requestId: string) => {
    if (!user) return { error: new Error("로그인 필요") };

    const { data: requestData, error: requestError } = await supabase
      .from("couple_requests")
      .select("sender_id")
      .eq("id", requestId)
      .maybeSingle();

    if (requestError || !requestData)
      return { error: new Error("요청을 찾을 수 없습니다.") };

    const senderId = requestData.sender_id;

    // 커플 연결
    const { error: coupleError } = await connectToPartnerById(senderId);
    if (coupleError) return { error: coupleError };

    // 상태 업데이트 + 요청 삭제
    await Promise.all([
      supabase
        .from("couple_requests")
        .update({ status: "accepted" })
        .eq("id", requestId),
      supabase.from("couple_requests").delete().eq("id", requestId),
    ]);

    // 알림 전송
    await sendNotification({
      toUserId: senderId,
      fromUserId: user.id,
      type: "커플수락",
      partnerNickname: user.nickname,
    });

    return { error: null };
  };

  const rejectRequest = async (requestId: string) => {
    if (!user) return { error: new Error("로그인 필요") };

    const { data: requestData, error: requestError } = await supabase
      .from("couple_requests")
      .select("sender_id")
      .eq("id", requestId)
      .maybeSingle();

    if (requestError || !requestData)
      return { error: new Error("요청을 찾을 수 없습니다.") };

    const senderId = requestData.sender_id;

    // 상태 업데이트 + 요청 삭제
    await Promise.all([
      supabase
        .from("couple_requests")
        .update({ status: "rejected" })
        .eq("id", requestId),
      supabase.from("couple_requests").delete().eq("id", requestId),
    ]);

    // 알림 전송
    await sendNotification({
      toUserId: senderId,
      fromUserId: user.id,
      type: "커플거절",
      partnerNickname: user.nickname,
    });

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
