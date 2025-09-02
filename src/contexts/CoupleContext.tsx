// src/contexts/CoupleContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "./UserContext";

import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import { deleteUserNotification } from "@/utils/notification/deleteUserNotification";
import { getUserNotifications } from "@/utils/notification/getUserNotifications";

import { createCouplePoints } from "@/utils/tasks/CreateCouplePoints";
import { CreateTaskTable } from "@/utils/tasks/CreateTaskTable";
import { deleteUserDailyTask } from "@/utils/tasks/DeleteDailyTask";
import { DeleteUserAnswers } from "@/utils/DeleteUserAnswers";

interface Couple {
  id: string;
  user1_id: string;
  user2_id: string;
  started_at: string;
  created_at: string;
  gold: number; // ✅ 추가
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

  // ✅ gold 전역 사용/갱신
  gold: number;
  addGold: (amount: number) => Promise<{ error: Error | null }>;
  spendGold: (amount: number) => Promise<{ error: Error | null }>;
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

  const gold = couple?.gold ?? 0; // ✅ 파생값

  const fetchCoupleData = async () => {
    if (!user?.couple_id) return setCouple(null);
    const { data, error } = await supabase
      .from("couples")
      .select("id,user1_id,user2_id,started_at,created_at,gold") // ✅ gold 포함
      .eq("id", user.couple_id)
      .maybeSingle();

    if (!error && data) setCouple(data as Couple);
  };

  type ConnectResult = { error: Error | null; couple?: Couple };

  const connectToPartnerById = async (
    partnerId: string
  ): Promise<ConnectResult> => {
    if (!user?.id) return { error: new Error("로그인 상태가 아닙니다.") };

    // 0) 오늘 날짜(YYYY-MM-DD)
    const today = new Date().toLocaleDateString("sv-SE");

    // 1) 이미 커플인지 검사
    const { data: existing, error: checkError } = await supabase
      .from("couples")
      .select("id")
      .or(
        `and(user1_id.eq.${user.id},user2_id.eq.${partnerId}),and(user1_id.eq.${partnerId},user2_id.eq.${user.id})`
      )
      .maybeSingle();

    if (checkError) return { error: new Error(checkError.message) };
    if (existing) return { error: new Error("이미 연결된 커플입니다.") };

    // 2) 커플 생성 (초기 gold = 200)
    const { data: coupleRow, error: coupleError } = await supabase
      .from("couples")
      .insert({
        user1_id: user.id,
        user2_id: partnerId,
        started_at: today,
        gold: 200, // ✅ 초기 골드
      })
      .select("*")
      .single();

    if (coupleError || !coupleRow) {
      return { error: new Error(coupleError?.message ?? "커플 생성 실패") };
    }

    const coupleId = coupleRow.id as string;

    // 3) 두 사용자(users) 연결 — 병렬 처리
    const [u1, u2] = await Promise.all([
      supabase
        .from("users")
        .update({ couple_id: coupleId, partner_id: partnerId })
        .eq("id", user.id),
      supabase
        .from("users")
        .update({ couple_id: coupleId, partner_id: user.id })
        .eq("id", partnerId),
    ]);
    if (u1.error) return { error: new Error(u1.error.message) };
    if (u2.error) return { error: new Error(u2.error.message) };

    // 4) couple_points 생성
    await createCouplePoints(coupleId);

    // 5) 상태 동기화
    fetchUser(); // UI 동기화용
    setCouple(coupleRow as Couple);
    await fetchCoupleData();

    return { error: null, couple: coupleRow as Couple };
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

  // ✅ gold 서버 업데이트 유틸
  async function updateGoldOnServer(coupleId: string, newGold: number) {
    return supabase
      .from("couples")
      .update({ gold: newGold })
      .eq("id", coupleId);
  }

  const addGold = async (amount: number) => {
    try {
      if (!couple?.id) return { error: new Error("커플 정보가 없습니다.") };

      const prev = couple.gold ?? 0;
      let next = prev + amount;

      // ✅ 음수 방지 (최소 0)
      if (next < 0) next = 0;

      // 낙관적 업데이트
      setCouple({ ...couple, gold: next });

      const { error } = await updateGoldOnServer(couple.id, next);
      if (error) {
        // 롤백
        setCouple({ ...couple, gold: prev });
        return { error: new Error(error.message) };
      }
      return { error: null };
    } catch (e: any) {
      return { error: e };
    }
  };

  const spendGold = async (amount: number) => {
    try {
      if (!couple?.id) return { error: new Error("커플 정보가 없습니다.") };
      if (amount <= 0)
        return { error: new Error("양수만 사용할 수 있습니다.") };

      const prev = couple.gold ?? 0;
      if (prev < amount) return { error: new Error("골드가 부족합니다.") };

      const next = prev - amount;

      // 낙관적 업데이트
      setCouple({ ...couple, gold: next });
      const { error } = await updateGoldOnServer(couple.id, next);
      if (error) {
        setCouple({ ...couple, gold: prev }); // 롤백
        return { error: new Error(error.message) };
      }
      return { error: null };
    } catch (e: any) {
      return { error: e };
    }
  };

  const disconnectCouple = async () => {
    if (!user?.id || !user.couple_id) {
      return { error: new Error("커플 아이디 존재하지않음") };
    }

    // ✅ 0) 스냅샷: 나/커플ID/파트너ID 확보
    const coupleId = user.couple_id;

    // partnerId가 컨텍스트에 없다면 couples에서 조회해서 확보
    let partner = user.partner_id ?? null;
    if (!partner) {
      const { data: coupleRow, error: coupleFetchErr } = await supabase
        .from("couples")
        .select("user1_id, user2_id")
        .eq("id", coupleId)
        .maybeSingle();

      if (coupleFetchErr) {
        console.error("❌ couples 조회 실패:", coupleFetchErr.message);
        return { error: coupleFetchErr };
      }
      if (!coupleRow) {
        console.error("❌ couples 레코드를 찾을 수 없습니다.");
        return { error: new Error("couples 레코드를 찾을 수 없습니다.") };
      }

      partner =
        coupleRow.user1_id === user.id
          ? coupleRow.user2_id
          : coupleRow.user1_id;
    }

    const idsToClear = [user.id, partner].filter(Boolean) as string[];

    // 1) couple_points 삭제
    const { error: pointsError } = await supabase
      .from("couple_points")
      .delete()
      .eq("couple_id", coupleId);
    if (pointsError) return { error: pointsError };

    // 2) 두 유저 couple_id/partner_id 초기화
    const { error: upErr } = await supabase
      .from("users")
      .update({ couple_id: null, partner_id: null })
      .in("id", idsToClear);
    if (upErr) return { error: upErr };

    // 3) Daily_Task 삭제 (나와 파트너)
    const { error: myDeleteErr } = await deleteUserDailyTask(user.id);
    if (myDeleteErr) alert(`내 task 삭제 실패: ${myDeleteErr.message}`);

    if (partner) {
      const { error: partnerDeleteErr } = await deleteUserDailyTask(partner);
      if (partnerDeleteErr)
        alert(`상대 task 삭제 실패: ${partnerDeleteErr.message}`);
    }

    // 4) 커플 레코드 삭제
    const { error: delErr } = await supabase
      .from("couples")
      .delete()
      .eq("id", coupleId);
    if (delErr) return { error: delErr };

    // 5) 답변 삭제
    const { error: myAnsErr } = await DeleteUserAnswers(user.id);
    if (myAnsErr) console.error("❌ 내 답변 삭제 실패:", myAnsErr.message);

    if (partner) {
      const { error: partnerAnsErr } = await DeleteUserAnswers(partner);
      if (partnerAnsErr)
        console.error("❌ 파트너 답변 삭제 실패:", partnerAnsErr.message);
    }

    // 6) 로컬 상태 초기화
    await fetchUser();
    setCouple(null);

    open("커플관계를 끊었습니다");
    return { error: null };
  };

  const requestCouple = async (nickname: string) => {
    if (!user) return { error: new Error("로그인 필요") };
    if (isCoupled)
      return { error: new Error("이미 커플 상태입니다.. 바람피지마세요") };

    // 상대방 유저 조회
    const { data: receiver, error } = await supabase
      .from("users")
      .select("id, partner_id")
      .eq("nickname", nickname)
      .maybeSingle();
    if (error || !receiver)
      return { error: new Error("상대방을 찾을 수 없습니다.") };

    if (receiver.id === user.id)
      return { error: new Error("자기 자신에게 요청할 수 없습니다.") };
    if (receiver.partner_id)
      return { error: new Error("상대방은 이미 커플입니다.") };

    // ✅ 나에게 온 알림 / 내가 보낸 알림
    const { data: receivedNotifications } = await getUserNotifications(user.id);
    const { data: sentNotifications } = await getUserNotifications(receiver.id);

    const alreadySent = sentNotifications?.some(
      (n) =>
        n.sender_id === user.id &&
        n.receiver_id === receiver.id &&
        n.type === "커플요청" &&
        Boolean(n.is_request) === true
    );
    if (alreadySent) return { error: new Error("이미 요청을 보냈습니다.") };

    const alreadyReceived = receivedNotifications?.some(
      (n) =>
        n.sender_id === receiver.id &&
        n.receiver_id === user.id &&
        n.type === "커플요청" &&
        Boolean(n.is_request) === true
    );
    if (alreadyReceived)
      return {
        error: new Error("상대방이 이미 당신에게 커플 요청을 보냈습니다."),
      };

    // ✅ 커플 요청 알림 전송
    await sendUserNotification({
      senderId: user.id,
      receiverId: receiver.id,
      type: "커플요청",
      description: `${user.nickname}님이 커플 요청을 보냈어요 💌`,
      isRequest: true,
    });
    open("커플 요청 전송 완료");
    return { error: null };
  };

  const fetchIncomingRequests = async () => {
    if (!user) return [];
    const { data, error } = await getUserNotifications(user.id);
    return error || !data ? [] : data.filter((n) => n.is_request);
  };

  const acceptRequest = async (notificationId: string) => {
    if (!user) return { error: new Error("로그인 필요") };

    // 🔍 notificationId로 상대(sender)를 조회
    const { data: notificationData, error: fetchError } = await supabase
      .from("user_notification")
      .select("sender_id")
      .eq("id", notificationId)
      .maybeSingle();
    if (fetchError || !notificationData)
      return { error: new Error("알림을 찾을 수 없습니다.") };

    const partnerId = notificationData.sender_id;
    if (user?.id === partnerId)
      return { error: new Error("자기 자신과는 커플을 맺을 수 없습니다.") };

    // 1) 커플 연결
    const { error: connectError, couple } = await connectToPartnerById(
      partnerId
    );
    if (connectError) return { error: connectError };
    if (!couple?.id)
      return {
        error: new Error("커플 ID가 존재하지 않아 task를 생성할 수 없습니다"),
      };

    // 비동기 업데이트때문에 직접 상태 주입
    setCouple(couple);

    // 2) task 생성
    const { error: taskError } = await CreateTaskTable({
      userId: user.id,
      coupleId: couple.id,
    });
    if (taskError) return { error: taskError };

    // 3) 수락 알림 전송 & 기존 요청 삭제
    await sendUserNotification({
      senderId: user.id,
      receiverId: partnerId,
      type: "커플수락",
      description: `${user.nickname}님이 커플 요청을 수락했어요! 💘`,
      isRequest: false,
    });
    await deleteUserNotification(notificationId);

    open("커플이 되었습니다!");
    return { error: null };
  };

  const rejectRequest = async (notificationId: string) => {
    if (!user) return { error: new Error("로그인 필요") };

    const { data: notificationData, error: fetchError } = await supabase
      .from("user_notification")
      .select("sender_id")
      .eq("id", notificationId)
      .maybeSingle();
    if (fetchError || !notificationData)
      return { error: new Error("알림을 찾을 수 없습니다.") };

    const senderId = notificationData.sender_id;

    await sendUserNotification({
      senderId: user.id,
      receiverId: senderId,
      type: "커플거절",
      description: `${user.nickname}님이 커플 요청을 거절했어요 🙅`,
      isRequest: false,
    });

    await deleteUserNotification(notificationId);
    return { error: null };
  };

  useEffect(() => {
    if (user?.couple_id) fetchCoupleData();
    else setCouple(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

        // gold
        gold,
        addGold,
        spendGold,
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
