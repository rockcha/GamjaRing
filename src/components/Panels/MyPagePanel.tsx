// src/pages/MyPagePanel.tsx
import { useEffect, useMemo, useState } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import Popup from "../widgets/Popup";
import UnlinkButton from "../tests/UnlinkButton";

// ✅ shadcn/ui
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";

// ✅ icons
import {
  PencilLine,
  Save,
  X,
  CalendarDays,
  UserRound,
  HeartHandshake,
  Trash2,
} from "lucide-react";

type CoupleRow = {
  id: string;
  user1_id: string;
  user2_id: string;
  started_at: string | null;
  created_at: string;
};

export default function MyPagePanel() {
  const { user, fetchUser } = useUser();
  const [loading, setLoading] = useState(true);

  // 토스트
  const [toast, setToast] = useState<{ show: boolean; msg: string }>({
    show: false,
    msg: "",
  });
  const openToast = (msg: string, ms = 2200) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: "" }), ms);
  };

  // 가입일
  const [signupDate, setSignupDate] = useState<string>("");

  // 닉네임 편집
  const [editingNick, setEditingNick] = useState(false);
  const [nickInput, setNickInput] = useState(user?.nickname ?? "");
  const [savingNick, setSavingNick] = useState(false);

  // 커플 정보
  const [couple, setCouple] = useState<CoupleRow | null>(null);
  const [partnerNickname, setPartnerNickname] = useState<string>("");
  const isCoupled = !!user?.partner_id;

  // D-Day(만난날짜) 편집
  const [ddayInput, setDdayInput] = useState<string>(""); // yyyy-mm-dd
  const [savingDday, setSavingDday] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!user?.id) return;
      setLoading(true);

      // 1) 가입일
      const { data } = await supabase.auth.getUser();
      const createdAt = data.user?.created_at ?? null;
      if (createdAt) setSignupDate(createdAt.slice(0, 10));

      // 2) 닉네임 동기화
      setNickInput(user.nickname ?? "");

      // 3) 커플 정보
      if (isCoupled && user.couple_id) {
        const { data: cRow, error: cErr } = await supabase
          .from("couples")
          .select("id, user1_id, user2_id, started_at, created_at")
          .eq("id", user.couple_id)
          .maybeSingle();

        if (!cErr && cRow) {
          setCouple(cRow as CoupleRow);

          const partnerId =
            cRow.user1_id === user.id ? cRow.user2_id : cRow.user1_id;
          const { data: p, error: pErr } = await supabase
            .from("users")
            .select("nickname")
            .eq("id", partnerId)
            .maybeSingle();
          if (!pErr && p) setPartnerNickname(p.nickname ?? "");

          if (cRow.started_at) setDdayInput(cRow.started_at.slice(0, 10));
        }
      } else {
        setCouple(null);
        setPartnerNickname("");
        setDdayInput("");
      }

      setLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.couple_id, user?.partner_id]);

  // D-Day 계산
  const ddayText = useMemo(() => {
    if (!couple?.started_at) return "-";
    const start = new Date(couple.started_at);
    const today = new Date();
    const diff = Math.floor(
      (new Date(today.toDateString()).getTime() -
        new Date(start.toDateString()).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return `D+${Math.max(0, diff)}`;
  }, [couple?.started_at]);

  // 닉네임 저장
  const saveNickname = async () => {
    if (!user?.id) return;
    const newNick = nickInput.trim();
    if (!newNick) {
      openToast("닉네임을 입력해 주세요.");
      return;
    }
    setSavingNick(true);
    const { error } = await supabase
      .from("users")
      .update({ nickname: newNick })
      .eq("id", user.id);
    setSavingNick(false);
    if (error) {
      openToast(`닉네임 수정 실패: ${error.message}`);
      return;
    }
    openToast("닉네임이 수정되었습니다.");
    setEditingNick(false);
    await fetchUser?.();
  };

  // D-Day 저장
  const saveDday = async () => {
    if (!user?.couple_id) return;
    if (!ddayInput) {
      openToast("날짜를 선택해 주세요.");
      return;
    }
    setSavingDday(true);
    const { error } = await supabase
      .from("couples")
      .update({ started_at: ddayInput })
      .eq("id", user.couple_id);
    setSavingDday(false);
    if (error) {
      openToast(`디데이 수정 실패: ${error.message}`);
      return;
    }
    openToast("디데이가 수정되었습니다.");
    setCouple((prev) => (prev ? { ...prev, started_at: ddayInput } : prev));
  };

  // 회원탈퇴(추후)
  const handleDeleteAccount = () => {
    openToast("회원탈퇴는 추후 구현 예정입니다.");
  };

  if (loading) {
    return (
      <main className="w-full max-w-2xl mx-auto px-4 py-6 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>내 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-9 w-28" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>커플 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-9 w-28" />
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="w-full max-w-2xl mx-auto px-4 py-6 space-y-8">
      {/* 내 정보 */}
      <Card className="bg-amber-50 border-amber-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-[#b75e20]">
            <UserRound className="h-5 w-5" />내 정보
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 space-y-5">
          {/* 닉네임 */}
          <div className="grid grid-cols-12 items-center gap-3">
            <Label className="col-span-4 sm:col-span-3 text-[#6b533b]">
              닉네임
            </Label>
            {editingNick ? (
              <div className="col-span-8 sm:col-span-9 flex items-center gap-2">
                <Input
                  value={nickInput}
                  onChange={(e) => setNickInput(e.target.value)}
                  placeholder="닉네임 입력"
                  className="flex-1"
                />
                <Button
                  onClick={saveNickname}
                  disabled={savingNick}
                  className="gap-1"
                >
                  {savingNick ? (
                    "저장중…"
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      저장
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingNick(false);
                    setNickInput(user?.nickname ?? "");
                  }}
                  className="gap-1"
                >
                  <X className="h-4 w-4" />
                  취소
                </Button>
              </div>
            ) : (
              <div className="col-span-8 sm:col-span-9 flex items-center justify-between">
                <span className="text-sm sm:text-base">
                  {user?.nickname ?? "-"}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setEditingNick(true)}
                  className="gap-1"
                >
                  <PencilLine className="h-4 w-4" />
                  수정
                </Button>
              </div>
            )}
          </div>

          {/* 가입날짜 */}
          <div className="grid grid-cols-12 items-center gap-3">
            <Label className="col-span-4 sm:col-span-3 text-[#6b533b]">
              가입날짜
            </Label>
            <div className="col-span-8 sm:col-span-9 flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <CalendarDays className="h-4 w-4" />
                {signupDate || "-"}
              </Badge>
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            variant="destructive"
            onClick={handleDeleteAccount}
            className="gap-1"
          >
            <Trash2 className="h-4 w-4" />
            회원탈퇴
          </Button>
        </CardFooter>
      </Card>

      {/* 커플 정보 */}
      <Card className="bg-amber-50 border-amber-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-[#b75e20]">
            <HeartHandshake className="h-5 w-5" />
            커플 정보
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 space-y-5">
          {!isCoupled || !couple ? (
            <div className="text-sm text-[#6b533b]">
              새로운 인연을 찾아보세요 💫
            </div>
          ) : (
            <>
              <div className="grid grid-cols-12 items-center gap-3">
                <Label className="col-span-4 sm:col-span-3 text-[#6b533b]">
                  커플 닉네임
                </Label>
                <div className="col-span-8 sm:col-span-9">
                  <span className="text-sm sm:text-base">
                    {partnerNickname || "-"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-12 items-center gap-3">
                <Label className="col-span-4 sm:col-span-3 text-[#6b533b]">
                  디데이
                </Label>
                <div className="col-span-8 sm:col-span-9">
                  <Badge variant="outline">{ddayText}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-12 items-center gap-3">
                <Label className="col-span-4 sm:col-span-3 text-[#6b533b]">
                  만난날짜
                </Label>
                <div className="col-span-8 sm:col-span-9 flex items-center gap-2">
                  <Input
                    type="date"
                    value={ddayInput}
                    onChange={(e) => setDdayInput(e.target.value)}
                    className="max-w-[220px]"
                  />
                  <Button onClick={saveDday} disabled={savingDday}>
                    {savingDday ? "저장중…" : "저장"}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* 커플 끊기 (테스트 버튼 유지) */}
              <div className="pt-1">
                <UnlinkButton />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 토스트 */}
      <Popup
        show={toast.show}
        message={toast.msg}
        onClose={() => setToast({ show: false, msg: "" })}
      />
    </main>
  );
}
