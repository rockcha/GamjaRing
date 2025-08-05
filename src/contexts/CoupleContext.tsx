// src/contexts/CoupleContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "./UserContext";

interface Couple {
  id: string;
  user1_id: string;
  user2_id: string;
  started_at: string; // ISO 날짜 문자열
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
  acceptRequest: (
    requestId: string,
    senderId: string
  ) => Promise<{ error: Error | null }>;
  rejectRequest: (requestId: string) => Promise<{ error: Error | null }>;
}

const CoupleContext = createContext<CoupleContextType | undefined>(undefined);

export const CoupleProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, fetchUser } = useUser();
  const [couple, setCouple] = useState<Couple | null>(null);

  const isCoupled = !!couple;
  const partnerId: string | null =
    user?.id === couple?.user1_id
      ? couple?.user2_id ?? null
      : couple?.user1_id ?? null;

  const fetchCoupleData = async () => {
    if (!user?.couple_id) {
      setCouple(null);
      return;
    }

    const { data, error } = await supabase
      .from("couples")
      .select("*")
      .eq("id", user.couple_id)
      .maybeSingle();

    if (!error && data) {
      setCouple(data as Couple);
    }
  };

  const connectToPartner = async (nickname: string) => {
    const { data: partnerUser, error: findError } = await supabase
      .from("users")
      .select("id")
      .eq("nickname", nickname)
      .maybeSingle();

    if (findError || !partnerUser)
      return { error: new Error("상대방을 찾을 수 없습니다.") };

    const partnerId = partnerUser.id;

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

    await supabase
      .from("users")
      .update({ couple_id: coupleData.id, partner_id: partnerId })
      .eq("id", user?.id);
    await supabase
      .from("users")
      .update({ couple_id: coupleData.id, partner_id: user?.id })
      .eq("id", partnerId);

    await fetchUser();
    await fetchCoupleData();

    return { error: null };
  };

  const disconnectCouple = async () => {
    if (!user?.couple_id) return { error: null };

    const coupleId = user.couple_id;
    const partner = partnerId;

    await supabase
      .from("users")
      .update({ couple_id: null, partner_id: null })
      .eq("id", user.id);
    if (partner) {
      await supabase
        .from("users")
        .update({ couple_id: null, partner_id: null })
        .eq("id", partner);
    }

    await supabase.from("couples").delete().eq("id", coupleId);

    await fetchUser();
    setCouple(null);

    return { error: null };
  };

  const requestCouple = async (nickname: string) => {
    console.log("user in requestCouple", user);
    if (!user) return { error: new Error("로그인 필요") };
    if (isCoupled) return { error: new Error("이미 커플 상태입니다") };

    const { data: receiver, error: findError } = await supabase
      .from("users")
      .select("id")
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
      .insert({
        sender_id: user.id,
        receiver_id: receiver.id,
      });

    return { error: insertError ?? null };
  };

  const fetchIncomingRequests = async (): Promise<CoupleRequest[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from("couple_requests")
      .select("*")
      .eq("receiver_id", user.id)
      .eq("status", "pending");

    return error || !data ? [] : data;
  };

  const acceptRequest = async (requestId: string, senderId: string) => {
    if (!user) return { error: new Error("로그인 필요") };

    const { data: coupleData, error: coupleError } = await supabase
      .from("couples")
      .insert({
        user1_id: senderId,
        user2_id: user.id,
        started_at: new Date().toISOString().split("T")[0],
      })
      .select()
      .single();

    if (coupleError || !coupleData) return { error: coupleError };

    await supabase
      .from("users")
      .update({ couple_id: coupleData.id, partner_id: senderId })
      .eq("id", user.id);
    await supabase
      .from("users")
      .update({ couple_id: coupleData.id, partner_id: user.id })
      .eq("id", senderId);

    await supabase
      .from("couple_requests")
      .update({ status: "accepted" })
      .eq("id", requestId);

    await fetchUser();
    await fetchCoupleData();

    return { error: null };
  };

  const rejectRequest = async (requestId: string) => {
    const { error } = await supabase
      .from("couple_requests")
      .update({ status: "rejected" })
      .eq("id", requestId);

    return { error };
  };

  useEffect(() => {
    if (user?.couple_id) {
      fetchCoupleData();
    } else {
      setCouple(null);
    }
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
