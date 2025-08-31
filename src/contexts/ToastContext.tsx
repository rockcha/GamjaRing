// src/contexts/ToastContext.tsx
"use client";

import { createContext, useContext, useCallback } from "react";
import { Toaster } from "@/components/ui/sonner"; // shadcn wrapper
import { toast } from "sonner";

type Ctx = { open: (msg: string, ms?: number) => void };
const ToastCtx = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const open = useCallback((m: string, ms = 3500) => {
    toast(m, { duration: ms });
  }, []);

  return (
    <ToastCtx.Provider value={{ open }}>
      {children}
      {/* 전역 토스트 렌더러 */}
      <Toaster
        position="bottom-center"
        richColors
        closeButton
        // 필요시: duration={3500}
      />
    </ToastCtx.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("ToastProvider로 감싸주세요");
  return ctx;
};
