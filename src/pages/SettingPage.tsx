// src/pages/SettingPage.tsx
"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { CalendarDays, Heart, PencilLine, Save, UserRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import Popup from "@/components/widgets/Popup";
import { useUser } from "@/contexts/UserContext";
import AvatarPicker from "@/features/AvatarPicker";
import { avatarSrc } from "@/features/localAvatar";
import supabase from "@/lib/supabase";
import { cn } from "@/lib/utils";

type CoupleRow = {
  id: string;
  user1_id: string;
  user2_id: string;
  started_at: string | null;
  created_at: string;
};

const pageWrap = "mx-auto w-full max-w-5xl px-4 py-6 md:px-6";
const cardClass = "rounded-2xl border border-slate-200/70 bg-white shadow-sm";

export default function SettingPage() {
  const { user, fetchUser } = useUser();

  const [loading, setLoading] = useState(true);
  const [signupDate, setSignupDate] = useState("");
  const [couple, setCouple] = useState<CoupleRow | null>(null);
  const [partnerNickname, setPartnerNickname] = useState("");
  const [partnerAvatarId, setPartnerAvatarId] = useState<number | null>(null);
  const [ddayInput, setDdayInput] = useState("");
  const [myAvatarId, setMyAvatarId] = useState<number | null>(
    user?.avatar_id ?? null,
  );
  const [toast, setToast] = useState({ show: false, msg: "" });

  const isCoupled = !!user?.partner_id;
  const myAvatarUrl = avatarSrc(myAvatarId ?? undefined);
  const partnerAvatarUrl = avatarSrc(partnerAvatarId ?? undefined);

  const myInitial = useMemo(() => {
    const nickname = user?.nickname?.trim() ?? "";
    return nickname ? nickname[0] : "나";
  }, [user?.nickname]);

  const openToast = useCallback((msg: string, ms = 2200) => {
    setToast({ show: true, msg });
    const timer = window.setTimeout(() => setToast({ show: false, msg: "" }), ms);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      setSignupDate(authUser?.created_at?.slice(0, 10) ?? "");

      const { data: me } = await supabase
        .from("users")
        .select("nickname, avatar_id")
        .eq("id", user.id)
        .maybeSingle();

      setMyAvatarId((me?.avatar_id as number | null) ?? null);

      if (isCoupled && user.couple_id) {
        const { data: coupleRow } = await supabase
          .from("couples")
          .select("id, user1_id, user2_id, started_at, created_at")
          .eq("id", user.couple_id)
          .maybeSingle();

        if (coupleRow) {
          const nextCouple = coupleRow as CoupleRow;
          const partnerId =
            nextCouple.user1_id === user.id
              ? nextCouple.user2_id
              : nextCouple.user1_id;

          const { data: partner } = await supabase
            .from("users")
            .select("nickname, avatar_id")
            .eq("id", partnerId)
            .maybeSingle();

          setCouple(nextCouple);
          setPartnerNickname(partner?.nickname ?? "");
          setPartnerAvatarId((partner?.avatar_id as number | null) ?? null);
          setDdayInput(nextCouple.started_at?.slice(0, 10) ?? "");
        } else {
          clearCoupleState();
        }
      } else {
        clearCoupleState();
      }

      setLoading(false);
    };

    const clearCoupleState = () => {
      setCouple(null);
      setPartnerNickname("");
      setPartnerAvatarId(null);
      setDdayInput("");
    };

    void init();
  }, [fetchUser, isCoupled, user?.couple_id, user?.id]);

  const ddayText = useMemo(() => {
    if (!couple?.started_at) return "-";

    const start = new Date(couple.started_at);
    const today = new Date();
    const startDay = new Date(start.toDateString()).getTime();
    const todayDay = new Date(today.toDateString()).getTime();
    const diffDays = Math.floor((todayDay - startDay) / 86400000);

    return `D+${Math.max(0, diffDays)}`;
  }, [couple?.started_at]);

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

  if (loading) {
    return (
      <main className={pageWrap}>
        <div className="grid gap-4 lg:grid-cols-2">
          <SettingsSkeleton />
          <SettingsSkeleton />
        </div>
      </main>
    );
  }

  return (
    <main className={pageWrap}>
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-950">마이페이지</h2>
        <p className="mt-1 text-sm text-slate-500">
          프로필과 커플 정보를 관리할 수 있어요.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className={cardClass}>
          <CardHeader className="p-5 pb-4">
            <SectionTitle
              icon={UserRound}
              title="내 프로필"
              description="닉네임과 아바타"
            />
          </CardHeader>

          <CardContent className="space-y-6 p-5 pt-0">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="flex shrink-0 flex-col items-center gap-3">
                <ProfileAvatar
                  src={myAvatarUrl}
                  alt="내 아바타"
                  fallback={myInitial}
                />
                <AvatarPicker value={myAvatarId} onSave={saveAvatarId} />
              </div>

              <div className="min-w-0 flex-1 space-y-4">
                <EditableField
                  label="닉네임"
                  value={user?.nickname ?? ""}
                  onSave={async (next) => {
                    if (!user?.id) return;

                    const { error } = await supabase
                      .from("users")
                      .update({ nickname: next })
                      .eq("id", user.id);

                    if (error) throw error;
                    openToast("닉네임이 수정되었습니다.");
                    await fetchUser?.();
                  }}
                />

                <InfoRow label="가입일" value={signupDate || "-"} />
              </div>
            </div>
          </CardContent>

          <CardFooter className="justify-end border-t border-slate-100 p-5">
            <Button
              variant="outline"
              className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => openToast("회원탈퇴는 추후 구현 예정입니다.")}
            >
              회원탈퇴
            </Button>
          </CardFooter>
        </Card>

        <Card className={cardClass}>
          <CardHeader className="p-5 pb-4">
            <div className="flex items-start justify-between gap-3">
              <SectionTitle
                icon={Heart}
                title="커플 정보"
                description="연결된 계정과 만난 날짜"
              />
              {isCoupled && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                  연결됨
                </span>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-5 pt-0">
            {!isCoupled || !couple ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                아직 연결된 커플이 없어요.
              </div>
            ) : (
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <ProfileAvatar
                  src={partnerAvatarUrl}
                  alt="파트너 아바타"
                  fallback="상대"
                />

                <div className="min-w-0 flex-1 space-y-4">
                  <InfoRow label="상대 닉네임" value={partnerNickname || "-"} />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-sm font-medium text-slate-600">
                        만난 날짜
                      </Label>
                      <span className="text-sm font-semibold text-rose-600">
                        {ddayText}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="size-4 text-slate-400" />
                      <Input
                        type="date"
                        value={ddayInput}
                        onChange={async (event) => {
                          const next = event.target.value;
                          if (!user?.couple_id) return;

                          setDdayInput(next);
                          const { error } = await supabase
                            .from("couples")
                            .update({ started_at: next })
                            .eq("id", user.couple_id);

                          if (error) throw error;
                          setCouple((prev) =>
                            prev ? { ...prev, started_at: next } : prev,
                          );
                          openToast("만난 날짜가 수정되었습니다.");
                        }}
                        className="max-w-[220px]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Popup
        show={toast.show}
        message={toast.msg}
        onClose={() => setToast({ show: false, msg: "" })}
      />
    </main>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-600 ring-1 ring-slate-100">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <CardTitle className="text-base text-slate-950">{title}</CardTitle>
        <CardDescription className="mt-1 text-xs">{description}</CardDescription>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 break-words text-sm font-medium text-slate-900">
        {value}
      </div>
    </div>
  );
}

function ProfileAvatar({
  src,
  alt,
  fallback,
}: {
  src: string | null;
  alt: string;
  fallback: string;
}) {
  return (
    <div className="grid size-28 shrink-0 place-items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
      {src ? (
        <img
          src={src}
          alt={alt}
          className="block h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <span className="text-lg font-semibold text-slate-500">{fallback}</span>
      )}
    </div>
  );
}

function EditableField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  const save = async () => {
    const next = draft.trim();
    if (!next || next === value) {
      setEditing(false);
      return;
    }

    setBusy(true);
    try {
      await onSave(next);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
        <Label className="text-xs font-medium text-slate-500">{label}</Label>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void save();
              if (event.key === "Escape") setEditing(false);
            }}
            className="min-w-[180px] flex-1 bg-white"
            autoFocus
          />
          <Button size="sm" onClick={save} disabled={busy} className="gap-1">
            <Save className="size-4" />
            저장
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditing(false)}
            className="gap-1"
          >
            <X className="size-4" />
            취소
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-500">{label}</div>
          <div className="mt-1 break-words text-sm font-medium text-slate-900">
            {value || "-"}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setEditing(true)}
          className="size-8 shrink-0 text-slate-500 hover:bg-white"
          aria-label={`${label} 수정`}
        >
          <PencilLine className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <Card className={cardClass}>
      <CardHeader className="p-5 pb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-5 pt-0">
        <Skeleton className="size-28 rounded-full" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </CardContent>
    </Card>
  );
}
