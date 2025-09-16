"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Check,
  X,
  PlusCircle,
  RefreshCcw,
} from "lucide-react";

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
import { Input } from "@/components/ui/input";

/** 어항 가격 (RPC 파라미터로 전달) */
const TANK_PRICE = 200;

export default function AquariumPage() {
  const { couple, fetchCoupleData } = useCoupleContext();
  const coupleId = couple?.id ?? null;

  /** 커플의 탱크 목록 */
  const [tanks, setTanks] = useState<
    Array<{ tank_no: number; title: string; theme_id: number | null }>
  >([]);
  /** 현재 선택 index (0-based, 항상 첫 탱크부터) */
  const [idx, setIdx] = useState(0);

  const [themeTitle, setThemeTitle] = useState<string>("");

  /** 제목 편집 상태 */
  const cur = tanks[idx] ?? null;
  const [editing, setEditing] = useState(false);
  const [titleInput, setTitleInput] = useState("");

  /* 구매 확인 다이얼로그 상태 */
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isBuying, setIsBuying] = useState(false);

  /* 번호 이동 입력 상태 */
  const total = tanks.length || 1;
  const [gotoInput, setGotoInput] = useState<string>("");

  useEffect(() => {
    if (!cur) return;
    setTitleInput(cur.title ?? "");
    setGotoInput(""); // 현재 탱크가 바뀌면 입력칸은 비워 UX 단순화
  }, [cur?.tank_no]);

  useEffect(() => {
    // cur가 바뀔 때마다 테마 제목 갱신
    const loadThemeTitle = async () => {
      if (!cur?.theme_id) {
        setThemeTitle(""); // 테마 미지정
        return;
      }
      try {
        const { data, error } = await supabase
          .from("aquarium_themes")
          .select("title")
          .eq("id", cur.theme_id)
          .maybeSingle();

        if (error) throw error;
        setThemeTitle(data?.title ?? "");
      } catch (e: any) {
        console.error(e);
        setThemeTitle(""); // 실패 시 비움
      }
    };

    loadThemeTitle();
  }, [cur?.theme_id]);

  /** 탱크 목록 로드 */
  const loadTanks = async () => {
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
    const rows = (data ?? []) as Array<{
      tank_no: number;
      title: string;
      theme_id: number | null;
    }>;

    setTanks(rows);
    // 항상 1번(=index 0)부터 보이도록 보정
    setIdx(0);
  };

  useEffect(() => {
    loadTanks();
  }, [coupleId]);

  /** 제목 저장 */
  const saveTitle = async () => {
    if (!coupleId || !cur) return;
    const next = (titleInput ?? "").trim().slice(0, 30);
    const { error } = await supabase
      .from("aquarium_tanks")
      .update({ title: next })
      .eq("couple_id", coupleId)
      .eq("tank_no", cur.tank_no);
    if (error) {
      toast.error(`이름 변경 실패: ${error.message}`);
      return;
    }
    setTanks((arr) =>
      arr.map((t) => (t.tank_no === cur.tank_no ? { ...t, title: next } : t))
    );
    setEditing(false);
    toast.success("어항 이름을 저장했어요!");
  };

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

      // 방금 생성된 탱크 번호로 이동 (tank_no는 1-based → index로 변환)
      const newNo = Number(data?.tank?.tank_no ?? 1);
      setIdx(Math.max(0, newNo - 1));
    } catch (e: any) {
      toast.error(`구매 중 오류: ${e?.message ?? e}`);
    } finally {
      setIsBuying(false);
      setConfirmOpen(false);
    }
  };

  /** 인덱스 이동 */
  const prev = () => setIdx((i) => (total ? (i - 1 + total) % total : 0));
  const next = () => setIdx((i) => (total ? (i + 1) % total : 0));

  /** 번호 점프 */
  const jumpTo = (n: number) => {
    if (!Number.isFinite(n)) return;
    if (tanks.length === 0) return;
    if (n < 1 || n > tanks.length) {
      toast.error(`1부터 ${tanks.length}번 사이로 입력해주세요.`);
      return;
    }
    setIdx(n - 1);
  };

  /** AquariumBox와 동일 프레임(정중앙, 고정 크기) — 오버레이 기준 컨테이너 */
  const frameStyle = { height: "74vh", width: "min(100%, calc(85vw ))" };

  return (
    <div className="min-h-[calc(100svh-64px)] w-full flex flex-col">
      <div className="relative mx-20 mt-4 ">
        <div
          aria-hidden
          className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center"
        >
          <div
            className="relative rounded-xl overflow-hidden"
            style={frameStyle}
          >
            <div className="h-full w-full bg-[url('/aquarium/aquarium_background.png')] bg-cover bg-center" />
          </div>
        </div>

        {/* 본체: 현재 탱크만 렌더 (앞쪽에 오게 z-10) */}
        <div className="relative z-10">
          {cur ? (
            <AquariumBox tankNo={cur.tank_no} />
          ) : (
            <div
              className="relative rounded-xl overflow-hidden mx-auto grid place-items-center"
              style={frameStyle}
            >
              <div className="px-3 py-1.5 rounded-md bg-white/80 border shadow text-sm">
                어항을 불러오는 중…
              </div>
            </div>
          )}
        </div>

        {/* 📌 AquariumBox 기준 오버레이 (어항 위에 정확히 겹침) */}
        <div
          className="absolute top-0 left-0 right-0 mx-auto pointer-events-none"
          style={frameStyle}
        >
          <div className="relative h-full w-full">
            {/* 상단 중앙: 제목(편집) + 어항 구매 버튼(가격 with 골드 이모지) */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 pointer-events-auto">
              {!editing ? (
                <button
                  className="group inline-flex items-center gap-2 rounded-full bg-black/35 text-white text-xs sm:text-sm px-3 py-1 backdrop-blur-sm"
                  onClick={() => setEditing(true)}
                  title="어항 이름 수정"
                >
                  <span className="font-semibold tracking-wide">
                    {cur?.title || "이름 없는 어항"}
                  </span>
                  <Pencil className="w-3.5 h-3.5 opacity-80 group-hover:opacity-100" />
                </button>
              ) : (
                <div className="inline-flex items-center gap-1 bg-white/90 border rounded-full px-2 py-1 shadow">
                  <input
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveTitle();
                      if (e.key === "Escape") setEditing(false);
                    }}
                    className="bg-transparent px-1 text-sm outline-none w-48"
                    maxLength={30}
                    autoFocus
                  />
                  <button
                    className="p-1 hover:bg-emerald-50 rounded"
                    onClick={saveTitle}
                    title="저장"
                  >
                    <Check className="w-4 h-4 text-emerald-600" />
                  </button>
                  <button
                    className="p-1 hover:bg-rose-50 rounded"
                    onClick={() => setEditing(false)}
                    title="취소"
                  >
                    <X className="w-4 h-4 text-rose-600" />
                  </button>
                </div>
              )}

              {/* 어항 구매 (가격 + 골드 이모지) */}
              <button
                onClick={() => setConfirmOpen(true)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full",
                  "bg-white/90 border px-2 py-1 text-xs shadow hover:bg-white"
                )}
                title={`어항 구매 (🪙${TANK_PRICE.toLocaleString("ko-KR")})`}
              >
                <PlusCircle className="w-4 h-4" />
                <span className="font-medium">
                  어항 구매 ·{" "}
                  <span className="tabular-nums">
                    🪙{TANK_PRICE.toLocaleString("ko-KR")}
                  </span>
                </span>
              </button>
            </div>

            {/* 좌하단: 현재 테마 제목 배지 + 새로고침 */}
            {cur && (
              <div className="absolute left-2 bottom-0 flex flex-col gap-2 z-10 pointer-events-none">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full",
                    "bg-white/80 border backdrop-blur px-2.5 py-1 text-xs text-slate-800 shadow"
                  )}
                  title={
                    themeTitle ? `현재 테마: ${themeTitle}` : "현재 테마: 기본"
                  }
                >
                  <span aria-hidden className="text-[13px]">
                    현재 테마 :
                  </span>
                  <b className="font-semibold">{themeTitle || "기본 테마"}</b>
                </span>
                <Button
                  className=" z-50 shadow pointer-events-auto"
                  variant="secondary"
                  onClick={() => window.location.reload()}
                  title="페이지를 새로고침합니다"
                >
                  <RefreshCcw className="w-4 h-4 mr-1.5" />
                  새로고침
                </Button>
              </div>
            )}

            {/* 좌상단: 도감 + 테마샵 + 상세 버튼 */}
            <div className="absolute left-2 top-2 z-10 flex  gap-2 pointer-events-auto">
              <MarineDexModal />
              {cur && <ThemeShopButton tankNo={cur.tank_no} />}
              {cur && <AquariumDetailButton tankNo={cur.tank_no} />}
            </div>

            {/* ✅ 좌/우 화살표 — AquariumBox 좌우 중앙 */}
            {tanks.length > 1 && (
              <>
                <button
                  className={cn(
                    "absolute left-2 top-1/2 -translate-y-1/2 z-20",
                    "pointer-events-auto rounded-full bg-white/70 hover:bg-white",
                    "border shadow p-2"
                  )}
                  onClick={prev}
                  aria-label="이전 어항"
                  title="이전 어항"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 z-20",
                    "pointer-events-auto rounded-full bg-white/70 hover:bg-white",
                    "border shadow p-2"
                  )}
                  onClick={next}
                  aria-label="다음 어항"
                  title="다음 어항"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* ✅ 우상단: 번호 입력만 (Enter로 이동) */}
            <div className="absolute right-2 top-2 z-10 pointer-events-auto">
              <div className="inline-flex items-center rounded-full bg-white/75 border backdrop-blur-sm text-gray-900 text-xs shadow px-2 py-1">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={tanks.length || 1}
                  value={gotoInput}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d]/g, "");
                    setGotoInput(v);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const n = parseInt(gotoInput || "", 10);
                      if (Number.isNaN(n)) return;
                      jumpTo(n);
                    }
                  }}
                  placeholder={String(cur?.tank_no ?? 1)}
                  className="h-7 w-14 text-center text-xs border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  aria-label={`어항 번호 입력 (1-${tanks.length || 1})`}
                />
                <span className="ml-1 opacity-70">/ {tanks.length || 1}</span>
              </div>
            </div>
          </div>
        </div>
        {/* END overlay */}
      </div>

      {/* 구매 확인 다이얼로그 */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>아쿠아리움을 한 칸 추가하시겠습니까?</DialogTitle>
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
