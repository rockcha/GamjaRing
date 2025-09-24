// src/components/DaysTogetherBadge.tsx
"use client";

import { useCoupleContext } from "@/contexts/CoupleContext";
import { useUser } from "@/contexts/UserContext";
import { useEffect, useMemo, useState } from "react";
import { Highlighter } from "@/components/magicui/highlighter";
import supabase from "@/lib/supabase";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import type { NotificationType } from "@/utils/notification/sendUserNotification";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart } from "@fortawesome/free-solid-svg-icons";

/** ⬇️ 새 액션 포함해서 확장 */
type ActionKey = Extract<
  NotificationType,
  | "콕찌르기"
  | "뽀뽀하기"
  | "머리쓰다듬기"
  | "안아주기"
  | "간지럽히기"
  | "응원하기"
  | "애교부리기"
  | "하이파이브"
  | "선물하기"
  | "유혹하기"
  | "윙크하기"
  | "심쿵멘트"
>;

export default function DaysTogetherBadge() {
  const { couple, partnerId } = useCoupleContext();
  const { user } = useUser();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [partnerNickname, setPartnerNickname] = useState<string | null>(null);

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

  /** 클릭 이펙트 상태 */
  const [activeEffects, setActiveEffects] = useState<
    Record<ActionKey, boolean>
  >({
    콕찌르기: false,
    뽀뽀하기: false,
    머리쓰다듬기: false,
    안아주기: false,
    간지럽히기: false,
    응원하기: false,
    애교부리기: false,
    하이파이브: false,
    선물하기: false,
    유혹하기: false,
    윙크하기: false,
    심쿵멘트: false,
  });

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

  if (!couple) return <div />;

  const myNickname =
    (user as any)?.user_metadata?.nickname ??
    (user as any)?.nickname ??
    (user as any)?.profile?.nickname ??
    (user as any)?.email?.split?.("@")?.[0] ??
    "나";
  const partnerLabel = partnerNickname ?? "상대";

  /** ⬇️ 이모지 액션 리스트 (NEW 포함) */
  const ACTION_ITEMS: {
    key: ActionKey;
    label: string;
    desc: string;
    emoji: string;
    bg: string;
    ring: string;
  }[] = [
    {
      key: "콕찌르기",
      label: "콕찌르기",
      desc: "가볍게 관심 보내기",
      emoji: "👉",
      bg: "bg-amber-50 hover:bg-amber-100 border-amber-200",
      ring: "focus-visible:ring-amber-300",
    },
    {
      key: "뽀뽀하기",
      label: "뽀뽀하기",
      desc: "달달한 인사",
      emoji: "😘",
      bg: "bg-rose-50 hover:bg-rose-100 border-rose-200",
      ring: "focus-visible:ring-rose-300",
    },
    {
      key: "머리쓰다듬기",
      label: "머리 쓰다듬기",
      desc: "다정하게 토닥",
      emoji: "🫶",
      bg: "bg-slate-50 hover:bg-slate-100 border-slate-200",
      ring: "focus-visible:ring-slate-300",
    },
    {
      key: "안아주기",
      label: "안아주기",
      desc: "따뜻한 포옹",
      emoji: "🤗",
      bg: "bg-orange-50 hover:bg-orange-100 border-orange-200",
      ring: "focus-visible:ring-orange-300",
    },
    {
      key: "간지럽히기",
      label: "간지럽히기",
      desc: "웃음 버튼 ON",
      emoji: "😂",
      bg: "bg-sky-50 hover:bg-sky-100 border-sky-200",
      ring: "focus-visible:ring-sky-300",
    },

    // ===== NEW(이쁘게 컬러 분산) =====
    {
      key: "응원하기",
      label: "응원하기",
      desc: "힘내! 파워 충전",
      emoji: "💪",
      bg: "bg-lime-50 hover:bg-lime-100 border-lime-200",
      ring: "focus-visible:ring-lime-300",
    },
    {
      key: "애교부리기",
      label: "애교 부리기",
      desc: "심장 녹이기",
      emoji: "🥰",
      bg: "bg-pink-50 hover:bg-pink-100 border-pink-200",
      ring: "focus-visible:ring-pink-300",
    },
    {
      key: "하이파이브",
      label: "하이파이브",
      desc: "찰칵! 팀워크",
      emoji: "🙌",
      bg: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200",
      ring: "focus-visible:ring-indigo-300",
    },
    {
      key: "선물하기",
      label: "선물하기",
      desc: "깜짝 서프라이즈",
      emoji: "🎁",
      bg: "bg-violet-50 hover:bg-violet-100 border-violet-200",
      ring: "focus-visible:ring-violet-300",
    },
    {
      key: "유혹하기",
      label: "유혹하기",
      desc: "치명적인 눈빛",
      emoji: "😏",
      bg: "bg-fuchsia-50 hover:bg-fuchsia-100 border-fuchsia-200",
      ring: "focus-visible:ring-fuchsia-300",
    },
    {
      key: "윙크하기",
      label: "윙크하기",
      desc: "시그널 전달",
      emoji: "😉",
      bg: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200",
      ring: "focus-visible:ring-emerald-300",
    },
    {
      key: "심쿵멘트",
      label: "심쿵 멘트",
      desc: "한 마디로 K.O",
      emoji: "💘",
      bg: "bg-amber-50/70 hover:bg-amber-100/80 border-amber-200",
      ring: "focus-visible:ring-amber-300",
    },
  ];

  function triggerBurst(k: ActionKey) {
    setActiveEffects((s) => ({ ...s, [k]: false }));
    requestAnimationFrame(() => {
      setActiveEffects((s) => ({ ...s, [k]: true }));
      window.setTimeout(() => {
        setActiveEffects((s) => ({ ...s, [k]: false }));
      }, 700);
    });
  }

  async function handleSend(type: ActionKey, emoji: string) {
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
      triggerBurst(type);
      setSending(type);
      const { error } = await sendUserNotification({
        senderId,
        receiverId: partnerId,
        type,
      });
      if (error) {
        toast.error("알림 전송에 실패했어요. 잠시 후 다시 시도해주세요.");
      } else {
        toast.success(
          `‘${partnerLabel}’에게 ${emoji} ${type} 알림을 보냈어요!`
        );
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
      {/* 헤더 */}
      <div className="flex items-center justify-center gap-3">
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
              "text-[18px] sm:text-[24px] font-extrabold truncate max-w-[40vw]",
              "hover:text-[#7a532a] transition-colors"
            )}
            aria-label={`${partnerLabel}에게 액션 보내기`}
            title="액션 보내기"
          >
            {partnerLabel}
          </button>
        </div>

        {/* 함께한 일수 하이라이트 */}
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

      {/* Action Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <style>{`
            @keyframes floatUp {
              0% { transform: translate(-50%, 0) scale(0.8); opacity: 0; }
              50% { opacity: 1; }
              100% { transform: translate(-50%, -22px) scale(1.25); opacity: 0; }
            }
            @keyframes popTap {
              0% { transform: scale(1); }
              50% { transform: scale(0.94); }
              100% { transform: scale(1); }
            }
          `}</style>

          <div className="space-y-2">
            <p className="py-2 text-sm text-muted-foreground">
              아래에서 하나를 선택하면 연인에게 즉시 알림이 전송돼요.
            </p>

            {/* ⬇️ 2열 → 작은 화면 2, sm이상 3열로 넓혔어 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ACTION_ITEMS.map((a) => (
                <div key={a.key} className="relative">
                  {/* 떠오르는 이모지 이펙트 */}
                  {activeEffects[a.key] && (
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: -6,
                        animation: "floatUp 700ms ease-out forwards",
                        pointerEvents: "none",
                        fontSize: 18,
                        filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.08))",
                      }}
                    >
                      {a.emoji}
                    </span>
                  )}

                  <Button
                    type="button"
                    variant="secondary"
                    className={cn(
                      "justify-start h-12 px-3 text-[13px] font-semibold",
                      "border transition-transform active:scale-95 rounded-xl",
                      a.bg,
                      "focus-visible:outline-none focus-visible:ring-2",
                      a.ring
                    )}
                    disabled={Boolean(sending)}
                    onClick={() => handleSend(a.key, a.emoji)}
                    title={a.desc}
                    style={{
                      animation:
                        sending === a.key ? undefined : "popTap 160ms ease-out",
                    }}
                    aria-label={`${partnerLabel}에게 ${a.label} 보내기 (${a.emoji})`}
                  >
                    <span className="mr-2 text-[18px]" aria-hidden>
                      {a.emoji}
                    </span>
                    <span className="truncate">{a.label}</span>
                  </Button>
                </div>
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
