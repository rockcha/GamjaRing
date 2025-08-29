// src/app/AppInit.tsx (혹은 shared/components/AppInit.tsx)
"use client";

import { useEffect, useRef } from "react";
import supabase from "@/lib/supabase";
import { runDataIntegrityCheck } from "./utils/DataIntegrityCheck";

export default function AppInit() {
  // StrictMode의 이중 마운트/라우트 재마운트 방지
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    // 이 탭 세션에서 단 1회만 실행 (새로고침 시 sessionStorage 초기화되어 다시 1회 실행)
    const BOOT_KEY = "dic:booted";
    if (sessionStorage.getItem(BOOT_KEY)) return;
    sessionStorage.setItem(BOOT_KEY, "1");

    (async () => {
      // 현재 로그인 유저 확인 (복원 완료되었으면 바로 나옴)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        // 검진 실행 (결과 로그는 함수 내부에서)
        await runDataIntegrityCheck(user.id);
      }
      // 로그인 안 된 상태면 ‘초기 접속 1회’ 정책 상 여기서 더 이상 실행하지 않음.
      // (같은 탭에서 나중에 로그인해도 재실행 안 함)
    })();
  }, []);

  return null;
}
