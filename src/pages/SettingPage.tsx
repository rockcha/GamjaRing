// src/app/.../SettingPage.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import supabase from "@/lib/supabase";
import { useUser } from "@/contexts/UserContext";
import Popup from "@/components/widgets/Popup";
import UnlinkButton from "@/components/tests/UnlinkButton";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PencilLine, Save, X } from "lucide-react";

import AvatarPicker from "@/features/AvatarPicker";
import { avatarSrc } from "@/features/localAvatar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

/* ───────────────────────── Types ───────────────────────── */

type CoupleRow = {
  id: string;
  user1_id: string;
  user2_id: string;
  started_at: string | null;
  created_at: string;
};

/* ──────────────────────── Tokens / UI ─────────────────────── */

const cardBase =
  "rounded-2xl border border-amber-200/60 bg-white/70 backdrop-blur-[2px] shadow-[0_1px_10px_rgba(0,0,0,0.03)]";
const sectionTitle =
  "flex items-center gap-2 text-[#b75e20] font-bold tracking-tight";
const subText = "text-[12px] text-[#6b533b]/80";

function GradientDivider({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-px w-full bg-gradient-to-r from-amber-200/60 via-transparent to-transparent ${className}`}
    />
  );
}

function SectionHeader({
  emoji,
  title,
  subtitle,
  right,
}: {
  emoji?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 px-4 pt-4 pb-2">
      <div className="min-w-0">
        <h3 className={sectionTitle}>
          {emoji ? <span className="text-xl">{emoji}</span> : null}
          <span className="truncate">{title}</span>
        </h3>
        {subtitle && <p className={subText}>{subtitle}</p>}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function AvatarRingWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-full p-[3px] bg-gradient-to-tr from-amber-300 via-rose-200 to-amber-200 shadow-[0_0_0_1px_rgba(0,0,0,0.03)]">
      <div className="rounded-full bg-white">{children}</div>
    </div>
  );
}

/* ---- 라벨/값 가로 정렬 (간단 버전) ---- */
function FieldRow({
  label,
  children,
  emphasize,
}: {
  label: string;
  children: React.ReactNode;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <Label
        className={
          emphasize
            ? "text-[#3f2e17] font-semibold shrink-0"
            : "text-[#6b533b] font-medium shrink-0"
        }
      >
        {label}
      </Label>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

/* ---- 공용: 보기↔수정 전환 인라인 필드 ---- */
function EditableField({
  label,
  value,
  onSave,
  placeholder = "입력",
}: {
  label: string;
  value: string;
  onSave: (v: string) => Promise<void>;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!editing) setV(value);
  }, [value, editing]);

  const save = async () => {
    const next = v.trim();
    if (!next || next === value) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      await onSave(next);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Label className="text-[#3f2e17] font-semibold shrink-0">{label}</Label>
      {!editing ? (
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm sm:text-base break-words">
            {value || "-"}
          </span>
          {saved ? (
            <span className="text-emerald-600 text-xs">저장됨 ✓</span>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditing(true)}
              aria-label={`${label} 수정`}
            >
              <PencilLine className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <Input
            value={v}
            onChange={(e) => setV(e.target.value)}
            placeholder={placeholder}
            className="min-w-0 flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            autoFocus
          />
          <Button onClick={save} disabled={busy} className="gap-1">
            <Save className="h-4 w-4" />
            저장
          </Button>
          <Button
            variant="outline"
            onClick={() => setEditing(false)}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            취소
          </Button>
        </div>
      )}
    </div>
  );
}

/* ---- D-Day 행 ---- */
function DdayRow({
  value,
  onSave,
  ddayText,
}: {
  value: string;
  onSave: (v: string) => Promise<void>;
  ddayText: string;
}) {
  const [v, setV] = useState(value);
  const [busy, setBusy] = useState(false);

  const save = async (next: string) => {
    setBusy(true);
    try {
      await onSave(next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Label className="text-[#3f2e17] font-semibold shrink-0">만난날짜</Label>
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={v}
          onChange={(e) => {
            const nv = e.target.value;
            setV(nv);
            void save(nv);
          }}
          aria-busy={busy}
          className="min-w-[180px]"
        />
      </div>
    </div>
  );
}

/* ─────────────────────── Main Page ─────────────────────── */

export default function SettingPage() {
  const { user, fetchUser } = useUser();

  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState<{ show: boolean; msg: string }>({
    show: false,
    msg: "",
  });
  const openToast = useCallback((msg: string, ms = 2200) => {
    setToast({ show: true, msg });
    const t = setTimeout(() => setToast({ show: false, msg: "" }), ms);
    return () => clearTimeout(t);
  }, []);

  const [signupDate, setSignupDate] = useState("");

  const [couple, setCouple] = useState<CoupleRow | null>(null);
  const [partnerNickname, setPartnerNickname] = useState("");
  const [partnerAvatarId, setPartnerAvatarId] = useState<number | null>(null);
  const isCoupled = !!user?.partner_id;

  const [ddayInput, setDdayInput] = useState("");

  const [myAvatarId, setMyAvatarId] = useState<number | null>(
    user?.avatar_id ?? null
  );

  const myAvatarUrl = avatarSrc(myAvatarId ?? undefined);
  const partnerAvatarUrl = avatarSrc(partnerAvatarId ?? undefined);

  const myInitial = useMemo(() => {
    const nk = user?.nickname?.trim() ?? "";
    return nk ? nk[0] : "🙂";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.nickname]);

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

      // 가입일
      const { data } = await supabase.auth.getUser();
      const createdAt = data.user?.created_at ?? null;
      if (createdAt) setSignupDate(createdAt.slice(0, 10));

      // 내 닉/아바타 최신화
      const { data: me } = await supabase
        .from("users")
        .select("nickname, avatar_id")
        .eq("id", user.id)
        .maybeSingle();
      setMyAvatarId(me?.avatar_id ?? null);

      // 커플 상태
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

    void init();
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

  /* ---------------- Loading ---------------- */
  if (loading) {
    return (
      <main className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6">
        <div className="flex flex-wrap gap-6">
          <Card className={`${cardBase} flex-1 min-w-[320px]`}>
            <SectionHeader
              emoji="👤"
              title="내 정보"
              subtitle="계정 · 프로필"
            />
            <GradientDivider />
            <CardContent className="pt-4 space-y-4">
              <Skeleton className="h-28 w-28 rounded-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-2/3" />
              <Skeleton className="h-9 w-28" />
            </CardContent>
          </Card>

          <Card className={`${cardBase} flex-1 min-w-[320px]`}>
            <SectionHeader
              emoji="🤝"
              title="커플 정보"
              subtitle="연인의 계정"
            />
            <GradientDivider />
            <CardContent className="pt-4 space-y-4">
              <Skeleton className="h-28 w-28 rounded-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-2/3" />
              <Skeleton className="h-9 w-28" />
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  /* ---------------- Main ---------------- */
  return (
    <main className="w-full max-w-5xl mx-auto px-4 md:px-6 py-6">
      <div className="flex flex-wrap gap-6">
        {/* 좌측: 내 정보 */}
        <Card className={`${cardBase} flex-1 min-w-[320px]`}>
          <SectionHeader emoji="👤" title="내 정보" subtitle="계정 · 프로필" />
          <GradientDivider />
          <CardContent className="pt-4">
            <div className="flex items-start gap-6 flex-wrap">
              {/* 왼쪽: 아바타 & 픽커 */}
              <div className="flex flex-col gap-3 items-center">
                <AvatarRingWrap>
                  <Avatar className="h-28 w-28 transition-transform duration-200 hover:scale-[1.01]">
                    <AvatarImage
                      src={myAvatarUrl ?? undefined}
                      alt="내 아바타"
                    />
                    <AvatarFallback className="text-2xl bg-[radial-gradient(ellipse_at_top,rgba(255,240,200,0.9),rgba(255,255,255,0.95))]">
                      {myInitial}
                    </AvatarFallback>
                  </Avatar>
                </AvatarRingWrap>

                <div className="w-full">
                  <AvatarPicker value={myAvatarId} onSave={saveAvatarId} />
                </div>
              </div>

              {/* 오른쪽: 필드들 */}
              <div className="flex-1 min-w-0 space-y-5">
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

                <FieldRow label="가입날짜" emphasize>
                  <span className="text-sm sm:text-base break-words">
                    {signupDate || "-"}
                  </span>
                </FieldRow>
              </div>
            </div>
          </CardContent>

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

        {/* 우측: 커플 정보 */}
        <Card className={`${cardBase} flex-1 min-w-[320px]`}>
          <SectionHeader
            emoji="🤝"
            title="커플 정보"
            subtitle="연인의 계정 · 프로필"
            right={
              isCoupled ? (
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                  연결됨
                </span>
              ) : null
            }
          />
          <GradientDivider />
          <CardContent className="pt-4">
            {!isCoupled || !couple ? (
              <p className="text-sm text-[#6b533b]">
                아직 연결된 커플이 없어요 💫
              </p>
            ) : (
              <div className="flex items-start gap-6 flex-wrap">
                {/* 왼쪽: 파트너 아바타 */}
                <div className="flex flex-col items-center gap-2">
                  <AvatarRingWrap>
                    <Avatar className="h-28 w-28">
                      <AvatarImage
                        src={partnerAvatarUrl ?? undefined}
                        alt="연인 아바타"
                      />
                      <AvatarFallback className="text-sm text-muted-foreground">
                        아바타 없음
                      </AvatarFallback>
                    </Avatar>
                  </AvatarRingWrap>
                </div>

                {/* 오른쪽: 필드 */}
                <div className="flex-1 min-w-0 space-y-5">
                  <FieldRow label="커플 닉네임" emphasize>
                    <span className="text-sm sm:text-base break-words">
                      {partnerNickname || "-"}
                    </span>
                  </FieldRow>

                  <DdayRow
                    value={ddayInput}
                    ddayText={ddayText}
                    onSave={async (next) => {
                      if (!user?.couple_id) return;
                      const { error } = await supabase
                        .from("couples")
                        .update({ started_at: next })
                        .eq("id", user.couple_id);
                      if (error) throw error;
                      setCouple((prev) =>
                        prev ? { ...prev, started_at: next } : prev
                      );
                      setDdayInput(next);
                      openToast("디데이가 수정되었습니다.");
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="justify-end gap-2">
            {/* <UnlinkButton /> */}
          </CardFooter>
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
