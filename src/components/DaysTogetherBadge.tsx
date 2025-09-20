// src/components/DaysTogetherBadge.tsx
"use client";

import { useCoupleContext } from "@/contexts/CoupleContext";
import { useUser } from "@/contexts/UserContext";
import { useEffect, useMemo, useState } from "react";
import { Highlighter } from "@/components/magicui/highlighter";
import supabase from "@/lib/supabase";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import type { NotificationType } from "@/utils/notification/sendUserNotification";

/* ✅ Font Awesome */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeart,
  faHandPointRight,
  faFaceKissWinkHeart,
  faHandHoldingHeart,
  faHands,
  faFaceGrinSquintTears,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";

export default function DaysTogetherBadge() {
  const { couple, partnerId } = useCoupleContext();
  const { user } = useUser();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [partnerNickname, setPartnerNickname] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!partnerId) {
          setPartnerNickname((couple as any)?.partner_nickname ?? null);
          return;
        }
        const { data, error } = await supabase
          .from("users")
          .select("nickname")
          .eq("id", partnerId)
          .single();
        if (!alive) return;
        if (error) {
          setPartnerNickname((couple as any)?.partner_nickname ?? null);
        } else {
          setPartnerNickname(
            data?.nickname ?? (couple as any)?.partner_nickname ?? null
          );
        }
      } catch {
        setPartnerNickname((couple as any)?.partner_nickname ?? null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [partnerId, (couple as any)?.partner_nickname]);

  const [idx, setIdx] = useState(0);
  const ACTIONS = ["circle", "box", "highlight"] as const;

  const daysTogether = useMemo(() => {
    if (!couple?.started_at) return null;
    const today = new Date();
    const start = new Date(couple.started_at);
    const start0 = new Date(start.toDateString()).getTime();
    const today0 = new Date(today.toDateString()).getTime();
    const diffDays = Math.floor((today0 - start0) / 86400000);
    return diffDays + 1;
  }, [couple?.started_at]);

  const ANIM_MS = 2800;
  const ITERS = 2;
  const GAP_MS = 3000;
  useEffect(() => {
    if (!couple?.started_at) return;
    const h = window.setTimeout(() => {
      setIdx((i) => (i + 1) % ACTIONS.length);
    }, ANIM_MS * ITERS + GAP_MS);
    return () => window.clearTimeout(h);
  }, [idx, couple?.started_at]);

  const currentAction = ACTIONS[idx] ?? "highlight";
  const COLOR = "#F5D9B8";

  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  if (!couple) return <div />;

  const myNickname =
    (user as any)?.user_metadata?.nickname ??
    (user as any)?.nickname ??
    (user as any)?.profile?.nickname ??
    (user as any)?.email?.split?.("@")?.[0] ??
    "나";

  const partnerLabel = partnerNickname ?? "상대";

  /* ───────── Action Dialog ───────── */

  // ✅ 이모지 → Font Awesome 아이콘으로 교체
  const ACTION_ITEMS: {
    key: Extract<
      NotificationType,
      "콕찌르기" | "뽀뽀하기" | "머리쓰다듬기" | "안아주기" | "간지럽히기"
    >;
    label: string;
    desc: string;
    icon: IconDefinition;
    accent?: string;
  }[] = [
    {
      key: "콕찌르기",
      label: "콕찌르기",
      desc: "가볍게 관심 보내기",
      icon: faHandPointRight,
      accent: "amber",
    },
    {
      key: "뽀뽀하기",
      label: "뽀뽀하기",
      desc: "달달한 인사",
      icon: faFaceKissWinkHeart,
      accent: "rose",
    },
    {
      key: "머리쓰다듬기",
      label: "머리 쓰다듬기",
      desc: "다정하게 토닥",
      icon: faHandHoldingHeart,
      accent: "slate",
    },
    {
      key: "안아주기",
      label: "안아주기",
      desc: "따뜻한 포옹",
      icon: faHands,
      accent: "orange",
    },
    {
      key: "간지럽히기",
      label: "간지럽히기",
      desc: "웃음 버튼 ON",
      icon: faFaceGrinSquintTears,
      accent: "sky",
    },
  ];

  async function handleSend(type: (typeof ACTION_ITEMS)[number]["key"]) {
    if (!partnerId) {
      toast.error("파트너 정보를 찾을 수 없어요.");
      return;
    }
    const senderId = (user as any)?.id;
    if (!senderId) {
      toast.error("로그인 정보가 없어요.");
      return;
    }
    try {
      setSending(type);
      const { error } = await sendUserNotification({
        senderId,
        receiverId: partnerId,
        type,
      });
      if (error) {
        toast.error("알림 전송에 실패했어요. 잠시 후 다시 시도해주세요.");
      } else {
        toast.success(`‘${partnerLabel}’에게 ${type} 알림을 보냈어요!`);
        setOpen(false);
      }
    } catch {
      toast.error("알림 전송 중 오류가 발생했어요.");
    } finally {
      setSending(null);
    }
  }

  return (
    <div className={"w-full px-4 py-3 mt-2"}>
      <div className="flex items-center justify-center gap-3">
        {/* 닉네임 ❤️ 닉네임 → ❤️ Font Awesome */}
        <div className="flex items-center gap-2 text-[#5b3d1d] min-w-0">
          <span className="text-[18px] sm:text-[24px] font-extrabold truncate">
            {myNickname}
          </span>
          <span className="animate-pulse select-none" aria-hidden>
            <FontAwesomeIcon
              icon={faHeart}
              className="h-[18px] w-[18px] sm:h-[20px] sm:w-[20px] text-rose-500"
            />
          </span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              "text-[18px] sm:text-[24px] font-extrabold truncate max-w-[40vw] ",
              "hover:text-[#7a532a] transition-colors"
            )}
            aria-label={`${partnerLabel}에게 액션 보내기`}
            title="액션 보내기"
          >
            {partnerLabel}
          </button>
        </div>

        <div className="flex-shrink-0">
          {mounted ? (
            <Highlighter
              key={currentAction}
              action={currentAction as any}
              color={COLOR}
              strokeWidth={1.7}
              animationDuration={ANIM_MS}
              iterations={ITERS}
              padding={10}
              multiline={false}
              isView={false}
            >
              <p className="text-[16px] sm:text-[20px] font-semibold text-[#5b3d1d]">
                함께한지
                <span className="mx-1 font-extrabold text-[22px] sm:text-[28px] text-[#b75e20] align-baseline">
                  {daysTogether ?? "?"}
                </span>
                일
              </p>
            </Highlighter>
          ) : (
            <p className="text-[16px] sm:text-[18px] font-semibold text-[#5b3d1d]">
              함께한지{" "}
              <span className="font-extrabold text-[22px] sm:text-[24px] text-[#b75e20]">
                …
              </span>
              일
            </p>
          )}
        </div>
      </div>

      {/* ───────── Action Dialog ───────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <div className="space-y-2">
            <p className="py-2 text-sm text-muted-foreground">
              아래에서 하나를 선택하면 연인에게 즉시 알림이 전송돼요.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {ACTION_ITEMS.map((a) => (
                <Button
                  key={a.key}
                  variant="secondary"
                  className={cn(
                    "justify-start h-12 px-3 text-[13px] font-semibold",
                    "bg-amber-50 hover:bg-amber-100 text-[#6b4a2a] border border-amber-200"
                  )}
                  disabled={Boolean(sending)}
                  onClick={() => handleSend(a.key)}
                  title={a.desc}
                >
                  <FontAwesomeIcon
                    icon={a.icon}
                    className="mr-2 h-4 w-4"
                    aria-hidden
                  />
                  <span className="truncate">{a.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
