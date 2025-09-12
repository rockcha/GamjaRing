// src/contexts/CoupleContext.tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import supabase from "@/lib/supabase";
import { useUser } from "./UserContext";

import { toast } from "sonner";

import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import { deleteUserNotification } from "@/utils/notification/deleteUserNotification";
import { getUserNotifications } from "@/utils/notification/getUserNotifications";

import { createCouplePoints } from "@/utils/tasks/CreateCouplePoints";
import { CreateTaskTable } from "@/utils/tasks/CreateTaskTable";
import { deleteUserDailyTask } from "@/utils/tasks/DeleteDailyTask";
import { DeleteUserAnswers } from "@/utils/DeleteUserAnswers";

// ✅ 감자 개수 조회 유틸
import { getPotatoCount } from "@/features/potato_field/utils";

interface Couple {
  id: string;
  user1_id: string;
  user2_id: string;
  started_at: string;
  created_at: string;
  gold: number;
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

  // gold
  gold: number;
  addGold: (amount: number) => Promise<{ error: Error | null }>;
  spendGold: (amount: number) => Promise<{ error: Error | null }>;
  /** (옵션) 빠른 체감용 낙관적 업데이트 */
  mutateGold: (delta: number) => void;

  // potato (전역)
  potatoCount: number;
  setPotatoCount: (n: number) => void; // 필요 시 외부 낙관적 갱신
  refreshPotatoCount: () => Promise<void>; // 강제 최신화

  spendPotatoes: (amount: number) => Promise<{ error: Error | null }>;
  addPotatoes?: (amount: number) => Promise<{ error: Error | null }>;
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

  const gold = couple?.gold ?? 0;

  // 감자 전역 상태
  const [potatoCount, setPotatoCount] = useState<number>(0);

  /** 커플 데이터 로드 */
  const fetchCoupleData = useCallback(async () => {
    if (!user?.couple_id) {
      setCouple(null);
      setPotatoCount(0);
      return;
    }
    const { data, error } = await supabase
      .from("couples")
      .select("id,user1_id,user2_id,started_at,created_at,gold")
      .eq("id", user.couple_id)
      .maybeSingle();

    if (!error && data) setCouple(data as Couple);
  }, [user?.couple_id]);

  type ConnectResult = { error: Error | null; couple?: Couple };

  const connectToPartnerById = useCallback(
    async (partnerId: string): Promise<ConnectResult> => {
      if (!user?.id) return { error: new Error("로그인 상태가 아닙니다.") };

      const today = new Date().toLocaleDateString("sv-SE");

      // 이미 커플인지 검사
      const { data: existing, error: checkError } = await supabase
        .from("couples")
        .select("id")
        .or(
          `and(user1_id.eq.${user.id},user2_id.eq.${partnerId}),and(user1_id.eq.${partnerId},user2_id.eq.${user.id})`
        )
        .maybeSingle();

      if (checkError) return { error: new Error(checkError.message) };
      if (existing) return { error: new Error("이미 연결된 커플입니다.") };

      // 커플 생성 (초기 gold = 200)
      const { data: coupleRow, error: coupleError } = await supabase
        .from("couples")
        .insert({
          user1_id: user.id,
          user2_id: partnerId,
          started_at: today,
          gold: 500,
        })
        .select("*")
        .single();

      if (coupleError || !coupleRow) {
        return { error: new Error(coupleError?.message ?? "커플 생성 실패") };
      }

      const coupleId = coupleRow.id as string;

      // 두 사용자 연결
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

      /* ✅ 커플 연결 직후 기본 어항 1개 생성 (theme_id=12) */
      {
        const { error: aqErr } = await supabase
          .from("aquarium_tanks")
          .upsert({
            couple_id: coupleId,
            tank_no: 1,
            title: "우리의 첫 어항",
            theme_id: 12,
          })
          .select("id")
          .single();
        if (aqErr)
          console.error("[CoupleContext] aquarium_theme insert error:", aqErr);
      }

      // couple_points 생성
      // await createCouplePoints(coupleId);
      // 상태 동기화
      await fetchUser();
      setCouple(coupleRow as Couple);
      await fetchCoupleData();
      // 새 커플 감자 개수 초기 로드
      try {
        const n = await getPotatoCount(coupleId);
        setPotatoCount(n);
      } catch (e) {
        console.error("[CoupleContext] initial getPotatoCount error:", e);
        setPotatoCount(5);
      }

      return { error: null, couple: coupleRow as Couple };
    },
    [user?.id, fetchUser, fetchCoupleData]
  );

  const connectToPartner = useCallback(
    async (nickname: string) => {
      const { data: partnerUser, error: findError } = await supabase
        .from("users")
        .select("id")
        .eq("nickname", nickname)
        .maybeSingle();

      if (findError || !partnerUser)
        return { error: new Error("상대방을 찾을 수 없습니다.") };

      return await connectToPartnerById(partnerUser.id);
    },
    [connectToPartnerById]
  );

  /** 서버 gold 업데이트 */
  const updateGoldOnServer = useCallback(
    (coupleId: string, newGold: number) => {
      return supabase
        .from("couples")
        .update({ gold: newGold })
        .eq("id", coupleId);
    },
    []
  );

  const mutateGold = useCallback((delta: number) => {
    setCouple((prev) => {
      if (!prev) return prev;
      const next = Math.max(0, (prev.gold ?? 0) + delta);
      return { ...prev, gold: next };
    });
  }, []);

  const addGold = useCallback(
    async (amount: number) => {
      try {
        if (!couple?.id) return { error: new Error("커플 정보가 없습니다.") };
        const prev = couple.gold ?? 0;
        const next = Math.max(0, prev + amount);

        // 낙관적
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
    },
    [couple, updateGoldOnServer]
  );

  const spendGold = useCallback(
    async (amount: number) => {
      try {
        if (!couple?.id) return { error: new Error("커플 정보가 없습니다.") };
        if (amount <= 0)
          return { error: new Error("양수만 사용할 수 있습니다.") };

        const prev = couple.gold ?? 0;
        if (prev < amount) return { error: new Error("골드가 부족합니다.") };

        const next = prev - amount;

        // 낙관적
        setCouple({ ...couple, gold: next });

        const { error } = await updateGoldOnServer(couple.id, next);
        if (error) {
          setCouple({ ...couple, gold: prev });
          return { error: new Error(error.message) };
        }
        return { error: null };
      } catch (e: any) {
        return { error: e };
      }
    },
    [couple, updateGoldOnServer]
  );

  /** 커플 해제 */
  const disconnectCouple = useCallback(async () => {
    if (!user?.id || !user.couple_id) {
      return { error: new Error("커플 아이디 존재하지않음") };
    }

    const coupleId = user.couple_id;

    // partnerId 확보
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

    // 2) users 커플 해제
    const { error: upErr } = await supabase
      .from("users")
      .update({ couple_id: null, partner_id: null })
      .in("id", idsToClear);
    if (upErr) return { error: upErr };

    // 3) Daily_Task 삭제
    const { error: myDeleteErr } = await deleteUserDailyTask(user.id);
    if (myDeleteErr) toast.error(`내 task 삭제 실패: ${myDeleteErr.message}`);

    if (partner) {
      const { error: partnerDeleteErr } = await deleteUserDailyTask(partner);
      if (partnerDeleteErr)
        toast.error(`상대 task 삭제 실패: ${partnerDeleteErr.message}`);
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
    setPotatoCount(0);

    toast.success("커플관계를 끊었습니다");
    return { error: null };
  }, [user?.id, user?.couple_id, user?.partner_id, fetchUser]);

  /** 커플 요청/수락/거절 */
  const requestCouple = useCallback(
    async (nickname: string) => {
      if (!user) return { error: new Error("로그인 필요") };
      if (isCoupled)
        return { error: new Error("이미 커플 상태입니다.. 바람피지마세요") };

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

      const { data: receivedNotifications } = await getUserNotifications(
        user.id
      );
      const { data: sentNotifications } = await getUserNotifications(
        receiver.id
      );

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

      await sendUserNotification({
        senderId: user.id,
        receiverId: receiver.id,
        type: "커플요청",
        description: `${user.nickname}님이 커플 요청을 보냈어요 💌`,
        isRequest: true,
      });
      toast.success("커플 요청 전송 완료");
      return { error: null };
    },
    [user, isCoupled]
  );

  const fetchIncomingRequests = useCallback(async () => {
    if (!user) return [];
    const { data, error } = await getUserNotifications(user.id);
    return error || !data ? [] : data.filter((n) => n.is_request);
  }, [user]);

  const acceptRequest = useCallback(
    async (notificationId: string) => {
      if (!user) return { error: new Error("로그인 필요") };

      const { data: notificationData, error: fetchError } = await supabase
        .from("user_notification")
        .select("sender_id")
        .eq("id", notificationId)
        .maybeSingle();
      if (fetchError || !notificationData)
        return { error: new Error("알림을 찾을 수 없습니다.") };

      const senderId = notificationData.sender_id;
      if (user?.id === senderId)
        return { error: new Error("자기 자신과는 커플을 맺을 수 없습니다.") };

      const { error: connectError, couple } = await connectToPartnerById(
        senderId
      );
      if (connectError) return { error: connectError };
      if (!couple?.id)
        return {
          error: new Error("커플 ID가 존재하지 않아 task를 생성할 수 없습니다"),
        };

      setCouple(couple);

      const { error: taskError } = await CreateTaskTable({
        userId: user.id,
        coupleId: couple.id,
      });
      if (taskError) return { error: taskError };

      await sendUserNotification({
        senderId: user.id,
        receiverId: senderId,
        type: "커플수락",
        description: `${user.nickname}님이 커플 요청을 수락했어요! 💘`,
        isRequest: false,
      });
      await deleteUserNotification(notificationId);

      toast.success("커플이 되었습니다!");
      return { error: null };
    },
    [user, connectToPartnerById]
  );

  const rejectRequest = useCallback(
    async (notificationId: string) => {
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
    },
    [user]
  );

  // 커플 변경 시 기본 데이터 로드
  useEffect(() => {
    if (user?.couple_id) void fetchCoupleData();
    else {
      setCouple(null);
      setPotatoCount(0);
    }
  }, [user?.couple_id, fetchCoupleData]);

  // 감자 초기 로드
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!couple?.id) return;
      try {
        const n = await getPotatoCount(couple.id);
        if (!cancelled) setPotatoCount(n);
      } catch (e) {
        console.error("[CoupleContext] getPotatoCount error:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [couple?.id]);

  // 감자 realtime 구독
  useEffect(() => {
    if (!couple?.id) return;

    const channel = supabase
      .channel(`potato_field:${couple.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "couple_potato_field",
          filter: `couple_id=eq.${couple.id}`,
        },
        (payload) => {
          const newCount = (payload.new as any)?.harvested_count ?? 0;
          setPotatoCount(newCount);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [couple?.id]);

  // ✅ 골드 realtime 구독 (couples.gold)
  useEffect(() => {
    if (!user?.couple_id) return;

    const ch = supabase
      .channel(`rt:couples:${user.couple_id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "couples",
          filter: `id=eq.${user.couple_id}`,
        },
        (payload) => {
          const row = payload.new as any;
          const newGold = Number(row?.gold ?? 0);
          setCouple((prev) => (prev ? { ...prev, gold: newGold } : prev));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.couple_id]);

  // 강제 감자 최신화
  const refreshPotatoCount = useCallback(async () => {
    if (!couple?.id) return;
    try {
      const n = await getPotatoCount(couple.id);
      setPotatoCount(n);
    } catch (e) {
      console.error("[CoupleContext] refreshPotatoCount error:", e);
    }
  }, [couple?.id]);

  const value = useMemo<CoupleContextType>(
    () => ({
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

      gold,
      addGold,
      spendGold,
      mutateGold,

      potatoCount,
      setPotatoCount,
      refreshPotatoCount,

      spendPotatoes,
      addPotatoes,
    }),
    [
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

      gold,
      addGold,
      spendGold,
      mutateGold,

      potatoCount,
      refreshPotatoCount,
      // setPotatoCount는 setter라 의존성 생략 가능(React 보장),
      // spendPotatoes/addPotatoes는 아래에서 정의.
    ]
  );

  return (
    <CoupleContext.Provider value={value}>{children}</CoupleContext.Provider>
  );

  // ───────────────────────────────────────────────────────────
  // 내부 함수(감자): 의존성 상단 value에 바인딩되어 있으므로 아래에 둬도 OK
  // ───────────────────────────────────────────────────────────

  async function spendPotatoes(amount: number) {
    try {
      if (!couple?.id) return { error: new Error("커플 정보가 없습니다.") };
      if (amount <= 0)
        return { error: new Error("양수만 차감할 수 있습니다.") };

      const prev = potatoCount;
      if (prev < amount) return { error: new Error("감자가 부족합니다.") };

      const next = Math.max(0, prev - amount);

      // 낙관적 업데이트
      setPotatoCount(next);

      // 서버 반영
      const { error } = await supabase
        .from("couple_potato_field")
        .update({ harvested_count: next })
        .eq("couple_id", couple.id);

      if (error) {
        setPotatoCount(prev); // 롤백
        return { error: new Error(error.message) };
      }
      return { error: null };
    } catch (e: any) {
      return { error: e };
    }
  }

  async function addPotatoes(amount: number) {
    try {
      if (!couple?.id) return { error: new Error("커플 정보가 없습니다.") };
      if (amount <= 0)
        return { error: new Error("양수만 추가할 수 있습니다.") };

      const prev = potatoCount;
      const next = prev + amount;

      // 낙관적 업데이트
      setPotatoCount(next);

      // 서버 반영
      const { error } = await supabase
        .from("couple_potato_field")
        .update({ harvested_count: next })
        .eq("couple_id", couple.id);

      if (error) {
        setPotatoCount(prev); // 롤백
        return { error: new Error(error.message) };
      }
      return { error: null };
    } catch (e: any) {
      return { error: e };
    }
  }
};

export const useCoupleContext = () => {
  const ctx = useContext(CoupleContext);
  if (!ctx)
    throw new Error("useCoupleContext must be used within a CoupleProvider");
  return ctx;
};
