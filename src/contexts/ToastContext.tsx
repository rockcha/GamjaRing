// ToastContext.tsx
import { createContext, useContext, useState, useCallback } from "react";
import Popup from "@/components/widgets/Popup";

type Ctx = { open: (msg: string, ms?: number) => void };
const ToastCtx = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState("");

  const open = useCallback((m: string, ms = 3500) => {
    setMsg(m);
    setShow(true);
    window.setTimeout(() => setShow(false), ms);
  }, []);

  return (
    <ToastCtx.Provider value={{ open }}>
      {children}
      {/* 필요하면 Portal로 body에 붙여도 됨 */}
      <Popup show={show} message={msg} onClose={() => setShow(false)} />
    </ToastCtx.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("ToastProvider로 감싸주세요");
  return ctx;
};
