import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useToast } from "./ToastContext";
import supabase from "@/lib/supabase";

interface UserData {
  id: string;
  email: string;
  nickname: string;
  partner_id: string | null;
  couple_id: string | null; // ✅ 추가됨
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
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const { open } = useToast();

  const fetchUser = async (): Promise<UserData | null> => {
    setLoading(true);

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    const session = sessionData?.session;

    if (sessionError || !session || !session.user) {
      setUser(null);
      setLoading(false);
      return null;
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, email, nickname, partner_id, couple_id")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error || !data) {
      console.error("❌ 사용자 정보 로드 실패:", error?.message);
      setUser(null);
      setLoading(false);
      return null;
    }

    setUser(data);
    setLoading(false);

    return data; // ✅ 리턴 추가
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
    });

    if (insertError) {
      setLoading(false);
      return { error: insertError };
    }

    await fetchUser();
    open("회원가입 성공");
    return { error: null };
  };

  const logout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      open("로그아웃되었습니다");
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

    // 연결: 양쪽 업데이트 (커플 RPC 사용)
    const { error: updateError } = await supabase.rpc("connect_partners", {
      user1_id: user.id,
      user2_id: partner.id,
    });

    if (updateError) return { error: updateError };

    await fetchUser();
    return { error: null };
  };

  const isCoupled = !!user?.couple_id; // ✅ 기준 변경: partner_id → couple_id

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
