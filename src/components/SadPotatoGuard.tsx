// src/components/SadPotatoGuard.tsx
"use client";

import { useState } from "react";
import { useCoupleContext } from "@/contexts/CoupleContext";

// shadcn/ui
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Check, AlertTriangle } from "lucide-react";

interface Props {
  /** 이미지 경로 (기본: /images/potato-sad.png) */
  imageSrc?: string;
  /** 메인 안내 문구 */
  message?: string;
  /** 추가 힌트 문구 (선택) */
  hint?: string;
  /** 요청 버튼 노출 여부 */
  showRequestButton?: boolean;
  /** 요청 버튼 라벨 */
  requestText?: string;
  /** 커스텀 클릭 핸들러(있으면 다이얼로그 대신 이 핸들러 호출) */
  onRequestClick?: () => void;
  /** 래퍼에 추가 클래스 */
  className?: string;
}

export default function SadPotatoGuard({
  imageSrc = "/images/potato-sad.png",
  message = "커플이 아닙니다.",
  hint = "상대 닉네임으로 요청을 보내보세요",
  showRequestButton = true,
  requestText = "커플 요청",
  onRequestClick,
  className = "",
}: Props) {
  const { requestCouple } = useCoupleContext();

  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const handleOpen = () => {
    if (onRequestClick) {
      onRequestClick();
      return;
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setNickname("");
    setSubmitting(false);
    setFeedback(null);
  };

  const handleSubmit = async () => {
    if (!nickname.trim()) {
      setFeedback({ ok: false, text: "닉네임을 입력해 주세요." });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const { error } = await requestCouple(nickname.trim());
      if (error) {
        setFeedback({ ok: false, text: `❗ ${error.message}` });
      } else {
        setFeedback({ ok: true, text: "요청이 성공적으로 전송되었습니다! 💌" });
      }
    } catch (e) {
      setFeedback({
        ok: false,
        text: "요청 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Card
        className={[
          "min-h-[40vh] w-full flex items-center justify-center rounded-xl bg-white",
          className,
        ].join(" ")}
      >
        <CardContent className="max-w-[520px] w-full text-center p-6 sm:p-8">
          <img
            src={imageSrc}
            alt="속상한 감자"
            className="mx-auto w-36 h-36 sm:w-40 sm:h-40 object-contain mb-5 select-none"
            draggable={false}
          />

          <p className="text-[#5b3d1d] text-lg sm:text-xl font-semibold leading-relaxed">
            {message}
          </p>

          {hint && (
            <p className="mt-2 text-[15px] sm:text-base text-[#6b533b]">
              {hint}
            </p>
          )}

          {showRequestButton && (
            <div className="mt-4 flex justify-center">
              <Button
                onClick={handleOpen}
                className="rounded-lg px-5"
                size="sm"
              >
                💌 {requestText}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 닉네임 입력 다이얼로그 */}
      <Dialog
        open={open}
        onOpenChange={(o) => (o ? setOpen(true) : handleClose())}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>상대 닉네임을 입력해 주세요</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="partner-nickname">닉네임</Label>
              <Input
                id="partner-nickname"
                placeholder="닉네임 입력"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={submitting}
              />
            </div>

            {feedback && (
              <Alert variant={feedback.ok ? "default" : "destructive"}>
                <div className="flex items-center gap-2">
                  {feedback.ok ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <AlertDescription>{feedback.text}</AlertDescription>
                </div>
              </Alert>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleClose}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  보내는 중…
                </>
              ) : (
                <>요청 보내기</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
