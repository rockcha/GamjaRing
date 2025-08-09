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
import { useToast } from "./ToastContext";
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
  const { open } = useToast();

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

  type Couple = {
    id: string;
    user1_id: string;
    user2_id: string;
    started_at: string;
    created_at: string;
  };

  type ConnectResult = { error: Error | null; couple?: Couple };

  const connectToPartnerById = async (
    partnerId: string
  ): Promise<ConnectResult> => {
    if (!user?.id) return { error: new Error("로그인 상태가 아닙니다.") };

    // 0) 오늘 날짜(YYYY-MM-DD)
    const today = new Date().toISOString().slice(0, 10);

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

    // 2) 커플 생성 + 생성된 행 반환
    const { data: coupleRow, error: coupleError } = await supabase
      .from("couples")
      .insert({
        user1_id: user.id,
        user2_id: partnerId,
        started_at: today,
      })
      .select("*")
      .single();

    if (coupleError || !coupleRow) {
      return { error: new Error(coupleError?.message ?? "커플 생성 실패") };
    }
    console.log("✅ couple row 생성완료!");
    const coupleId = coupleRow.id;

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
    console.log("✅ 두 user 데이터 연결 완료!");

    // 4) couple_points 생성
    await createCouplePoints(coupleId);

    // 5) 상태 동기화는 부수효과로 하되, 로직은 반환값 기반으로 진행
    fetchUser(); // await 굳이 안 걸어도 OK (UI 동기화용)
    fetchCoupleData();
    setCouple(coupleRow);

    // ✅ 새로 만든 커플 데이터 반환
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

  const disconnectCouple = async () => {
    if (!user?.id || !user.couple_id) {
      return { error: new Error("커플 아이디 존재하지않음") };
    }

    // ✅ 0) 스냅샷: 나/커플ID/파트너ID 확보
    const coupleId = user.couple_id;

    // partnerId가 컨텍스트에 없다면 couples에서 조회해서 확보
    let partnerId = user.partner_id ?? null;
    if (!partnerId) {
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

      partnerId =
        coupleRow.user1_id === user.id
          ? coupleRow.user2_id
          : coupleRow.user1_id;
    }

    const idsToClear = [user.id, partnerId].filter(Boolean) as string[];

    // 1) couple_points 먼저 삭제
    const { error: pointsError } = await supabase
      .from("couple_points")
      .delete()
      .eq("couple_id", coupleId);

    if (pointsError) {
      console.error(
        "❌ 커플 끊기: couple_points 삭제 실패:",
        pointsError.message
      );
      return { error: pointsError };
    }
    console.log("✅ 커플 끊기: couple_points 삭제 완료");

    // 2) 두 유저의 couple_id/partner_id null 처리 (동시에)
    const { error: upErr } = await supabase
      .from("users")
      .update({ couple_id: null, partner_id: null })
      .in("id", idsToClear);

    if (upErr) {
      console.error("❌ 사용자 업데이트 실패:", upErr.message);
      return { error: upErr };
    }
    console.log("✅ 커플 끊기: users 업데이트 완료");

    //3) Daily_Task 삭제 (나와 파트너 모두)

    const { error: UserDelteError } = await deleteUserDailyTask(user.id);
    if (UserDelteError) {
      // 삭제 실패 처리
      alert(`내 task 삭제 실패: ${UserDelteError.message}`);
    }

    const { error: PartnerDelteError } = await deleteUserDailyTask(coupleId);
    if (PartnerDelteError) {
      // 삭제 실패 처리
      alert(`상대 task 삭제 실패: ${PartnerDelteError.message}`);
    }

    // 4) 커플 레코드 삭제
    const { error: delErr } = await supabase
      .from("couples")
      .delete()
      .eq("id", coupleId);

    if (delErr) {
      console.error("❌커플 끊기: couples 삭제 실패:", delErr.message);
      return { error: delErr };
    }
    console.log("✅ 커플 끊기: couples 삭제 완료");

    //5) 답변들 삭제
    const { error: myError, deletedCount: myDC } = await DeleteUserAnswers(
      user.id
    );
    if (myError) {
      console.error("❌ 내 답변 삭제 실패:", myError.message);
    } else {
      console.log(`✅ 내 답변 ${myDC}개 삭제 완료`);
    }
    const { error: partnerError, deletedCount: partnerDC } =
      await DeleteUserAnswers(coupleId);
    if (partnerError) {
      console.error("❌ 파트너 답변 삭제 실패:", partnerError.message);
    } else {
      console.log(`✅ 파트너 답변 ${partnerDC}개 삭제 완료`);
    }

    // 6) 로컬 상태 초기화
    await fetchUser(); // 내 user 컨텍스트 새로고침
    await fetchCoupleData?.(); // 있으면 커플 컨텍스트 새로고침
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

    if (error || !receiver) {
      return { error: new Error("상대방을 찾을 수 없습니다.") };
    }

    // 본인에게 요청하는 경우 방지
    if (receiver.id === user.id) {
      return { error: new Error("자기 자신에게 요청할 수 없습니다.") };
    }

    // 상대방이 이미 커플인지 확인
    if (receiver.partner_id) {
      return { error: new Error("상대방은 이미 커플입니다.") };
    }

    // ✅ 나에게 온 알림 조회
    const { data: receivedNotifications } = await getUserNotifications(user.id);

    // ✅ 내가 보낸 알림 조회
    const { data: sentNotifications } = await getUserNotifications(receiver.id);

    // ✅ 내가 이미 보낸 요청 여부 확인
    const alreadySent = sentNotifications?.some(
      (n) =>
        n.sender_id === user.id &&
        n.receiver_id === receiver.id &&
        n.type === "커플요청" &&
        Boolean(n.is_request) === true
    );
    if (alreadySent) {
      return { error: new Error("이미 요청을 보냈습니다.") };
    }

    // ✅ 상대방이 나에게 요청한 상태인지 확인
    const alreadyReceived = receivedNotifications?.some(
      (n) =>
        n.sender_id === receiver.id &&
        n.receiver_id === user.id &&
        n.type === "커플요청" &&
        Boolean(n.is_request) === true
    );
    if (alreadyReceived) {
      return {
        error: new Error("상대방이 이미 당신에게 커플 요청을 보냈습니다."),
      };
    }

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

    // ✅ 커플 연결 + task 생성 (inline)
    type OpResult = { error: Error | null };

    // 1) 커플 연결
    const { error: connectError, couple } = await connectToPartnerById(
      partnerId
    );
    if (connectError) return { error: connectError };

    if (!couple?.id) {
      return {
        error: new Error("커플 ID가 존재하지 않아 task를 생성할 수 없습니다"),
      };
    }
    //비동기 업데이트때문에 직접하기.
    setCouple(couple);

    // 2) task 생성
    if (!user) return { error: new Error("로그인 필요") };
    const { error: taskError } = await CreateTaskTable({
      userId: user.id,
      coupleId: couple.id, // ← 반환된 couple 사용(상태 의존 X)
    });
    if (taskError) return { error: taskError };

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

    open("커플이 되었습니다!");
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
