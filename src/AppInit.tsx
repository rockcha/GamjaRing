// src/app/AppInit.tsx (혹은 shared/components/AppInit.tsx)
"use client";

import { useEffect, useRef } from "react";
import supabase from "./lib/supabase";
import { runDataIntegrityCheck } from "./utils/DataIntegrityCheck";

export default function AppInit() {
  // 라우트 전환·중복 마운트로 인해 여러 번 실행되는 것 방지
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    let unsub: (() => void) | undefined;

    (async () => {
      // ✅ 새로고침/새 탭에서도 현재 로그인된 유저를 바로 확인
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        // (선택) 탭 당 1회만 실행하고 싶으면 sessionStorage 스로틀
        const key = `dic:${user.id}:${new Date().toISOString().slice(0, 10)}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          void runDataIntegrityCheck(user.id);
        }
      }

      // ✅ 로그인 이벤트에도 그대로 수행 (이미 하셨다면 유지)
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user?.id) {
          void runDataIntegrityCheck(session.user.id);
        }
      });

      unsub = () => subscription.unsubscribe();
    })();

    return () => {
      if (unsub) unsub();
    };
  }, []);

  return null; // UI 출력 없음
}
