"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";

/**
 * 조건
 * - 비로그인 또는 커플 미연동: 모달 열지 않고 toast만 표시
 * - 로그인 + 커플 연동: 정사각 지도 모달 오픈
 */
export default function MapModalButton() {
  const [open, setOpen] = React.useState(false);
  const [pulseOnce, setPulseOnce] = React.useState(true);
  const { user } = useUser();
  const { couple } = useCoupleContext();

  const handleOpenClick = () => {
    if (!user?.id) {
      toast.warning("로그인 후 이용해 주세요.");
      return;
    }
    if (!couple?.id) {
      toast.warning("커플 연동 후 이용해 주세요.");
      return;
    }
    setOpen(true);
    setPulseOnce(false);
  };

  return (
    <>
      {/* 플로팅 버튼 (브리딩 + 1회 링 펄스) */}
      <button
        type="button"
        aria-label="지도로 이동"
        onClick={handleOpenClick}
        className={cn(
          "fixed right-4 bottom-4 z-[60]",
          "h-14 w-14 rounded-full border bg-white/95",
          "shadow-sm hover:shadow-md hover:bg-white transition-all grid place-items-center",
          "animate-[mapBreath_3.5s_ease-in-out_infinite]",
          pulseOnce &&
            "after:absolute after:inset-0 after:rounded-full after:animate-[mapPulseOnce_1.2s_ease-out] after:content-['']"
        )}
      >
        <img
          src="/map.gif"
          alt="Map"
          className="h-7 w-7 rounded-sm object-cover"
          draggable={false}
        />
      </button>

      {/* 정사각형 모달 */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={cn(
            "p-0 overflow-hidden rounded-2xl border bg-white",
            "w-auto max-w-none animate-[dialogIn_180ms_ease-out]"
          )}
        >
          {/* 모달 콘텐츠 래퍼: 정사각 기반 너비 */}
          <div
            className="flex flex-col items-stretch"
            style={{ width: "min(55vw, 55vh)" }}
          >
            {/* 상단 타이틀 바 */}
            <div className="flex items-center justify-center gap-2  px-4 pt-4 bg-white/90 backdrop-blur-sm">
              <img
                src="/map.gif"
                alt=""
                className="h-5 w-5 rounded-[4px] object-cover"
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
                className="relative overflow-hidden rounded-xl "
                style={{ width: "100%", height: "min(55vw, 55vh)" }}
              >
                <MapCanvas onClose={() => setOpen(false)} />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 키프레임 */}
      <style>{`
@keyframes mapBreath {
  0%,100% { transform: translateY(0) scale(1); box-shadow: 0 4px 10px rgba(0,0,0,.08); }
  50% { transform: translateY(-2px) scale(1.02); box-shadow: 0 6px 16px rgba(0,0,0,.10); }
}
@keyframes mapPulseOnce {
  0% { box-shadow: 0 0 0 0 rgba(251,191,36,.45); }
  100% { box-shadow: 0 0 0 22px rgba(251,191,36,0); }
}
@keyframes dialogIn {
  from { opacity: 0; transform: scale(.96); }
  to   { opacity: 1; transform: scale(1); }
}
      `}</style>
    </>
  );
}

/* =========================
   내부: 지도 캔버스 + 폴리곤 핫스팟 + 커서 라벨
   ========================= */
function MapCanvas({ onClose }: { onClose: () => void }) {
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
    onClose();
    window.location.href = href;
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
      {/* 지도 이미지: 전체 보이도록 */}
      <img
        src="/map.png"
        alt="월드 맵"
        className="absolute inset-0 h-full w-full object-contain select-none bg-[radial-gradient(50%_50%_at_50%_50%,rgba(0,0,0,.06)_0%,rgba(0,0,0,0)_70%)]"
        draggable={false}
      />

      {/* 핫스팟 (hover 시 커서 라벨만 표기) */}
      <div className="absolute inset-0">
        {hotspots.map((hs) => (
          <button
            key={hs.id}
            type="button"
            onClick={() => go(hs.href)}
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
          </button>
        ))}
      </div>

      {/* 커서 위치 라벨 */}
      {hoverInfo && (
        <div
          className={cn(
            "pointer-events-none absolute z-10",
            "px-3.5 py-2 rounded-md  text-base ",
            "bg-black/55  text-white"
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
      <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-black/35 px-3 py-1 text-[11px] text-white backdrop-blur">
        지도를 클릭해 이동하세요
      </div>
    </div>
  );
}
