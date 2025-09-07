// src/app/.../SettingPage.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import Popup from "@/components/widgets/Popup";
import UnlinkButton from "@/components/tests/UnlinkButton";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PencilLine, Save, X, UserRound, HeartHandshake } from "lucide-react";

import AvatarPicker from "@/features/AvatarPicker";
import { avatarSrc } from "@/features/localAvatar";
// ✅ shadcn Avatar
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
// import IngredientAdjustCard from "@/features/ingredients/IngredientAdjustCard";

type CoupleRow = {
  id: string;
  user1_id: string;
  user2_id: string;
  started_at: string | null;
  created_at: string;
};

export default function SettingPage() {
  const { user, fetchUser } = useUser();
  const [loading, setLoading] = useState(true);

  // toast
  const [toast, setToast] = useState<{ show: boolean; msg: string }>({
    show: false,
    msg: "",
  });
  const openToast = useCallback((msg: string, ms = 2200) => {
    setToast({ show: true, msg });
    const t = setTimeout(() => setToast({ show: false, msg: "" }), ms);
    return () => clearTimeout(t);
  }, []);

  // 가입일
  const [signupDate, setSignupDate] = useState("");

  // 닉네임
  const [editingNick, setEditingNick] = useState(false);
  const [nickInput, setNickInput] = useState(user?.nickname ?? "");
  const [savingNick, setSavingNick] = useState(false);

  // 커플
  const [couple, setCouple] = useState<CoupleRow | null>(null);
  const [partnerNickname, setPartnerNickname] = useState("");
  const [partnerAvatarId, setPartnerAvatarId] = useState<number | null>(null);
  const isCoupled = !!user?.partner_id;

  // D-Day
  const [ddayInput, setDdayInput] = useState(""); // yyyy-mm-dd
  const [savingDday, setSavingDday] = useState(false);

  // 아바타 id
  const [myAvatarId, setMyAvatarId] = useState<number | null>(
    user?.avatar_id ?? null
  );

  const myAvatarUrl = avatarSrc(myAvatarId ?? undefined);
  const partnerAvatarUrl = avatarSrc(partnerAvatarId ?? undefined);

  const myInitial = useMemo(() => {
    const nk = user?.nickname?.trim() ?? "";
    return nk ? nk[0] : "🙂";
  }, [user?.nickname]);

  // 내 아바타 저장
  const saveAvatarId = async (id: number) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("users")
      .update({ avatar_id: id })
      .eq("id", user.id);
    if (error) {
      openToast(`아바타 저장 실패: ${error.message}`);
      return;
    }
    setMyAvatarId(id);
    openToast("아바타가 저장되었습니다.");
    await fetchUser?.();
  };

  useEffect(() => {
    const init = async () => {
      if (!user?.id) return;
      setLoading(true);

      // 내 정보
      const { data } = await supabase.auth.getUser();
      const createdAt = data.user?.created_at ?? null;
      if (createdAt) setSignupDate(createdAt.slice(0, 10));

      // users에서 avatar_id 최신값 보정
      const { data: me } = await supabase
        .from("users")
        .select("nickname, avatar_id")
        .eq("id", user.id)
        .maybeSingle();
      setNickInput(me?.nickname ?? user.nickname ?? "");
      setMyAvatarId(me?.avatar_id ?? null);

      // 커플
      if (isCoupled && user.couple_id) {
        const { data: cRow } = await supabase
          .from("couples")
          .select("id, user1_id, user2_id, started_at, created_at")
          .eq("id", user.couple_id)
          .maybeSingle();

        if (cRow) {
          setCouple(cRow as CoupleRow);
          const partnerId =
            cRow.user1_id === user.id ? cRow.user2_id : cRow.user1_id;

          const { data: p } = await supabase
            .from("users")
            .select("nickname, avatar_id")
            .eq("id", partnerId)
            .maybeSingle();

          setPartnerNickname(p?.nickname ?? "");
          setPartnerAvatarId((p?.avatar_id as number | null) ?? null);
          if (cRow.started_at) setDdayInput(cRow.started_at.slice(0, 10));
        } else {
          setCouple(null);
          setPartnerNickname("");
          setPartnerAvatarId(null);
          setDdayInput("");
        }
      } else {
        setCouple(null);
        setPartnerNickname("");
        setPartnerAvatarId(null);
        setDdayInput("");
      }

      setLoading(false);
    };

    init();
  }, [user?.id, user?.couple_id, user?.partner_id, isCoupled, fetchUser]);

  const ddayText = useMemo(() => {
    if (!couple?.started_at) return "-";
    const start = new Date(couple.started_at);
    const today = new Date();
    const start0 = new Date(start.toDateString()).getTime();
    const today0 = new Date(today.toDateString()).getTime();
    const diffDays = Math.floor((today0 - start0) / 86400000);
    return `D+${Math.max(0, diffDays)}`;
  }, [couple?.started_at]);

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

  if (loading) {
    return (
      <main className="w-full max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-8">
        <Card className="bg-white border-amber-200/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#b75e20]">
              <UserRound className="h-5 w-5" />내 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-9 w-28" />
          </CardContent>
        </Card>
        <Card className="bg-white border-amber-200/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#b75e20]">
              <HeartHandshake className="h-5 w-5" />
              커플 정보
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-9 w-28" />
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="w-full max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-8">
      {/* 내 정보 */}
      {/* <IngredientAdjustCard /> */}
      <Card className="bg-white shadow-base">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-[#b75e20]">
            <UserRound className="h-5 w-5" />내 정보
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-6 items-start">
            {/* 왼쪽: 아바타 & 버튼 */}
            <div className="flex flex-col gap-3">
              <Avatar className="h-28 w-28 border bg-white">
                <AvatarImage src={myAvatarUrl ?? undefined} alt="내 아바타" />
                <AvatarFallback className="text-2xl">
                  {myInitial}
                </AvatarFallback>
              </Avatar>

              {/* ⬇️ AvatarPicker 너비 제한 */}
              <div className="w-full max-w-[180px]">
                <AvatarPicker value={myAvatarId} onSave={saveAvatarId} />
              </div>
            </div>

            {/* 오른쪽 */}
            <div className="space-y-5">
              <FieldRow label="닉네임">
                {editingNick ? (
                  <div className="flex w-full items-center gap-2">
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
                  <div className="flex w-full items-center gap-3">
                    <span className="text-sm sm:text-base">
                      {user?.nickname ?? "-"}
                    </span>
                    <Button
                      variant="ghost"
                      onClick={() => setEditingNick(true)}
                      className="gap-1"
                    >
                      <PencilLine className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </FieldRow>

              <FieldRow label="가입날짜">{signupDate || "-"}</FieldRow>
            </div>
          </div>
        </CardContent>

        {/* ✅ 액션 배치 통일: 오른쪽 정렬 */}
        <CardFooter className="justify-end gap-2">
          <Button
            variant="destructive"
            onClick={() => openToast("회원탈퇴는 추후 구현 예정입니다.")}
            className="gap-1"
          >
            회원탈퇴
          </Button>
        </CardFooter>
      </Card>

      {/* 커플 정보 */}
      <Card className="bg-white shadow-base">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-[#b75e20]">
            <HeartHandshake className="h-5 w-5" />
            커플 정보
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          {!isCoupled || !couple ? (
            <p className="text-sm text-[#6b533b]">
              아직 연결된 커플이 없어요 💫
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-6 items-start">
              <div className="flex flex-col items-center gap-2">
                <Avatar className="h-28 w-28 border bg-white">
                  <AvatarImage
                    src={partnerAvatarUrl ?? undefined}
                    alt="연인 아바타"
                  />
                  <AvatarFallback className="text-sm text-muted-foreground">
                    아바타 없음
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="space-y-5">
                <FieldRow label="커플 닉네임">
                  <span className="text-sm sm:text-base">
                    {partnerNickname || "-"}
                  </span>
                </FieldRow>

                <FieldRow label="만난날짜">
                  <div className="flex items-center gap-2">
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
                </FieldRow>
              </div>
            </div>
          )}
        </CardContent>

        {/* ✅ 액션 배치 통일: 오른쪽 정렬 */}
        <CardFooter className="justify-end gap-2">
          {/* UnlinkButton이 className 받지 않아도, 컨테이너 정렬로 위치 통일 */}
          <div className="inline-flex">
            <UnlinkButton />
          </div>
        </CardFooter>
      </Card>

      <Popup
        show={toast.show}
        message={toast.msg}
        onClose={() => setToast({ show: false, msg: "" })}
      />
    </main>
  );
}

/* ---- 작은 유틸 ---- */
function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-12 items-center gap-3">
      <Label className="col-span-4 sm:col-span-3 text-[#6b533b]">{label}</Label>
      <div className="col-span-8 sm:col-span-9">{children}</div>
    </div>
  );
}
