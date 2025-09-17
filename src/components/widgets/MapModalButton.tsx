// src/components/MapModalButton.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

/**
 * 조건
 * - 비로그인 또는 커플 미연동: 모달 열지 않고 toast만 표시
 * - 로그인 + 커플 연동: 정사각 지도 모달 오픈
 * - 버튼 UI: PotatoPokeButton과 동일(원형, 이모지, 클릭 리플)
 */
export default function MapModalButton({
  className,
  buttonEmoji = "🧭",
  ariaLabel = "지도로 이동",
}: {
  className?: string;
  buttonEmoji?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const { user } = useUser();
  const { couple } = useCoupleContext();

  // ✅ PotatoPokeButton과 동일한 클릭 리플
  const [ripple, setRipple] = React.useState(false);
  const rippleTimer = React.useRef<number | null>(null);
  const startRipple = () => {
    setRipple(false);
    requestAnimationFrame(() => {
      setRipple(true);
      if (rippleTimer.current) window.clearTimeout(rippleTimer.current);
      rippleTimer.current = window.setTimeout(() => setRipple(false), 1400);
    });
  };
  React.useEffect(() => {
    return () => {
      if (rippleTimer.current) window.clearTimeout(rippleTimer.current);
    };
  }, []);

  const handleOpenClick = () => {
    startRipple();

    if (!user?.id) {
      toast.warning("로그인 후 이용해 주세요.");
      return;
    }
    if (!couple?.id) {
      toast.warning("커플 연동 후 이용해 주세요.");
      return;
    }
    setOpen(true);
  };

  return (
    <>
      {/* 원형 이모지 버튼 (PotatoPokeButton 스타일) */}
      <motion.button
        type="button"
        aria-label={ariaLabel}
        onClick={handleOpenClick}
        className={cn(
          "relative grid place-items-center",
          "h-14 w-14 rounded-full border",
          "bg-white/60",
          "hover:pl-4 transition-all duration-500",
          className
        )}
      >
        {/* 클릭 리플 */}
        {ripple && (
          <span
            className="
              pointer-events-none absolute inset-0 rounded-full
              ring-4 ring-rose-300/50
              animate-[pokePing_1.4s_ease-out_forwards]
            "
            aria-hidden
          />
        )}

        {/* 이모지 아이콘만 노출 */}
        <span className="text-2xl leading-none select-none" aria-hidden>
          {buttonEmoji}
        </span>

        {/* 파동 키프레임 */}
        <style>{`
          @keyframes pokePing {
            0%   { transform: scale(1);   opacity: .75; }
            70%  { transform: scale(1.9); opacity: 0;   }
            100% { transform: scale(1.9); opacity: 0;   }
          }
        `}</style>
      </motion.button>

      {/* 정사각형 모달 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "p-0 overflow-hidden rounded-2xl border bg-white",
            "w-auto max-w-none"
          )}
        >
          <div
            className="flex flex-col items-stretch"
            style={{ width: "min(70vw, 70vh)" }}
          >
            {/* 상단 타이틀 바 */}
            <div className="flex items-center justify-start gap-2 pt-2 pl-1 bg-white/90 backdrop-blur-sm">
              <img
                src="/island.gif"
                alt=""
                className="h-12 w-12 rounded-[10px]"
                draggable={false}
                aria-hidden
              />
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                감자링 아일랜드
              </h2>
            </div>

            {/* 내부 지도: 정사각 */}
            <div className="p-1">
              <div
                className="relative overflow-hidden rounded-xl"
                style={{ width: "100%", height: "min(70vw, 70vh)" }}
              >
                <MapCanvas onClose={() => setOpen(false)} />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* =========================
   내부: 지도 캔버스 + 폴리곤 핫스팟 + 커서 라벨
   ========================= */
function MapCanvas({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();

  const hotspots: Array<{
    id: "farm" | "port" | "aquarium" | "kitchen";
    label: string;
    href: string;
    polygon: string;
  }> = [
    {
      id: "farm",
      label: "농장",
      href: "/potatoField",
      polygon: "polygon(3% 5%, 48% 5%, 43% 40%, 3% 45%)",
    },
    {
      id: "port",
      label: "항구",
      href: "/fishing",
      polygon: "polygon(3% 55%, 40% 60%, 52% 97%, 3% 97%)",
    },
    {
      id: "aquarium",
      label: "아쿠아리움",
      href: "/aquarium",
      polygon: "polygon(52% 5%, 97% 5%, 97% 45%, 60% 35%)",
    },
    {
      id: "kitchen",
      label: "조리실",
      href: "/kitchen",
      polygon: "polygon(58% 63%, 97% 54%, 97% 97%, 50% 97%)",
    },
  ];

  const go = (href: string) => {
    if (!href) return;

    const isInternal =
      href.startsWith("/") &&
      !/^https?:\/\//i.test(href) &&
      !/^\/{2}/.test(href);

    if (isInternal) {
      navigate(href);
      requestAnimationFrame(() => {
        try {
          onClose?.();
        } catch {}
      });
    } else {
      window.location.assign(href);
    }
  };

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [hoverInfo, setHoverInfo] = React.useState<{
    label: string;
    x: number;
    y: number;
  } | null>(null);

  const updateHover = (e: React.MouseEvent, label: string) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHoverInfo({ label, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div ref={containerRef} className="absolute inset-0">
      {/* 지도 이미지 */}
      <img
        src="/map.png"
        alt="월드 맵"
        className="absolute inset-0 h-full w-full object-contain select-none bg-[radial-gradient(50%_50%_at_50%_50%,rgba(0,0,0,.06)_0%,rgba(0,0,0,0)_70%)]"
        draggable={false}
      />

      {/* 핫스팟: a 태그로 폴백 확보 */}
      <div className="absolute inset-0">
        {hotspots.map((hs) => (
          <a
            key={hs.id}
            href={hs.href}
            onClick={(e) => {
              const isInternal =
                hs.href.startsWith("/") && !/^https?:\/\//i.test(hs.href);
              if (!isInternal) return; // 외부 링크는 기본 동작
              e.preventDefault(); // 내부만 우리가 제어
              go(hs.href);
            }}
            onMouseEnter={(e) => updateHover(e, hs.label)}
            onMouseMove={(e) => updateHover(e, hs.label)}
            onMouseLeave={() => setHoverInfo(null)}
            className={cn(
              "group absolute rounded-[12px] outline-none cursor-pointer",
              "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black/40"
            )}
            aria-label={hs.label}
            style={{ inset: 0, clipPath: hs.polygon as any }}
          >
            <span
              aria-hidden
              className="absolute inset-0 rounded-[12px] bg-white/0 group-hover:bg-white/5 transition-colors"
            />
            <span className="invisible"> </span>
          </a>
        ))}
      </div>

      {/* 커서 위치 라벨 */}
      {hoverInfo && (
        <div
          className={cn(
            "pointer-events-none absolute z-10",
            "px-3.5 py-2 rounded-md text-base",
            "bg-black/55 text-white"
          )}
          style={{
            left: hoverInfo.x,
            top: hoverInfo.y,
            transform: "translate(-50%, calc(-100% - 8px))",
            whiteSpace: "nowrap",
          }}
        >
          {hoverInfo.label}
        </div>
      )}

      {/* 상단 안내 배지 */}
      <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/35 px-3 py-1 text-[11px] text-white backdrop-blur">
        지도를 클릭해 이동하세요
      </div>
    </div>
  );
}
