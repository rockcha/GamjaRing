// src/pages/AquariumPage.tsx
"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PlusCircle, Info, Store, BookOpenText, Settings2 } from "lucide-react";

import AquariumBox from "@/features/aquarium/AquariumBox";
import ThemeShopButton from "@/features/aquarium/ThemeShopButton";
import MarineDexModal from "@/features/aquarium/MarineDexModal";
import AquariumDetailButton from "@/features/aquarium/AquariumDetailButton";

/* shadcn/ui */
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

/* 모달용 탱크 네비게이터 (Dialog까지 포함된 버전) */
import TankChipsNavigatorDialog from "@/features/aquarium/TankChipsNavigatorDialog";

/** 어항 가격 (RPC 파라미터로 전달) */
const TANK_PRICE = 200;

/** 배경 숨김 폴백 지연(ms) — AquariumBox가 onReady를 못 보낼 경우 대비 */
const BG_FALLBACK_HIDE_MS = 1200;

type TankRow = {
  tank_no: number;
  title: string | null;
  theme_id: number | null;
};

function AquariumPage() {
  const { couple, fetchCoupleData } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  /** 커플의 탱크 목록 */
  const [tanks, setTanks] = useState<TankRow[]>([]);
  /** 현재 선택 index (0-based, 항상 첫 탱크부터) */
  const [idx, setIdx] = useState(0);

  /* 구매 확인 다이얼로그 상태 */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isBuying, setIsBuying] = useState(false);

  /** 어항 로딩 마스크(배경) 표시 상태 */
  const [showBg, setShowBg] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** AquariumBox에서 준비 완료 시 호출 (옵션) — 지금은 폴백 위주로 사용 중 */
  const handleAquariumReady = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setShowBg(false);
  };

  /** 현재 탱크 */
  const cur = tanks[idx] ?? null;

  /** 탱크 목록 로드 */
  const loadTanks = useCallback(async () => {
    if (!coupleId) return;
    const { data, error } = await supabase
      .from("aquarium_tanks")
      .select("tank_no, title, theme_id")
      .eq("couple_id", coupleId)
      .order("tank_no", { ascending: true });

    if (error) {
      toast.error(`어항 목록을 불러오지 못했어요: ${error.message}`);
      setTanks([]);
      return;
    }
    const rows = (data ?? []) as TankRow[];
    setTanks(rows);
    setIdx(0); // 항상 1번부터
  }, [coupleId]);

  useEffect(() => {
    loadTanks();
  }, [loadTanks]);

  /** ✅ 어항 이름 변경 핸들러 (TankChipsNavigator → Supabase 반영) */
  const handleRenameTank = useCallback(
    async (tankNo: number, newTitle: string) => {
      if (!coupleId) {
        toast.error("커플 정보가 없어 어항 이름을 변경할 수 없어요.");
        return;
      }

      const trimmed = newTitle.trim();
      if (!trimmed) {
        toast.warning("어항 이름은 비울 수 없어요.");
        return;
      }

      // 기존 제목 백업 (롤백용)
      const prevTitle = tanks.find((t) => t.tank_no === tankNo)?.title ?? null;

      // 1) 낙관적 업데이트 (UI 먼저 바꾸기)
      setTanks((prev) =>
        prev.map((t) => (t.tank_no === tankNo ? { ...t, title: trimmed } : t))
      );

      // 2) Supabase 반영
      const { error } = await supabase
        .from("aquarium_tanks")
        .update({ title: trimmed })
        .eq("couple_id", coupleId)
        .eq("tank_no", tankNo);

      if (error) {
        // 실패 시 롤백
        setTanks((prev) =>
          prev.map((t) =>
            t.tank_no === tankNo ? { ...t, title: prevTitle } : t
          )
        );
        toast.error(`어항 이름을 저장하지 못했어요: ${error.message}`);
        return;
      }

      toast.success("어항 이름이 저장되었어요!");
    },
    [coupleId, tanks]
  );

  /** 어항 구매 (RPC) — 다이얼로그에서 최종 실행 */
  const confirmBuy = async () => {
    if (isBuying) return;
    setIsBuying(true);
    try {
      const { data, error } = await supabase.rpc("buy_aquarium", {
        p_price: TANK_PRICE,
        p_title: null,
        p_theme_id: 12, // 기본 테마 id (필요 시 변경)
      });
      if (error) throw error;

      if (data?.ok !== true) {
        const reason = data?.error ?? "unknown";
        if (reason === "not_enough_gold") toast.warning("골드가 부족합니다!");
        else toast.error(`구매 실패: ${String(reason)}`);
        return;
      }

      toast.success("새 어항을 구매했어요!");
      await loadTanks();
      await fetchCoupleData?.();

      // 방금 생성된 탱크 번호로 이동 (tank_no는 1-based → index)
      const newNo = Number(data?.tank?.tank_no ?? 1);
      setIdx(Math.max(0, newNo - 1));
    } catch (e: any) {
      toast.error(`구매 중 오류: ${e?.message ?? e}`);
    } finally {
      setIsBuying(false);
      setConfirmOpen(false);
    }
  };

  /** 탱크가 바뀌면 배경을 잠깐 다시 보여주고, 폴백 타이머로 자동 숨김 */
  useEffect(() => {
    setShowBg(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setShowBg(false);
      hideTimerRef.current = null;
    }, BG_FALLBACK_HIDE_MS);

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [cur?.tank_no]);

  /** 프레임 규격 (높이 보장) */
  const AQUARIUM_HEIGHT_VH = 80; // ⬆️ 기존보다 높이만 늘림
  const AQUARIUM_WIDTH_CSS = "min(100%, calc(85vw))";

  const frameStyle = useMemo(
    () =>
      ({
        height: `${AQUARIUM_HEIGHT_VH}vh`,
        width: AQUARIUM_WIDTH_CSS,
      } as const),
    []
  );

  /** 네비게이터용 탱크 리스트 (title fallback 포함) */
  const tankNavItems = useMemo(
    () =>
      tanks.map((t) => ({
        tank_no: t.tank_no,
        title: t.title ?? `${t.tank_no}번 어항`,
        theme_id: t.theme_id,
      })),
    [tanks]
  );

  return (
    <div className="min-h-[calc(100svh-64px)] w-full flex flex-col">
      <div className="relative mx-2 sm:mx-6 lg:mx-20 mt-2 sm:mt-4 space-y-3 sm:space-y-4">
        {/* 메인 프레임 컨테이너 */}
        {cur ? (
          <div
            className={cn(
              "relative mx-auto rounded-2xl overflow-hidden",
              "will-change-transform transform-gpu ring-1 ring-white/20",
              "bg-white/5 backdrop-blur-[2px]",
              // ⬆️ 최소 높이도 살짝 키움
              "min-h-[520px] sm:min-h-[580px]"
            )}
            style={frameStyle}
          >
            {/* Overlays */}
            <div className="pointer-events-none absolute inset-0 z-[15]">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.22)_75%)] mix-blend-multiply" />
              <div className="absolute -left-1/3 -top-1/3 w-[160%] h-1/2 -rotate-12 bg-white/10 blur-md animate-shine" />
              <div className="absolute inset-0 opacity-[0.07] bg-[url('/textures/grain.png')] bg-repeat mix-blend-overlay" />
              <div className="absolute inset-0 opacity-20 mix-blend-soft-light animate-caustics bg-[url('/textures/caustics.png')] bg-[length:140%_140%]" />
            </div>

            {/* 로딩용 배경 */}
            <div
              aria-hidden
              className={cn(
                "absolute inset-0 z-[5] pointer-events-none transition-opacity duration-500",
                showBg ? "opacity-100" : "opacity-0"
              )}
            >
              <div className="h-full w-full bg-[url('/aquarium/aquarium_background.png')] bg-cover bg-center" />
            </div>

            {/* 본체 (부모가 사이즈를 잡고, 내부는 100% 채우도록) */}
            <div className="relative z-10 h-full w-full">
              <AquariumBox
                tankNo={cur.tank_no}
                fitToContainer // 내부에서 object-cover처럼 꽉 채우도록 사용하는 플래그
                // onReady={handleAquariumReady}
              />
            </div>

            {/* ▲ 상단 툴바: 좌(아이콘 그룹 + separator) - 중(스페이서) - 우(추가) */}
            <div className="absolute top-2 left-2 right-2 z-30 pointer-events-none">
              <div
                className={cn(
                  "flex items-center gap-2 sm:gap-3",
                  "rounded-xl border bg-white/80 dark:bg-slate-900/70 backdrop-blur-md",
                  "px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-sm"
                )}
              >
                {/* 좌측 아이콘 그룹 */}
                <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
                  {/* 아쿠아리움 관리하기(상세 보기) */}
                  <AquariumDetailButton tankNo={cur.tank_no} asChild>
                    <IconButton
                      icon={<Info className="w-4 h-4" />}
                      ariaLabel="아쿠아리움 관리하기"
                    />
                  </AquariumDetailButton>

                  <Divider />

                  {/* 🔹 NEW: 아쿠아리움 변경하기 (텍스트 버튼 + 모달) */}
                  <TankChipsNavigatorDialog
                    icon={Settings2}
                    label="아쿠아리움 변경하기"
                    tanks={tankNavItems}
                    idx={idx}
                    onSelect={setIdx}
                    onRename={handleRenameTank}
                  />

                  <Divider />

                  {/* 도감 */}
                  <MarineDexModal asChild>
                    <IconButton
                      icon={<BookOpenText className="w-4 h-4" />}
                      ariaLabel="도감"
                    />
                  </MarineDexModal>

                  <Divider />

                  {/* 상점 */}
                  <ThemeShopButton tankNo={cur.tank_no} asChild>
                    <IconButton
                      icon={<Store className="w-4 h-4" />}
                      ariaLabel="상점"
                    />
                  </ThemeShopButton>
                </div>

                {/* 가운데 스페이서 */}
                <div className="flex-1 min-w-0" />

                {/* 우측: 추가 버튼 */}
                <div className="flex items-center gap-1 pointer-events-auto">
                  <button
                    onClick={() => setConfirmOpen(true)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border",
                      "bg-white/90 dark:bg-slate-900/70 backdrop-blur",
                      "px-2.5 py-1 text-xs sm:text-sm shadow hover:bg-white"
                    )}
                    title={`어항 추가 (🪙${TANK_PRICE.toLocaleString(
                      "ko-KR"
                    )})`}
                    aria-label="어항 추가"
                  >
                    <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">추가하기</span>
                    <span className="ml-1 rounded-md border px-1.5 py-0.5 text-[10px] sm:text-[11px] opacity-80">
                      🪙{TANK_PRICE.toLocaleString("ko-KR")}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* 하단 인디케이터 */}
            {tanks.length > 1 && (
              <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
                <div className="flex items-center gap-1.5">
                  {tanks.map((t, i) => {
                    const active = i === idx;
                    return (
                      <span
                        key={t.tank_no}
                        className={cn(
                          "h-1.5 w-1.5 rounded-full bg-white/70 border pointer-events-auto cursor-pointer",
                          active ? "scale-110 bg-amber-400" : "opacity-70"
                        )}
                        onClick={() => setIdx(i)}
                        title={`${t.tank_no}번`}
                        role="button"
                        aria-label={`${t.tank_no}번으로 이동`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          // 탱크 목록 자체가 아직 없을 때의 플레이스홀더
          <div
            className={cn(
              "relative rounded-2xl overflow-hidden mx-auto grid place-items-center",
              "ring-1 ring-white/20 bg-white/5 backdrop-blur-[2px]",
              "min-h-[520px] sm:min-h-[580px]"
            )}
            style={frameStyle}
          >
            <div className="px-3 py-1.5 rounded-md bg-white/80 border shadow text-sm">
              어항을 불러오는 중…
            </div>
          </div>
        )}
      </div>

      {/* 구매 확인 다이얼로그 */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Α쿠아리움을 한 칸 추가하시겠습니까?</DialogTitle>
            <DialogDescription>
              새 어항을 구매하면 골드가 차감돼요. 가격:{" "}
              <b className="tabular-nums">
                🪙{TANK_PRICE.toLocaleString("ko-KR")}
              </b>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button onClick={confirmBuy} disabled={isBuying}>
              {isBuying ? "구매 중..." : "구매"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isBuying}
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { AquariumPage };

/* ────────────── 작은 UI 유틸 컴포넌트 ────────────── */

function IconButton({
  icon,
  ariaLabel,
  onClick,
}: {
  icon: React.ReactNode;
  ariaLabel: string;
  onClick?: React.ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
}) {
  return (
    <button
      className={cn(
        "inline-grid place-items-center rounded-md border",
        "size-8 sm:size-9 bg-white/90 dark:bg-slate-900/70 backdrop-blur",
        "hover:bg-white transition shadow-sm"
      )}
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={onClick}
    >
      {icon}
    </button>
  );
}

/** 아이콘 사이 구분선 */
function Divider() {
  return <div className="h-6 w-px bg-border/70 mx-0.5 sm:mx-1" aria-hidden />;
}
