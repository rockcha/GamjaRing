// src/components/widgets/QuickMenu/QuickMenu.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

/* shadcn/ui */
import { Separator } from "@/components/ui/separator";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

/* ========= Lucide (직접 사용) ========= */
import { type LucideIcon, ListChecks } from "lucide-react";

/* ========= Font Awesome 아이콘을 Lucide 타입처럼 래핑 ========= */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHandHoldingHeart,
  faHouse,
  faCircleInfo,
  faCircleQuestion,
  faComments,
  faCalendarDays,
  faTractor,
  faBowlFood,
  faSailboat,
  faFish,
  faDiceThree,
  faGamepad,
  faClipboard,
  faHourglassHalf,
  faRightLeft,
  faGhost,
  faPuzzlePiece,
  faBolt,
  faLandmark, // 은행 건물 아이콘
  faSeedling, // ✅ 꽃집 아이콘
} from "@fortawesome/free-solid-svg-icons";

const makeFA =
  (iconDef: any) =>
  ({ className }: { className?: string }) =>
    <FontAwesomeIcon icon={iconDef} className={className} />;

const HeartHandshake = makeFA(faHandHoldingHeart) as unknown as LucideIcon;
const Home = makeFA(faHouse) as unknown as LucideIcon;
const Info = makeFA(faCircleInfo) as unknown as LucideIcon;
const MessageCircleQuestionMark = makeFA(
  faCircleQuestion
) as unknown as LucideIcon;
const MessagesSquare = makeFA(faComments) as unknown as LucideIcon;
const CalendarDays = makeFA(faCalendarDays) as unknown as LucideIcon;
const Tractor = makeFA(faTractor) as unknown as LucideIcon;
const CookingPot = makeFA(faBowlFood) as unknown as LucideIcon;
const Waves = makeFA(faSailboat) as unknown as LucideIcon;
const Fish = makeFA(faFish) as unknown as LucideIcon;
const Dice3 = makeFA(faDiceThree) as unknown as LucideIcon;
const Gamepad2 = makeFA(faGamepad) as unknown as LucideIcon;
const Sticker = makeFA(faClipboard) as unknown as LucideIcon;
const Hourglass = makeFA(faHourglassHalf) as unknown as LucideIcon;
const ArrowLeftRight = makeFA(faRightLeft) as unknown as LucideIcon;
const Ghost = makeFA(faGhost) as unknown as LucideIcon;
const PuzzlePiece = makeFA(faPuzzlePiece) as unknown as LucideIcon;
const Bolt = makeFA(faBolt) as unknown as LucideIcon;
const Landmark = makeFA(faLandmark) as unknown as LucideIcon; // 은행 건물
const Seedling = makeFA(faSeedling) as unknown as LucideIcon; // ✅ 꽃집

/* ========= 내부 전용 네비 정의 ========= */
type NavId =
  | "home"
  | "info"
  | "questions"
  | "bundle"
  | "scheduler"
  | "timeCapsule"
  | "memories"
  | "gloomy"
  | "bucketList"
  | "farm"
  | "kitchen"
  | "exchange"
  | "aquarium"
  | "fishing"
  | "stickerBoard"
  | "miniGame"
  | "bank"
  | "flowerShop"; // ✅ 추가

type NavDef = {
  id: NavId;
  label: string;
  icon: LucideIcon;
};

const NAV_DEFS: Record<NavId, NavDef> = {
  home: { id: "home", label: "메인페이지", icon: Home },
  info: { id: "info", label: "감자링이란?", icon: Info },

  questions: {
    id: "questions",
    label: "답변하기",
    icon: MessageCircleQuestionMark,
  },
  bundle: { id: "bundle", label: "답변꾸러미", icon: MessagesSquare },
  scheduler: { id: "scheduler", label: "스케쥴러", icon: CalendarDays },
  timeCapsule: { id: "timeCapsule", label: "타임캡슐", icon: Hourglass },
  memories: { id: "memories", label: "추억조각", icon: PuzzlePiece },
  gloomy: { id: "gloomy", label: "음침한 방", icon: Ghost },

  bucketList: { id: "bucketList", label: "버킷리스트", icon: ListChecks },

  farm: { id: "farm", label: "농장", icon: Tractor },
  kitchen: { id: "kitchen", label: "조리실", icon: CookingPot },
  exchange: { id: "exchange", label: "교환소", icon: ArrowLeftRight },
  aquarium: { id: "aquarium", label: "아쿠아리움", icon: Fish },
  fishing: { id: "fishing", label: "낚시터", icon: Waves },
  stickerBoard: { id: "stickerBoard", label: "스티커보드", icon: Sticker },
  miniGame: { id: "miniGame", label: "미니게임", icon: Gamepad2 },

  bank: { id: "bank", label: "감자링 은행", icon: Landmark },

  // ✅ 꽃집
  flowerShop: { id: "flowerShop", label: "꽃집", icon: Seedling },
};

/* 가드 & 라우팅 */
const GUARDS: Record<
  string,
  { requireLogin?: boolean; requireCouple?: boolean }
> = {
  home: {},
  info: {},
  questions: { requireLogin: true, requireCouple: true },
  bundle: { requireLogin: true, requireCouple: true },
  scheduler: { requireLogin: true, requireCouple: true },
  timeCapsule: { requireLogin: true, requireCouple: true },
  memories: { requireLogin: true, requireCouple: true },
  gloomy: { requireLogin: true, requireCouple: true },
  bucketList: { requireLogin: true, requireCouple: true },
  farm: { requireLogin: true, requireCouple: true },
  kitchen: { requireLogin: true, requireCouple: true },
  exchange: { requireLogin: true, requireCouple: true },
  aquarium: { requireLogin: true, requireCouple: true },
  fishing: { requireLogin: true, requireCouple: true },
  stickerBoard: { requireLogin: true, requireCouple: true },
  miniGame: { requireLogin: true, requireCouple: true },
  bank: { requireLogin: true, requireCouple: true },
  flowerShop: { requireLogin: true, requireCouple: true }, // ✅ 추가
};

const FALLBACK_ROUTE: Record<string, string> = {
  home: "/main",
  info: "/info",
  questions: "/questions",
  bundle: "/bundle",
  scheduler: "/scheduler",
  timeCapsule: "/timeCapsule",
  memories: "/memories",
  gloomy: "/gloomy",
  bucketList: "/bucketlist",
  farm: "/potatoField",
  kitchen: "/kitchen",
  exchange: "/exchange",
  aquarium: "/aquarium",
  fishing: "/fishing",
  stickerBoard: "/stickerBoard",
  miniGame: "/miniGame",
  bank: "/bank",
  flowerShop: "/flowershop", // ✅ 추가
};

/* ========= 영역 구성 ========= */
const DAILY_IDS = [
  "questions",
  "bundle",
  "scheduler",
  "timeCapsule",
  "memories",
  "gloomy",
  "bucketList",
] as const;

const WORLD_IDS = [
  "farm",
  "kitchen",
  "exchange",
  "flowerShop", // ✅ 감자링 월드에 꽃집 추가
  "bank",
  "aquarium",
  "fishing",
  "stickerBoard",
  "miniGame",
] as const;

/* ========= 로컬스토리지 키 ========= */
const LS_LAST_ICON_ID = "quickmenu_last_icon_id";

/* ========= 모드 배너 (패턴 레이어 포함) ========= */
function ModeBanner({ isWorld }: { isWorld: boolean }) {
  return (
    <div className="relative mt-1 w-full overflow-hidden rounded-2xl">
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 opacity-[0.18] sm:opacity-[0.25]",
          isWorld
            ? "bg-[radial-gradient(circle,rgba(124,58,237,0.35)_1px,transparent_1.5px)] bg-[length:14px_14px]"
            : "bg-[radial-gradient(circle,rgba(16,185,129,0.35)_1px,transparent_1.5px)] bg-[length:14px_14px]"
        )}
      />
    </div>
  );
}

/* ========= 큼직한 타일 ========= */
function BigNavTile({
  icon: Icon,
  label,
  disabled,
  onClick,
  tone = "daily",
}: {
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
  onClick?: () => void;
  tone?: "daily" | "world";
}) {
  const toneClasses =
    tone === "world"
      ? {
          label: "text-indigo-900",
          hoverRing:
            "focus-visible:ring-indigo-400/70 hover:ring-indigo-300/60",
          border: "border-indigo-100/70",
          capsule: "from-white to-indigo-50",
          icon: "text-indigo-600",
          drop: "drop-shadow-[0_3px_8px_rgba(99,102,241,0.25)]",
        }
      : {
          label: "text-emerald-900",
          hoverRing:
            "focus-visible:ring-emerald-400/70 hover:ring-emerald-300/60",
          border: "border-emerald-100/70",
          capsule: "from-white to-emerald-50",
          icon: "text-emerald-600",
          drop: "drop-shadow-[0_3px_8px_rgba(16,185,129,0.25)]",
        };

  return (
    <button
      type="button"
      aria-label={`${label} 이동`}
      title={disabled ? "커플 연동이 필요해요" : label}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={cn(
        "group relative flex w-full flex-col items-center justify-center",
        "rounded-2xl border bg-white/95 px-3 py-4 sm:px-6 sm:py-7",
        "shadow-sm ring-1 ring-black/[0.04] transition-all",
        "focus-visible:outline-none focus-visible:ring-2",
        toneClasses.hoverRing,
        toneClasses.border,
        "motion-reduce:transition-none motion-reduce:transform-none",
        "hover:-translate-y-[2px] hover:shadow-lg active:scale-[0.98]",
        disabled && "opacity-60 cursor-not-allowed"
      )}
    >
      <div
        className={cn(
          "mb-2 flex h-[56px] w-[56px] items-center justify-center rounded-full sm:h-[64px] sm:w-[64px]",
          "bg-gradient-to-br shadow-inner",
          toneClasses.capsule,
          "transition-transform duration-150 ease-out group-hover:scale-[1.04]",
          "motion-reduce:transition-none motion-reduce:transform-none"
        )}
      >
        <Icon
          className={cn(
            "h-[24px] w-[24px] sm:h-[30px] sm:w-[30px]",
            toneClasses.icon,
            toneClasses.drop,
            "transition-transform duration-150 ease-out group-hover:scale-[1.06]",
            "motion-reduce:transition-none motion-reduce:transform-none"
          )}
        />
      </div>

      <span
        className={cn(
          "text-[13px] sm:text-[15px] font-semibold tracking-tight text-center",
          "min-w-0 break-keep leading-[1.15]",
          toneClasses.label
        )}
      >
        {label}
      </span>
    </button>
  );
}

/* ========= 공개 컴포넌트: QuickMenu ========= */
export default function QuickMenu() {
  const { user } = useUser();
  const uid = user?.id ?? null;
  const coupled = !!user?.couple_id;

  const [open, setOpen] = useState(false);
  const [isWorld, setIsWorld] = useState(false); // false=일상, true=월드

  // 최근 이동한 메뉴 아이콘 id (FAB 아이콘으로 사용)
  const [lastIconId, setLastIconId] = useState<NavId | null>(null);

  // 마운트 시 로컬스토리지에서 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_LAST_ICON_ID);
      if (saved) setLastIconId(saved as NavId);
    } catch {}
  }, []);

  // FAB 아이콘
  const FabIcon = useMemo<LucideIcon>(() => {
    if (lastIconId && NAV_DEFS[lastIconId]) {
      return NAV_DEFS[lastIconId].icon;
    }
    return isWorld ? Gamepad2 : Bolt;
  }, [lastIconId, isWorld]);

  const ids = isWorld ? WORLD_IDS : DAILY_IDS;
  const tiles = useMemo(() => ids.map((id) => NAV_DEFS[id]), [ids]);

  const nav = useNavigate();

  const isDisabled = (id: string) => {
    const g = GUARDS[id] || {};
    if (g.requireLogin && !uid) return true;
    if (g.requireCouple && !coupled) return true;
    return false;
  };

  const go = (id: NavId) => {
    const g = GUARDS[id] || {};
    if (g.requireLogin && !uid) {
      toast.warning("로그인이 필요해요.");
      return;
    }
    if (g.requireCouple && !coupled) {
      toast.warning("커플 연동이 필요해요.");
      return;
    }
    const url = FALLBACK_ROUTE[id] ?? `/${id}`;

    try {
      localStorage.setItem(LS_LAST_ICON_ID, id);
    } catch {}
    setLastIconId(id);

    nav(url);
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      {/* FAB */}
      <DrawerTrigger asChild>
        <Button
          size="icon"
          className={cn(
            "fixed z-[110] h-14 w-14 rounded-full text-white shadow-2xl",
            "bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2",
            isWorld
              ? "bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 ring-2 ring-violet-300/60"
              : "bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 ring-2 ring-emerald-300/60",
            "transition-transform active:scale-[0.98] motion-reduce:transition-none"
          )}
          aria-label="빠른 메뉴 열기"
          title="빠른 메뉴"
        >
          <FabIcon className="h-6 w-6" />
        </Button>
      </DrawerTrigger>

      {/* 바텀시트 */}
      <DrawerContent
        className={cn(
          "fixed inset-x-0 bottom-0 z-[100]",
          "mx-auto w-full sm:max-w-screen-md",
          "rounded-t-3xl border-t border-slate-200 bg-white",
          "px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-5",
          "transition-transform"
        )}
      >
        {/* 몽글 배경 보케 */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 -z-[1] opacity-[0.14] sm:opacity-[0.18]",
            isWorld
              ? "bg-[radial-gradient(1000px_400px_at_80%_-10%,rgba(124,58,237,0.25),transparent),radial-gradient(800px_300px_at_10%_100%,rgba(99,102,241,0.22),transparent)]"
              : "bg-[radial-gradient(1000px_400px_at_80%_-10%,rgba(16,185,129,0.25),transparent),radial-gradient(800px_300px_at_10%_100%,rgba(20,184,166,0.22),transparent)]"
          )}
        />

        <DrawerHeader className="px-1 sm:px-2">
          <DrawerTitle className="text-[18px] font-extrabold sm:text-xl">
            빠른 메뉴
          </DrawerTitle>
        </DrawerHeader>

        {/* 모드 전환 */}
        <div className="px-1 sm:px-2">
          <div
            role="group"
            aria-label="우리의 일상 / 감자링 월드 전환"
            className={cn(
              "mx-auto mt-1 flex w-full max-w-xs items-center justify-between gap-3",
              "rounded-2xl bg-white/70 p-2 ring-1 ring-black/5 shadow-sm"
            )}
          >
            <button
              type="button"
              onClick={() => setIsWorld(false)}
              className={cn(
                "flex-1 select-none rounded-xl px-2 py-1.5 text-center text-[13px] sm:text-[15px] font-semibold transition-colors",
                !isWorld
                  ? "text-emerald-700 bg-emerald-50"
                  : "text-muted-foreground hover:bg-muted/30"
              )}
              aria-pressed={!isWorld}
            >
              우리의 일상
            </button>

            <Switch
              checked={isWorld}
              onCheckedChange={(v) => setIsWorld(v)}
              aria-label="우리의 일상/감자링 월드 전환"
              className={cn(
                "h-8 w-14",
                "data-[state=unchecked]:bg-emerald-200/80 data-[state=checked]:bg-indigo-300/80",
                "transition-colors",
                "[&>span]:h-6 [&>span]:w-6 [&>span]:translate-x-1 data-[state=checked]:[&>span]:translate-x-7",
                "ring-1 ring-inset ring-black/5 shadow-sm"
              )}
            />

            <button
              type="button"
              onClick={() => setIsWorld(true)}
              className={cn(
                "flex-1 select-none rounded-xl px-2 py-1.5 text-center text-[13px] sm:text-[15px] font-semibold transition-colors",
                isWorld
                  ? "text-violet-700 bg-violet-50"
                  : "text-muted-foreground hover:bg-muted/30"
              )}
              aria-pressed={isWorld}
            >
              감자링 월드
            </button>
          </div>

          <p className="mx-auto mt-1.5 max-w-xs text-center text-[11px] text-muted-foreground">
            라벨을 눌러도 전환돼요 · 스위치는 크게 키워 터치가 쉬워졌어요
          </p>
        </div>

        {/* 모드 배너 */}
        <ModeBanner isWorld={isWorld} />

        <div className="mt-3 sm:mt-4">
          <Separator className="bg-slate-200/80" />
        </div>

        {/* 타일 그리드 */}
        <div
          className={cn(
            "mt-3 grid gap-2.5 sm:gap-4 lg:gap-5",
            "grid-cols-3 sm:grid-cols-4 lg:grid-cols-4"
          )}
          role="grid"
          aria-label={isWorld ? "감자링 월드 바로가기" : "우리의 일상 바로가기"}
        >
          {((isWorld ? WORLD_IDS : DAILY_IDS) as readonly NavId[]).map((id) => {
            const { label, icon } = NAV_DEFS[id];
            const disabled = isDisabled(id);
            const tone = isWorld ? "world" : "daily";
            return (
              <BigNavTile
                key={id}
                icon={icon}
                label={label}
                disabled={disabled}
                tone={tone}
                onClick={() => {
                  if (disabled) return;
                  setOpen(false);
                  go(id);
                }}
              />
            );
          })}
        </div>

        <div className="h-2 sm:h-3" />
      </DrawerContent>
    </Drawer>
  );
}
