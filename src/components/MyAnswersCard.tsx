// src/components/MyAnswersCard.tsx
import { useEffect, useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import { GetQuestionById } from "@/utils/GetQuestionById";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Separator } from "./ui/separator";

interface AnswerItem {
  question_id: number;
  content: string;
  created_at: string;
  emoji_type_id: number | null; // ✅ 이모지 FK
}
interface AnswerWithQuestion extends AnswerItem {
  questionText: string;
}

const ITEMS_PER_PAGE = 4;

export default function MyAnswersCard() {
  const { user } = useUser();
  const [answers, setAnswers] = useState<AnswerWithQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // dialog
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupTitle, setPopupTitle] = useState("");
  const [popupContent, setPopupContent] = useState("");

  // ✅ 이모지 id -> 문자 매핑
  const [emojiMap, setEmojiMap] = useState<Record<number, string>>({});

  useEffect(() => {
    const fetchMyAnswers = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("answer")
        .select("question_id, content, created_at, emoji_type_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ 내 답변 불러오기 실패:", error.message);
        return;
      }

      // 필요한 이모지 id 수집 후 한번에 조회
      const emojiIds = Array.from(
        new Set(
          (data ?? [])
            .map((d) => d.emoji_type_id)
            .filter((v): v is number => typeof v === "number")
        )
      );
      if (emojiIds.length > 0) {
        const { data: emojiRows, error: emojiErr } = await supabase
          .from("emoji_type")
          .select("id, char")
          .in("id", emojiIds);

        if (!emojiErr && emojiRows) {
          const map: Record<number, string> = {};
          for (const row of emojiRows) map[row.id] = row.char;
          setEmojiMap(map);
        }
      } else {
        setEmojiMap({});
      }

      const enriched = await Promise.all(
        (data ?? []).map(async (item) => {
          const questionText = await GetQuestionById(item.question_id);
          return { ...item, questionText: questionText ?? "" };
        })
      );

      setAnswers(enriched);
      setCurrentPage(1);
      setLoading(false);
    };

    fetchMyAnswers();
  }, [user?.id]);

  const totalPages = Math.max(1, Math.ceil(answers.length / ITEMS_PER_PAGE));
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentAnswers = answers.slice(start, start + ITEMS_PER_PAGE);

  // createdAt: UTC → KST 비교/표시
  const getFormattedDate = (createdAt: string) => {
    const tz = "Asia/Seoul";
    const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: tz });
    const createdDateStr = new Date(createdAt).toLocaleDateString("sv-SE", {
      timeZone: tz,
    });
    const isToday = todayStr === createdDateStr;

    const formattedDate = new Date(createdAt).toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
      timeZone: tz,
    });

    return { isToday, formattedDate };
  };

  // 로딩 스켈레톤
  if (loading) {
    return (
      <Card className="h-[420px] flex flex-col">
        <CardContent className="flex-1 space-y-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
        <CardFooter className="justify-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </CardFooter>
      </Card>
    );
  }

  return (
    <>
      <div className="h-[420px] flex flex-col ">
        <CardContent className="flex-1 overflow-y-auto space-y-2">
          {currentAnswers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              아직 내 답변이 없습니다.
            </p>
          ) : (
            currentAnswers.map((item) => {
              const { isToday, formattedDate } = getFormattedDate(
                item.created_at
              );
              const emojiChar =
                item.emoji_type_id != null
                  ? emojiMap[item.emoji_type_id]
                  : null;

              return (
                <button
                  key={`${item.question_id}-${item.created_at}`}
                  onClick={() => {
                    setPopupTitle(item.questionText);
                    setPopupContent(item.content);
                    setPopupOpen(true);
                  }}
                  className="relative w-full text-left bg-amber-50 border rounded-md p-4 hover:bg-amber-100 transition focus:outline-none"
                >
                  {/* ✅ 우상단 이모지/없음 배지 */}
                  <div className="absolute top-2 right-2 pointer-events-none">
                    {item.emoji_type_id == null ? (
                      <div className="h-8 w-8 grid place-items-center rounded-full bg-white border shadow">
                        <span className="text-[10px] text-muted-foreground"></span>
                      </div>
                    ) : (
                      <div className="h-8 w-8 grid place-items-center rounded-full bg-white border shadow text-lg">
                        {emojiChar ?? "…"}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-muted-foreground">
                      {formattedDate}
                    </span>
                    {isToday && (
                      <span className="text-[10px] text-pink-500 font-bold animate-pulse">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground font-medium truncate">
                    {item.questionText}
                  </p>
                </button>
              );
            })
          )}
        </CardContent>

        <CardFooter className="justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Prev
          </Button>

          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => {
              const page = i + 1;
              const active = currentPage === page;
              return (
                <Button
                  key={page}
                  size="sm"
                  variant={active ? "secondary" : "outline"}
                  onClick={() => setCurrentPage(page)}
                  className={active ? "font-bold" : ""}
                >
                  {page}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardFooter>
      </div>

      {/* Dialog */}
      <Dialog open={popupOpen} onOpenChange={setPopupOpen}>
        <DialogOverlay className="bg-black/10 backdrop-blur-[2px]" />
        <DialogContent className="sm:max-w-2xl max-w-[92vw]">
          <DialogHeader>
            <div className="flex justify-center">
              <DialogTitle className="text-base font-semibold leading-6">
                {popupTitle}
              </DialogTitle>
            </div>
          </DialogHeader>
          <Separator />
          <div className="ml-4 mt-2 max-h-[70vh] overflow-auto whitespace-pre-wrap text-sm leading-6 text-foreground/80">
            {popupContent}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="secondary" onClick={() => setPopupOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
