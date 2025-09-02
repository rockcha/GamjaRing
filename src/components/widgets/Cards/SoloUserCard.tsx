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
  FlaskConical,
} from "lucide-react";

// ✅ Carousel
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

// 이미지 named import
import { section1, section2, section3, section4 } from "@/assets/solo";

type Props = { className?: string };

export default function SoloUserCard({ className }: Props) {
  const { user } = useUser();
  const { isCoupled, requestCouple } = useCoupleContext();

  if (isCoupled) return null;

  const [dlgOpen, setDlgOpen] = useState(false);
  const [nickname, setNickname] = useState("");
  const [sending, setSending] = useState(false);

  const isLoggedIn = !!user?.id;
  const canSend = isLoggedIn && nickname.trim().length > 0 && !sending;

  // Carousel index
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  useEffect(() => {
    if (!api) return;
    const onSelect = () => setActiveIdx(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  // 순서: 질문답변 → 공유 캘린더 → 타로-노래 → 실험실
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
        icon: <Music4 className="h-5 w-5" />,
        title: "타로-노래",
        desc: "오늘의 기분과 어울리는 타로 & 추천 음악",
        img: section3,
      },
      {
        icon: <FlaskConical className="h-5 w-5" />,
        title: "실험실",
        desc: "여러가지 컨텐츠를 실험중이예요",
        img: section4,
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
      if (error)
        toast.error(error.message || "요청 전송 중 오류가 발생했습니다.");
      else {
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
        <CardHeader className="pb-3 text-center">
          <CardTitle className="text-xl text-[#3d2b1f] flex items-center justify-center gap-2">
            <HeartHandshake className="h-5 w-5 text-amber-600" />
            감자링에 오신 걸 환영합니다!
          </CardTitle>
          <p className="text-sm text-[#6b533b] mt-2">
            커플이 되어야 모든 기능을 사용할 수 있어요.
          </p>
        </CardHeader>

        <CardContent className="pt-4">
          <Carousel
            setApi={setApi}
            className="w-full max-w-2xl md:max-w-3xl mx-auto"
            opts={{ loop: true, align: "start" }}
          >
            <CarouselContent>
              {features.map((f, i) => (
                <CarouselItem key={i} className="">
                  <div className="rounded-2xl border p-3">
                    {/* 대표 이미지 (크게 + hover scale) */}
                    <div className="relative overflow-hidden rounded-xl bg-neutral-100">
                      {/* 더 크게 보이도록 4/3 비율 */}
                      <div className="aspect-[4/3]">
                        <img
                          src={f.img}
                          alt={f.title}
                          className="
                            w-full h-full object-cover
                            transition-transform duration-300 ease-out transform-gpu
                            hover:scale-[1.03]
                          "
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

                    {/* 타이틀 & 설명 */}
                    <div className="mt-3 flex items-start gap-2">
                      <div className="shrink-0 text-amber-700">{f.icon}</div>
                      <div className="min-w-0">
                        <div className="text-[15px] font-semibold text-[#3d2b1f]">
                          {f.title}
                        </div>
                        <p className="text-xs text-[#6b533b] mt-1">{f.desc}</p>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>

            <CarouselPrevious className="left-1 top-1/2 -translate-y-1/2 hover:cursor-pointer" />
            <CarouselNext className="right-1 top-1/2 -translate-y-1/2 hover:cursor-pointer" />
          </Carousel>

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

          <p className="mt-4 text-xs text-[#6b533b] text-center">
            TIP: 커플 연결 후 질문·답변, 캘린더, 타로-노래, 실험실 등 모든
            기능이 활성화됩니다.
          </p>
        </CardContent>
      </Card>

      {/* 좌하단 플로팅 CTA */}
      <Button
        size="sm"
        onClick={handleOpen}
        className={cn(
          "fixed bottom-4 left-4 z-50 gap-2 rounded-full shadow-lg hover:cursor-pointer",
          "px-4 py-2"
        )}
        title="커플 신청하기"
        aria-label="커플 신청하기"
      >
        <HeartHandshake className="h-4 w-4" />
        커플 신청하기
      </Button>

      {/* 닉네임 입력 다이얼로그 */}
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
