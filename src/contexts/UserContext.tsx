// src/contexts/UserContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

import supabase from "@/lib/supabase";
import { toast } from "sonner";

interface UserData {
  id: string;
  email: string;
  nickname: string;
  partner_id: string | null;
  couple_id: string | null;
  avatar_id: number | null; // ✅ 추가
}

interface SignupInput {
  email: string;
  password: string;
  nickname: string;
}

interface UserContextType {
  user: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: Error | null }>;
  signup: (data: SignupInput) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<UserData | null>;
  isCoupled: boolean;
  connectToPartner: (nickname: string) => Promise<{ error: Error | null }>;
  updateAvatarId: (id: number | null) => Promise<{ error: Error | null }>; // ✅ 추가
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// 숫자/문자 혼용 대비 보정
function toAvatarId(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number" && Number.isFinite(val)) return val;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async (): Promise<UserData | null> => {
    setLoading(true);

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    const session = sessionData?.session;

    if (sessionError || !session?.user) {
      setUser(null);
      setLoading(false);
      return null;
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, email, nickname, partner_id, couple_id, avatar_id") // ✅ avatar_id 포함
      .eq("id", session.user.id)
      .maybeSingle();

    if (error || !data) {
      console.error("❌ 사용자 정보 로드 실패:", error?.message);
      setUser(null);
      setLoading(false);
      return null;
    }

    const shaped: UserData = {
      id: data.id,
      email: data.email,
      nickname: data.nickname,
      partner_id: data.partner_id,
      couple_id: data.couple_id,
      avatar_id: toAvatarId(data.avatar_id), // ✅ 보정
    };

    setUser(shaped);
    setLoading(false);
    return shaped;
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !authUser) {
      setLoading(false);
      return { error: error ?? new Error("로그인 실패") };
    }

    await fetchUser();
    return { error: null };
  };

  const signup = async ({ email, password, nickname }: SignupInput) => {
    setLoading(true);
    const {
      data: { user: newUser },
      error: signupError,
    } = await supabase.auth.signUp({ email, password });

    if (signupError || !newUser) {
      setLoading(false);
      return { error: signupError ?? new Error("회원가입 실패") };
    }

    const { error: insertError } = await supabase.from("users").upsert({
      id: newUser.id,
      email,
      nickname,
      avatar_id: null, // ✅ 초기값
    });

    if (insertError) {
      setLoading(false);
      return { error: insertError };
    }

    await fetchUser();
    toast.success("회원가입 성공");
    return { error: null };
  };

  const logout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      toast.info("로그아웃되었습니다");
    } catch (error) {
      console.error("로그아웃 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const connectToPartner = async (partnerNickname: string) => {
    if (!user) return { error: new Error("로그인 필요") };

    const { data: partner, error: partnerError } = await supabase
      .from("users")
      .select("id")
      .eq("nickname", partnerNickname)
      .maybeSingle();

    if (partnerError || !partner) {
      return {
        error:
          partnerError ?? new Error("해당 닉네임의 사용자를 찾을 수 없습니다."),
      };
    }

    const { error: updateError } = await supabase.rpc("connect_partners", {
      user1_id: user.id,
      user2_id: partner.id,
    });

    if (updateError) return { error: updateError };

    await fetchUser();
    return { error: null };
  };

  // ✅ 아바타 ID 업데이트
  const updateAvatarId = async (
    id: number | null
  ): Promise<{ error: Error | null }> => {
    if (!user?.id) return { error: new Error("로그인 필요") };

    const { error } = await supabase
      .from("users")
      .update({ avatar_id: id })
      .eq("id", user.id);

    if (error) return { error };

    // 로컬 상태 즉시 반영
    setUser((prev) => (prev ? ({ ...prev, avatar_id: id } as UserData) : prev));
    return { error: null };
  };

  const isCoupled = !!user?.couple_id;

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        fetchUser,
        isCoupled,
        connectToPartner,
        updateAvatarId, // ✅ 노출
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context)
    throw new Error("useUser는 UserProvider 내부에서만 사용해야 합니다");
  return context;
}
