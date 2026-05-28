// src/features/music/CoupleMusicCard.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { sendUserNotification } from "@/utils/notification/sendUserNotification";

// shadcn/ui
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// icons
import { PencilLine, Check, X, Play, Pause } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMusic } from "@fortawesome/free-solid-svg-icons";

/* =========================
 * Utilities
 * =======================*/
// --- YT 글로벌 타입(간단 선언) ---
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function extractYouTubeId(u: string) {
  try {
    const s = u.trim();
    if (/^[\w-]{11}$/.test(s)) return s;
    const url = new URL(s);
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1);
    if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/")[2];
    const v = url.searchParams.get("v");
    if (v) return v;
  } catch {}
  return null;
}

// 유튜브 IFrame API 로더
async function ensureYouTubeApi() {
  if (window.YT?.Player) return;
  await new Promise<void>((resolve) => {
    const existing = document.getElementById("yt-iframe-api");
    if (existing) {
      if (window.YT?.Player) resolve();
      else {
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          prev?.();
          resolve();
        };
      }
      return;
    }
    const tag = document.createElement("script");
    tag.id = "yt-iframe-api";
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => resolve();
  });
}

/* =========================
 * Soft UI Atoms
 * =======================*/
function SoftStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={[
        "ml-2 inline-flex items-center gap-1.5 rounded-full pl-1.5 pr-2 py-1 text-[11px] font-medium",
        active
          ? "bg-emerald-100/80 text-emerald-800 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.25)]"
          : "bg-rose-100/80 text-rose-800 shadow-[inset_0_0_0_1px_rgba(244,63,94,0.25)]",
      ].join(" ")}
      aria-live="polite"
    >
      <span className="relative inline-grid place-items-center h-3.5 w-3.5">
        <span
          className={[
            "absolute inset-0 rounded-full border-2 border-t-transparent",
            active
              ? "border-emerald-400/60 motion-safe:animate-[spin_1.2s_linear_infinite]"
              : "border-rose-300/70",
          ].join(" ")}
        />
        <span
          className={[
            "h-1.5 w-1.5 rounded-full shadow-sm",
            active ? "bg-emerald-500" : "bg-rose-500",
          ].join(" ")}
        />
      </span>
      {active ? "재생중" : "일시정지"}
    </span>
  );
}

function SoftPlayOverlay({
  isAudible,
  label,
}: {
  isAudible: boolean;
  label: string;
}) {
  return (
    <>
      {/* 소프트 글로우 링 */}
      <div
        className={[
          "pointer-events-none absolute inset-0",
          "bg-gradient-to-b from-white/10 via-white/0 to-black/20",
          "mix-blend-soft-light",
        ].join(" ")}
      />
      {/* 중앙 플레이 버튼 */}
      <div className="absolute inset-0 grid place-items-center">
        <div
          className={[
            "relative size-16 rounded-full backdrop-blur-md",
            "bg-white/55 shadow-[0_8px_30px_rgba(0,0,0,0.12)]",
            "ring-1 ring-black/5",
          ].join(" ")}
        >
          {/* 맥박 애니메이션 (재생 전 강조) */}
          <span
            className={[
              "absolute inset-0 rounded-full",
              "motion-safe:animate-[ping_1.6s_ease-in-out_infinite]",
              isAudible ? "hidden" : "bg-white/50",
            ].join(" ")}
          />
          <div className="absolute inset-0 grid place-items-center">
            {isAudible ? (
              <Pause className="h-6 w-6 text-neutral-700 opacity-90" />
            ) : (
              <Play className="h-6 w-6 translate-x-[1px] text-neutral-700 opacity-90" />
            )}
          </div>
        </div>
      </div>
      <span className="sr-only">{label}</span>
    </>
  );
}

/* =========================
 * Main Component
 * =======================*/
export default function CoupleMusicCard({ className }: { className?: string }) {
  const { user } = useUser();
  const coupleId = user?.couple_id ?? null;

  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState<string | null>(null);

  // 편집 다이얼로그
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  // ▶ 썸네일 클릭 여부 (재생/일시정지는 유튜브가 관리)
  const [playerOpen, setPlayerOpen] = useState(false);

  // ▶ 실제로 "소리"가 나오고 있는지 추정값 (재생중 배지 기준)
  const [isAudible, setIsAudible] = useState(false);

  const videoId = useMemo(() => (url ? extractYouTubeId(url) : null), [url]);
  const draftId = useMemo(
    () => (draft ? extractYouTubeId(draft) : null),
    [draft]
  );
  const thumb = useMemo(
    () =>
      videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null,
    [videoId]
  );

  // YT player 참조
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!coupleId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("couples")
        .select("couple_music_url")
        .eq("id", coupleId)
        .maybeSingle();
      if (!error) setUrl(data?.couple_music_url ?? null);
      setLoading(false);
    })();
  }, [coupleId]);

  const onOpen = () => {
    setDraft(url ?? "");
    setOpen(true);
  };

  const onSave = async () => {
    if (!coupleId) return;
    if (draft.trim() && !draftId) {
      toast.warning("유효한 YouTube 링크(ID)를 입력해 주세요.");
      return;
    }
    try {
      setSaving(true);
      const next = draft.trim() || null;
      const { error } = await supabase
        .from("couples")
        .update({ couple_music_url: next })
        .eq("id", coupleId);
      if (error) throw error;

      try {
        if (next && user?.partner_id) {
          await sendUserNotification({
            senderId: user.id,
            receiverId: user.partner_id,
            type: "음악등록",
            senderNickname: user.nickname,
          });
        }
      } catch {
        /* 알림 실패는 UI 막지 않음 */
      }

      setUrl(next);
      setPlayerOpen(false); // 저장 후 썸네일로
      setOpen(false);
      toast.success(
        next ? "커플 음악을 업데이트했어요 🎵" : "커플 음악 링크를 비웠어요."
      );
    } catch (e: any) {
      toast.error(e?.message ?? "저장 중 오류가 발생했어요.");
    } finally {
      setSaving(false);
    }
  };

  // --- 유튜브 소리 감지 + 종료 시 썸네일 복귀 ---
  useEffect(() => {
    let canceled = false;

    const destroy = () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      try {
        playerRef.current?.destroy?.();
      } catch {}
      playerRef.current = null;
      setIsAudible(false);
    };

    const updateAudible = () => {
      const YT = window.YT;
      const p = playerRef.current;
      if (!YT || !p) return setIsAudible(false);
      const state = p.getPlayerState?.();
      const vol = p.getVolume?.() ?? 100;
      const muted = p.isMuted?.() ?? false;
      const playing = state === YT.PlayerState.PLAYING;
      setIsAudible(Boolean(playing && !muted && vol > 0));
    };

    const setup = async () => {
      if (!playerOpen || !videoId || !playerHostRef.current) {
        destroy();
        return;
      }
      await ensureYouTubeApi();
      if (canceled) return;

      destroy(); // 기존 플레이어 정리
      const YT = window.YT;
      playerRef.current = new YT.Player(playerHostRef.current, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          autoplay: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => updateAudible(),
          onStateChange: (e: any) => {
            updateAudible();
            if (e?.data === YT.PlayerState.ENDED) {
              // 끝나면 썸네일로 자동 복귀
              setPlayerOpen(false);
            }
          },
        },
      });

      // 볼륨/뮤트는 이벤트가 따로 없어 폴링
      pollRef.current = window.setInterval(updateAudible, 500);
    };

    setup();

    return () => {
      canceled = true;
      destroy();
    };
  }, [playerOpen, videoId]);

  return (
    <Card
      className={[
        "relative flex flex-col overflow-hidden",
        "rounded-2xl border border-slate-200/70",
        "bg-white",
        "shadow-sm",
        className ?? "",
      ].join(" ")}
    >
      {/* 몽글 배경 버블 */}
      <div
        aria-hidden
        className="hidden"
        style={{ animationDelay: "0.2s" }}
      />
      <div
        aria-hidden
        className="hidden"
        style={{ animationDelay: "0.6s" }}
      />
      <div
        aria-hidden
        className="hidden"
        style={{ animationDelay: "1s" }}
      />

      <CardHeader className="shrink-0 px-4 pb-2 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex min-w-0 items-center text-base font-semibold text-slate-900">
            <span className="relative mr-2 grid size-8 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600 ring-1 ring-rose-100">
              <span className="absolute -inset-1 rounded-full bg-white/60 blur-md" />
              <FontAwesomeIcon
                icon={faMusic}
                className="relative z-10 opacity-90"
              />
            </span>
            우리의 음악
            <SoftStatusBadge active={isAudible} />
          </CardTitle>

          <Button
            size="sm"
            variant="outline"
            onClick={onOpen}
            className="h-8 shrink-0 gap-1 rounded-lg bg-white px-2 text-xs hover:cursor-pointer"
          >
            <PencilLine className="h-4 w-4" />
            수정
          </Button>
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 px-4 pb-4 pt-0">
        {loading ? (
          <div className="flex h-full flex-col">
            <div className="flex min-h-0 w-full flex-1 flex-col">
              <div className="relative min-h-0 flex-1">
                {/* 말랑 프레임 */}
                <div className="relative h-full min-h-[132px] overflow-hidden rounded-xl ring-1 ring-slate-100">
                  <Skeleton className="absolute inset-0 rounded-xl" />
                </div>
                {/* 하단 말풍선 배경 */}
                <div className="mt-2 text-center text-xs text-slate-500">
                  로딩중이에요… 감자를 살짝 조물조물 중 🥔
                </div>
              </div>
            </div>
          </div>
        ) : url && videoId ? (
          <div className="flex h-full flex-col">
            <div className="flex min-h-0 w-full flex-1 flex-col">
              <div className="relative min-h-0 flex-1">
                <div
                  className={[
                    "relative h-full min-h-[132px] overflow-hidden rounded-xl",
                    "ring-1 ring-slate-200",
                    "shadow-sm",
                    isAudible ? "outline outline-2 outline-emerald-200" : "",
                    "transition-all duration-500",
                  ].join(" ")}
                >
                  {playerOpen ? (
                    <div ref={playerHostRef} className="w-full h-full" />
                  ) : (
                    <button
                      onClick={() => setPlayerOpen(true)}
                      className="relative h-full w-full outline-none transition-transform duration-300 hover:scale-[1.01] focus-visible:scale-[1.01]"
                      title="재생"
                      aria-label="재생"
                      type="button"
                    >
                      {thumb && (
                        <img
                          src={thumb}
                          alt="thumbnail"
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      )}
                      {/* 소프트 그라데이션 베일 */}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent" />
                      <SoftPlayOverlay isAudible={false} label="재생" />
                    </button>
                  )}
                </div>

                {/* 아랫쪽 캡션 바 */}
                <div
                  className={[
                    "mt-2 truncate text-center text-xs text-slate-500",
                  ].join(" ")}
                >
                  {url
                    ? "커플 대표 음악이 준비됐어요 ♫"
                    : "아직 등록된 음악이 없어요"}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={[
              "flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500",
            ].join(" ")}
          >
            등록된 YouTube 링크가 없어요.{" "}
            <span className="font-medium">‘수정’</span> 버튼을 눌러
            설정해보세요.
          </div>
        )}
      </CardContent>

      {/* 수정 다이얼로그 */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setDraft("");
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>음악 링크 설정</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              placeholder="YouTube 링크 또는 영상 ID(11자)"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="text-xs text-muted-foreground">
              예) <code>https://www.youtube.com/watch?v=dQw4w9WgXcQ</code> 또는{" "}
              <code>dQw4w9WgXcQ</code>
            </div>

            {draft ? (
              draftId ? (
                <div className="mt-2">
                  <div className="text-xs mb-1 text-[#3d2b1f] font-medium">
                    미리보기
                  </div>
                  <div className="w-full max-w-md aspect-video overflow-hidden rounded-xl border ring-1 ring-black/5 shadow-lg">
                    <iframe
                      key={draftId}
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${draftId}?rel=0&modestbranding=1&playsinline=1`}
                      title="Preview"
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-red-600">
                  올바른 YouTube 링크(ID)를 입력해 주세요.
                </p>
              )
            ) : (
              <p className="text-xs text-muted-foreground">
                비워두면 링크가 제거됩니다.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="gap-1 hover:cursor-pointer rounded-full"
              disabled={saving}
            >
              <X className="h-4 w-4" />
              취소
            </Button>
            <Button
              onClick={onSave}
              className="gap-1 hover:cursor-pointer rounded-full"
              disabled={saving}
            >
              <Check className="h-4 w-4" />
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* =========================
 * CSS keyframes (Tailwind layer)
 * - 프로젝트 전역 css(예: globals.css)에 추가해두면 더 깔끔.
 * - 컴포넌트 단독 사용도 가능하게 여기 주석으로 첨부.
 * =======================*/
/*
@layer utilities {
  @keyframes float {
    0%   { transform: translateY(0px) translateX(0px); }
    50%  { transform: translateY(-8px) translateX(3px); }
    100% { transform: translateY(0px) translateX(0px); }
  }
}
*/
