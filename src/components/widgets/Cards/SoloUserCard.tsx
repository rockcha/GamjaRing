// src/features/solo/SoloUserCard.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { useCoupleContext } from "@/contexts/CoupleContext";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import {
  HeartHandshake,
  CalendarClock,
  MessageSquareHeart,
  Music4,
  Wheat,
  Fish,
} from "lucide-react";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

import {
  section1,
  section2,
  section3,
  section4,
  section5,
} from "@/assets/solo";

type Props = { className?: string };

const AUTOPLAY_MS = 4000;

export default function SoloUserCard({ className }: Props) {
  const { user } = useUser();
  const { isCoupled, requestCouple } = useCoupleContext();
  if (isCoupled) return null;

  const [dlgOpen, setDlgOpen] = useState(false);
  const [nickname, setNickname] = useState("");
  const [sending, setSending] = useState(false);

  const isLoggedIn = !!user?.id;
  const canSend = isLoggedIn && nickname.trim().length > 0 && !sending;

  // Carousel index + API
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => setActiveIdx(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);

    // ❌ return () => api.off("select", onSelect);
    // ✅ cleanup은 'void'를 반환하도록 감싸주세요
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  // 🔁 자동 넘김 (+ 호버 시 일시정지)
  useEffect(() => {
    if (!api) return;
    if (isHovering) return; // hover 시 정지
    const id = setInterval(() => api.scrollNext(), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [api, isHovering]);

  // Features
  const features = useMemo(
    () => [
      {
        icon: <MessageSquareHeart className="h-5 w-5" />,
        title: "질문·답변",
        desc: "매일 다른 질문으로 서로를 더 알아가기",
        img: section1,
      },
      {
        icon: <CalendarClock className="h-5 w-5" />,
        title: "공유 캘린더",
        desc: "둘만의 일정과 기념일을 함께 관리",
        img: section2,
      },
      {
        icon: <Wheat className="h-5 w-5" />,
        title: "농장과 조리실",
        desc: "재료를 모으고 조리실에서 요리를 완성",
        img: section3,
      },
      {
        icon: <Fish className="h-5 w-5" />,
        title: "낚시와 수족관 관리",
        desc: "낚시하고 수족관에서 생물을 수집·관리",
        img: section4,
      },
      {
        icon: <Music4 className="h-5 w-5" />,
        title: "그 밖의 여러 기능들",
        desc: "간단한 미니게임과 타로카드, 날씨 열람, 우리만의 음악까지",
        img: section5,
      },
    ],
    []
  );

  const handleOpen = () => {
    if (!isLoggedIn) return toast.info("로그인이 필요합니다.");
    setDlgOpen(true);
  };

  const handleSend = async () => {
    if (!canSend) return;
    setSending(true);
    try {
      const { error } = await requestCouple(nickname.trim());
      if (error) {
        toast.error(error.message || "요청 전송 중 오류가 발생했습니다.");
      } else {
        toast.success("커플 요청을 전송했습니다 💌");
        setDlgOpen(false);
        setNickname("");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Card className={cn("bg-white overflow-hidden", className)}>
        <CardHeader className="pb-1 text-center">
          <CardTitle className="text-xl text-[#3d2b1f] flex items-center justify-center gap-2">
            감자링에 오신 걸 환영합니다!
          </CardTitle>

          {/* 시선집중 CTA */}
          <div className="mt-4 flex justify-center">
            <Button
              size="sm"
              onClick={handleOpen}
              title="커플 신청하기"
              aria-label="커플 신청하기"
              className={cn(
                // base
                "relative group gap-2 rounded-full px-5 py-2.5",
                "font-semibold text-white transition-all duration-200",
                // gradient + ring + shadow
                "bg-gradient-to-r from-amber-500 via-rose-400 to-pink-500",
                "shadow-lg shadow-amber-500/30 ring-1 ring-white/20",
                // hover / active
                "hover:scale-[1.03] active:scale-[0.98]",
                "hover:shadow-rose-400/40",
                // subtle glow (radial) using ::before
                "overflow-hidden",
                "before:absolute before:inset-[-25%]",
                "before:content-[''] before:rounded-[50%]",
                "before:bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.35),transparent_60%)]",
                "before:opacity-0 group-hover:before:opacity-100 before:transition-opacity before:duration-300 before:blur-xl"
              )}
            >
              <HeartHandshake className="h-4 w-4 drop-shadow" />
              커플 신청하기
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-3">
          <div
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="rounded-xl"
          >
            <Carousel
              setApi={setApi}
              className="w-full max-w-2xl md:max-w-3xl mx-auto"
              opts={{ loop: true, align: "start" }}
            >
              <CarouselContent>
                {features.map((f, i) => (
                  <CarouselItem key={i}>
                    <div className="rounded-2xl border p-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                      {/* 아이콘/제목/설명 */}
                      <div className="mb-3 flex items-start gap-2">
                        <div className="shrink-0 text-amber-700">{f.icon}</div>
                        <div className="min-w-0">
                          <div className="text-[15px] font-semibold text-[#3d2b1f]">
                            {f.title}
                          </div>
                          <p className="text-xs text-[#6b533b] mt-1">
                            {f.desc}
                          </p>
                        </div>
                      </div>

                      {/* 대표 이미지 */}
                      <div className="relative overflow-hidden rounded-xl bg-neutral-100">
                        <div className="aspect-[16/9]">
                          <img
                            src={f.img}
                            alt={f.title}
                            className="w-full h-full object-cover transition-transform duration-300 ease-out transform-gpu hover:scale-[1.03]"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>

                        {/* 인덱스 배지 */}
                        <div className="absolute bottom-2 left-2">
                          <span className="px-2 py-1 text-xs rounded-md bg-white/90 border">
                            {i + 1} / {features.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>

              <CarouselPrevious className="left-1 top-1/2 -translate-y-1/2 hover:cursor-pointer" />
              <CarouselNext className="right-1 top-1/2 -translate-y-1/2 hover:cursor-pointer" />
            </Carousel>
          </div>

          {/* 도트 인디케이터 */}
          <div className="mt-3 flex justify-center gap-1.5">
            {features.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-all",
                  i === activeIdx ? "bg-amber-600 w-6" : "bg-amber-300"
                )}
              />
            ))}
          </div>

          {/* 하단 TIP */}
          <p className="mt-4 text-xs text-[#6b533b] text-center">
            TIP: 커플이 되어야 모든 기능을 이용할 수 있어요.
          </p>
        </CardContent>
      </Card>

      {/* 닉네임 다이얼로그 */}
      <Dialog
        open={dlgOpen}
        onOpenChange={(v) => {
          setDlgOpen(v);
          if (!v) setNickname("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>닉네임을 입력하세요</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Input
              placeholder="상대방 닉네임"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              상대방의 프로필 닉네임을 정확히 입력해 주세요.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDlgOpen(false)}
              className="hover:cursor-pointer"
              disabled={sending}
            >
              취소
            </Button>
            <Button
              onClick={handleSend}
              className="hover:cursor-pointer"
              disabled={!canSend}
            >
              {sending ? "전송 중..." : "전송"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
