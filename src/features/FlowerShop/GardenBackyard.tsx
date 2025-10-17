// src/features/garden/GardenBackyard.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import supabase from "@/lib/supabase";
import { useCoupleContext } from "@/contexts/CoupleContext";
import { useUser } from "@/contexts/UserContext";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";
import SeedShopButton from "./SeedShopButton";

type Tile = {
  couple_id: string;
  pos: number; // 0..8
  state: "empty" | "planted" | "ready";
  seed_id: number | null;
  planted_at: string | null;
  ready_at: string | null;
  chosen_flower_id: string | null;
};

const STATE_IMG: Record<Tile["state"], string> = {
  empty: "/flowers/state/empty.png",
  planted: "/flowers/state/growing.png",
  ready: "/flowers/state/ready.png",
};

type SeedId = 1 | 2 | 3;
type SeedOwn = { seed_id: SeedId; qty: number; label: string };

const SEED_META: Record<SeedId, { label: string; img: string }> = {
  1: { label: "일반 씨앗", img: "/flowers/seeds/일반 씨앗.png" },
  2: { label: "미스터리 씨앗", img: "/flowers/seeds/미스터리 씨앗.png" },
  3: { label: "신화 씨앗", img: "/flowers/seeds/신화 씨앗.png" },
};

type Grade = "일반" | "희귀" | "에픽";
type ClaimedFlower = { id: string; label: string; grade: Grade } | null;

const gradeTone: Record<Grade, string> = {
  일반: "ring-1 ring-neutral-200 bg-neutral-50 dark:bg-neutral-950/60 dark:ring-neutral-800",
  희귀: "ring-1 ring-sky-200 bg-sky-50 dark:bg-sky-950/40 dark:ring-sky-900/60",
  에픽: "ring-1 ring-violet-200 bg-violet-50 dark:bg-violet-950/40 dark:ring-violet-900/60",
};

// FlowerShop과 동일한 규칙
const imgSrc = (label: string) => `/flowers/${encodeURIComponent(label)}.png`;

export default function GardenBackyard() {
  const { couple } = useCoupleContext();
  const { user } = useUser();
  const myId = user?.id ?? null;

  const coupleId = couple?.id as string | undefined;

  const [tiles, setTiles] = useState<Tile[] | null>(null);
  const [seeds, setSeeds] = useState<Record<SeedId, number>>({
    1: 0,
    2: 0,
    3: 0,
  });
  const [loading, setLoading] = useState(false);
  const [selectedSeed, setSelectedSeed] = useState<SeedId | null>(null);

  // 수확 다이얼로그 상태
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimed, setClaimed] = useState<ClaimedFlower>(null);

  const loadTiles = useCallback(async () => {
    if (!coupleId) return setTiles([]);
    const { data, error } = await supabase
      .from("garden_tiles")
      .select(
        "couple_id,pos,state,seed_id,planted_at,ready_at,chosen_flower_id"
      )
      .eq("couple_id", coupleId)
      .order("pos", { ascending: true });
    if (error) {
      console.warn("[garden] tiles error:", error.message);
      setTiles([]);
      return;
    }
    const base = Array.from({ length: 9 }, (_, pos) => ({
      couple_id: coupleId,
      pos,
      state: "empty" as const,
      seed_id: null,
      planted_at: null,
      ready_at: null,
      chosen_flower_id: null,
    })) as Tile[];
    const byPos = new Map<number, Tile>(
      (data ?? []).map((t: any) => [t.pos, t])
    );
    setTiles(base.map((b) => byPos.get(b.pos) ?? b));
  }, [coupleId]);

  const refreshStates = useCallback(async () => {
    if (!coupleId) return;
    await supabase.rpc("garden_refresh_states", { p_couple_id: coupleId });
  }, [coupleId]);

  const loadSeeds = useCallback(async () => {
    if (!coupleId) return setSeeds({ 1: 0, 2: 0, 3: 0 });
    const { data, error } = await supabase
      .from("seed_ownerships")
      .select("seed_id, qty")
      .eq("couple_id", coupleId)
      .in("seed_id", [1, 2, 3]);
    if (error) {
      console.warn("[garden] seeds error:", error.message);
      return setSeeds({ 1: 0, 2: 0, 3: 0 });
    }
    const map: Record<SeedId, number> = { 1: 0, 2: 0, 3: 0 };
    (data ?? []).forEach((r: any) => {
      const id = Number(r.seed_id) as SeedId;
      map[id] = Number(r.qty ?? 0);
    });
    setSeeds(map);
  }, [coupleId]);

  useEffect(() => {
    if (!coupleId) return;
    (async () => {
      setLoading(true);
      await refreshStates();
      await Promise.all([loadTiles(), loadSeeds()]);
      setLoading(false);
    })();
    const id = setInterval(async () => {
      await refreshStates();
      await loadTiles();
    }, 30_000);
    return () => clearInterval(id);
  }, [coupleId, loadTiles, loadSeeds, refreshStates]);

  const remainingFor = useCallback((t: Tile) => {
    if (!t.ready_at) return "";
    const ms = new Date(t.ready_at).getTime() - Date.now();
    if (ms <= 0) return "수확 가능";
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const z = (n: number) => n.toString().padStart(2, "0");
    return `${z(h)}:${z(m)}:${z(ss)}`;
  }, []);

  /** 커플 상대 ID 조회 (context에 없으면 fallback) */
  const getPartnerId = useCallback(async (): Promise<string | null> => {
    try {
      const c: any = couple;
      const u1 = c?.user1_id ?? c?.user_a_id ?? c?.userA_id ?? null;
      const u2 = c?.user2_id ?? c?.user_b_id ?? c?.userB_id ?? null;
      if (myId && (u1 || u2)) {
        const other =
          myId === String(u1)
            ? String(u2 ?? "")
            : myId === String(u2)
            ? String(u1 ?? "")
            : null;
        return other || null;
      }
      if (!coupleId) return null;
      const { data, error } = await supabase
        .from("couples")
        .select("user1_id,user2_id")
        .eq("id", coupleId)
        .maybeSingle();
      if (error || !data) return null;
      const other =
        myId && myId === String(data.user1_id)
          ? String(data.user2_id ?? "")
          : String(data.user1_id ?? "");
      return other || null;
    } catch {
      return null;
    }
  }, [couple, coupleId, myId]);

  /** 수확 다이얼로그 표출 + (에픽이면) 알림 발송 */
  const openClaimDialog = useCallback(
    async (flowerId: string) => {
      try {
        const { data, error } = await supabase
          .from("flowers")
          .select("id,label,grade")
          .eq("id", flowerId)
          .maybeSingle();

        if (error) throw error;

        let picked: ClaimedFlower;
        if (!data) {
          picked = { id: flowerId, label: `#${flowerId}`, grade: "일반" };
        } else {
          picked = {
            id: data.id,
            label: data.label as string,
            grade: data.grade as Grade,
          };
        }
        setClaimed(picked);
        setClaimOpen(true);

        // 에픽 수확 시 알림
        if (picked.grade === "에픽" && myId) {
          const partnerId = await getPartnerId();
          if (partnerId) {
            await sendUserNotification({
              senderId: myId,
              receiverId: partnerId,
              type: "꽃 재배",
              itemName: picked.label,
            });
          }
        }
      } catch (e: any) {
        console.warn("[garden] fetch claimed flower error:", e?.message);
      }
    },
    [getPartnerId, myId]
  );

  const onTileClick = async (t: Tile) => {
    if (t.state === "ready") {
      if (!coupleId) return;
      try {
        const { data, error } = await supabase.rpc("garden_claim", {
          p_couple_id: coupleId,
          p_pos: t.pos,
        });
        if (error) throw error;
        const fid = (data as any)?.flower_id as string | undefined;
        toast.success("꽃을 수확했어요! ✨");
        await Promise.all([loadTiles(), loadSeeds()]);
        if (fid) await openClaimDialog(fid);
      } catch (e: any) {
        toast.error(e?.message ?? "수확 실패");
      }
      return;
    }

    if (t.state === "empty") {
      if (!selectedSeed) {
        toast.message("먼저 심을 씨앗을 선택해주세요 🌱");
        return;
      }
      if (seeds[selectedSeed] <= 0) {
        toast.error("해당 씨앗이 없습니다 🪙");
        return;
      }
      if (!coupleId) return;

      try {
        const { error } = await supabase.rpc("garden_plant", {
          p_couple_id: coupleId,
          p_pos: t.pos,
          p_seed_id: selectedSeed,
        });
        if (error) throw error;
        toast.success(`${SEED_META[selectedSeed].label}을(를) 심었어요!`);
        await Promise.all([loadTiles(), loadSeeds()]);
      } catch (e: any) {
        toast.error(e?.message ?? "심기 실패");
      }
      return;
    }

    if (t.state === "planted") {
      toast.message("빈 칸을 선택해주세요.");
    }
  };

  // ---------- 이펙트 레이어들 ----------
  const RareEffect = () => (
    <motion.div
      className="pointer-events-none absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      {/* 소프트 스카이 글로우 */}
      <div className="absolute inset-0 blur-2xl opacity-40 bg-sky-300/40" />
      {/* 둥둥 떠다니는 스파클 */}
      {[...Array(12)].map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full bg-sky-400/80"
          initial={{
            x: Math.random() * 280 + 20,
            y: Math.random() * 160 + 20,
            opacity: 0,
            scale: 0,
          }}
          animate={{
            y: ["0%", "-20%", "0%"],
            opacity: [0, 1, 0],
            scale: [0, 1, 0.6],
          }}
          transition={{
            duration: 1.8 + Math.random(),
            delay: Math.random() * 0.6,
            repeat: Infinity,
            repeatDelay: Math.random() * 0.8,
            ease: "easeInOut",
          }}
        />
      ))}
    </motion.div>
  );

  const EpicEffect = () => (
    <motion.div
      className="pointer-events-none absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      {/* 더 강한 보라 글로우 */}
      <div className="absolute inset-0 blur-3xl opacity-50 bg-violet-400/50" />
      {/* 파티클 버스트 */}
      <AnimatePresence>
        {[...Array(18)].map((_, i) => {
          const angle = (i / 18) * Math.PI * 2;
          const dist = 90 + Math.random() * 60;
          return (
            <motion.span
              key={i}
              className="absolute h-2 w-2 rounded-full bg-violet-400"
              style={{
                left: "50%",
                top: "50%",
                transform: "translate(-50%,-50%)",
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: Math.cos(angle) * dist,
                y: Math.sin(angle) * dist,
                opacity: 0,
                scale: 0.6,
              }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
          );
        })}
      </AnimatePresence>
    </motion.div>
  );

  // ---------- 타일 카드 ----------
  const TileCard = (t: Tile) => {
    const isEmptyHoverable = t.state === "empty" && !!selectedSeed;
    const isReadyHoverable = t.state === "ready";
    const isHoverable = isEmptyHoverable || isReadyHoverable;

    const base =
      "aspect-square rounded-lg grid place-items-center shadow-none bg-transparent relative overflow-hidden transition-colors";
    const ring =
      t.state === "ready"
        ? "ring-2 ring-emerald-300"
        : t.state === "planted"
        ? "ring-1 ring-amber-200"
        : selectedSeed
        ? "ring-1 ring-amber-300/60"
        : "";

    return (
      <motion.div
        key={t.pos}
        whileHover={
          isHoverable
            ? {
                y: -2,
                scale: 1.02,
                boxShadow: "0 10px 24px -12px rgba(16,185,129,0.45)", // emerald-ish
              }
            : undefined
        }
        transition={{ type: "spring", stiffness: 360, damping: 24, mass: 0.8 }}
        onClick={() => onTileClick(t)}
        className={cn(
          base,
          ring,
          isEmptyHoverable &&
            "hover:bg-amber-50/50 dark:hover:bg-zinc-900/30 hover:ring-2 hover:ring-amber-400/70 cursor-pointer",
          isReadyHoverable &&
            "hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 hover:ring-2 hover:ring-emerald-400/70 cursor-pointer"
        )}
      >
        <div className="w-full h-full grid place-items-center p-1.5 ">
          <img
            src={STATE_IMG[t.state]}
            alt={t.state}
            className="max-h-[70%] max-w-[70%] object-contain select-none"
            draggable={false}
          />
        </div>

        {/* 상태 라벨 */}
        <div className="absolute left-1.5 top-1.5">
          {t.state === "planted" && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
              🌱 {remainingFor(t)}
            </Badge>
          )}
          {t.state === "ready" && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
              🌸 수확 가능
            </Badge>
          )}
        </div>

        {/* 선택 힌트 */}
        {t.state === "empty" && selectedSeed && (
          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
            <img
              src={SEED_META[selectedSeed].img}
              alt=""
              className="h-3.5 w-3.5 object-contain"
            />
            클릭하여 심기
          </div>
        )}
      </motion.div>
    );
  };

  const grid = useMemo(() => {
    const list = tiles ?? [];
    return (
      <div className="grid grid-cols-3 gap-2 max-w-[420px] sm:max-w-[480px] mx-auto">
        {list.map((t) => (
          <div key={t.pos}>{TileCard(t)}</div>
        ))}
      </div>
    );
  }, [tiles, selectedSeed, seeds]);

  // 씨앗 토글 바
  const SeedToggleBar = () => {
    const Item = ({ id }: { id: SeedId }) => {
      const meta = SEED_META[id];
      const qty = seeds[id] ?? 0;
      const active = selectedSeed === id;
      const disabled = qty <= 0;

      return (
        <button
          type="button"
          onClick={() => {
            if (disabled) {
              toast.error("해당 씨앗이 없습니다 🪙");
              return;
            }
            setSelectedSeed((prev) => (prev === id ? null : id));
          }}
          // ✅ 체크 아이콘이 잘리지 않도록 overflow-visible + 아이콘 위치를 버튼 안쪽으로
          className={cn(
            "m-4 relative inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition-all overflow-visible",
            "bg-background hover:bg-muted",
            disabled && "opacity-50 cursor-not-allowed",
            active &&
              "ring-2 ring-amber-400 shadow-[0_8px_24px_-12px_rgba(245,158,11,0.55)] bg-gradient-to-r from-amber-50 to-orange-50 dark:from-zinc-900 dark:to-zinc-900"
          )}
        >
          <span className="inline-block h-6 w-6">
            <img
              src={meta.img}
              alt={meta.label}
              className="h-6 w-6 object-contain"
              draggable={false}
            />
          </span>
          <span className={cn("text-sm", active && "font-semibold")}>
            {meta.label}
          </span>
          <Badge
            variant="secondary"
            className={cn(
              "ml-1 tabular-nums text-[11px] px-2 py-0.5",
              active &&
                "bg-amber-100 text-amber-900 dark:bg-amber-300/20 dark:text-amber-200"
            )}
          >
            x{qty}
          </Badge>
          {active && (
            <span className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white shadow ring-1 ring-amber-600/60">
              <Check className="h-3.5 w-3.5" />
            </span>
          )}
        </button>
      );
    };

    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Item id={1} />
          <Item id={2} />
          <Item id={3} />
          <SeedShopButton />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <SeedToggleBar />
      {loading ? (
        <div className="text-sm text-muted-foreground py-8">불러오는 중…</div>
      ) : (
        grid
      )}

      <div className="text-xs text-muted-foreground">
        {selectedSeed ? (
          <div className="inline-flex items-center gap-2">
            <img src={SEED_META[selectedSeed].img} className="h-4 w-4" alt="" />
            선택됨:{" "}
            <span className="font-medium">
              {SEED_META[selectedSeed].label}
            </span>{" "}
            — 빈 칸을 클릭해 심으세요.
          </div>
        ) : (
          <>심을 씨앗을 먼저 선택해주세요.</>
        )}
      </div>

      {/* ======================
          꽃 수확 다이얼로그
         ====================== */}
      <Dialog open={claimOpen} onOpenChange={setClaimOpen}>
        <DialogContent className="sm:max-w-md overflow-hidden">
          <DialogHeader>
            <DialogTitle>꽃을 수확했어요! ✨</DialogTitle>
            <DialogDescription>
              인벤토리에 보관되었어요. (판매는 꽃가게에서 할 수 있어요)
            </DialogDescription>
          </DialogHeader>

          <div
            className={cn(
              "relative rounded-xl border p-4",
              claimed ? gradeTone[claimed.grade] : "bg-muted"
            )}
          >
            {/* 등급 뱃지 */}
            {claimed && (
              <Badge className="absolute right-3 top-3" variant="secondary">
                {claimed.grade}
              </Badge>
            )}

            {/* 이미지 영역 */}
            <div className="relative w-full aspect-square grid place-items-center rounded-lg bg-background/60 overflow-hidden">
              {claimed ? (
                <>
                  {/* 등급별 이펙트 */}
                  {claimed.grade === "희귀" && <RareEffect />}
                  {claimed.grade === "에픽" && <EpicEffect />}

                  <img
                    src={imgSrc(claimed.label)}
                    alt={claimed.label}
                    className="relative z-10 max-h-[85%] max-w-[85%] object-contain"
                    loading="eager"
                    decoding="sync"
                  />
                </>
              ) : (
                <div className="text-sm text-muted-foreground">로딩 중…</div>
              )}
            </div>

            {/* 이름 */}
            <div className="mt-3 text-center">
              <div className="text-base font-semibold">
                {claimed ? claimed.label : "—"}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button
              variant="secondary"
              onClick={() => setClaimOpen(false)}
              className="w-full sm:w-auto"
            >
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
