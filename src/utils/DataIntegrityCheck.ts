// src/utils/maintenance/dataintegritycheck.ts
import supabase from "@/lib/supabase";

/**
 * 데이터 무결성 검진
 * - 호출되면 콘솔에 시작 로그를 남기고, 각 항목별로
 *   [항목] -> [문제 여부] -> [해결/조치] 를 순서대로 출력합니다.
 */
export async function runDataIntegrityCheck(userId: string) {
  console.log("🚀🚀🚀 [DataIntegrityCheck] 데이터 무결성 체크 시작");

  if (!userId) {
    console.error("❌ [공통] 문제: userId가 비어있음 -> 해결: 즉시 종료");
    return { error: new Error("userId is required") };
  }

  // 오늘 날짜 (YYYY-MM-DD)
  const today = new Date().toLocaleDateString("sv-SE");

  // 유틸: 안전 로그
  const ok = (label: string, msg?: string) =>
    console.log(`✅ [${label}] 정상${msg ? `: ${msg}` : ""}`);
  const warn = (label: string, msg: string) =>
    console.warn(`⚠️  [${label}] 문제: ${msg}`);
  const fix = (label: string, msg: string) =>
    console.log(`🛠️  [${label}] 해결/조치: ${msg}`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1) user.id / nickname 체크
  // ─────────────────────────────────────────────────────────────────────────────
  const USER = "유저 기본정보";
  const { data: me, error: meErr } = await supabase
    .from("users")
    .select("id, nickname, couple_id, partner_id")
    .eq("id", userId)
    .maybeSingle();

  if (meErr || !me) {
    warn(
      USER,
      `users에서 내 정보 조회 실패 또는 없음 (${meErr?.message ?? "no row"})`
    );
    fix(USER, "검진 중단");
    return { error: meErr ?? new Error("user not found") };
  }

  if (!me.id) {
    warn(USER, "user.id 없음");
    fix(USER, "검진 중단");
    return { error: new Error("invalid user.id") };
  }
  if (!me.nickname) {
    warn(USER, "nickname 없음");
    fix(USER, "온보딩/닉네임 입력 유도 필요");
  } else {
    ok(USER, `id=${me.id}, nickname=${me.nickname}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2) 비커플일 때 정합성
  // ─────────────────────────────────────────────────────────────────────────────
  if (!me.couple_id) {
    const SEC = "비커플 정합성";

    ok(SEC, "현재 상태=비커플");

    // 2-1) daily_task 존재 여부 확인
    const { data: dtRows, error: dtErr } = await supabase
      .from("daily_task")
      .select("id, date")
      .eq("user_id", me.id);

    if (dtErr) {
      // 쿼리 자체 실패 → 존재 여부 불명
      warn(
        SEC,
        `daily_task 조회 실패 → 존재 여부 확인 불가 (${dtErr.message})`
      );
    } else if (dtRows.length === 0) {
      // 정상: 비커플인데 daily_task 없음
      ok(SEC, "정상: 비커플이면서 daily_task 없음");
    } else {
      // 비정상: 비커플인데 daily_task 있음
      warn(SEC, `비정상: 비커플인데 daily_task ${dtRows.length}건 존재`);
      fix(SEC, "TODO: daily_task 실제 삭제 로직 호출 예정");
      // TODO: 실제 삭제 함수 호출 (예: await deleteUserDailyTask(me.id))
    }

    // 2-2) 내가 쓴 글(answer) 존재 시 삭제(TODO 표기만)
    const { data: myAnswers, error: ansErr } = await supabase
      .from("answer")
      .select("user_id")
      .eq("user_id", me.id);

    if (ansErr) {
      warn(SEC, `answer 조회 실패 (${ansErr.message})`);
    } else if (myAnswers && myAnswers.length > 0) {
      warn(SEC, `비커플인데 answer ${myAnswers.length}건 존재`);
      fix(SEC, "TODO: answer 실제 삭제 로직 호출 예정");
      // TODO: 실제 삭제 함수 호출 (예: await deleteUserAnswers(me.id))
    } else {
      ok(SEC, "answer 없음");
    }

    // 2-3) couple_points 존재 시 삭제 (실제 삭제)
    //  - 비커플이므로 원칙적으로 존재하면 안 됨
    //  - 혹시 과거 커플 레코드가 남아있다면 그 id를 찾아 points 정리
    const { data: couplesOfMe, error: couplesErr } = await supabase
      .from("couples")
      .select("id, user1_id, user2_id")
      .or(`user1_id.eq.${me.id},user2_id.eq.${me.id}`);

    if (couplesErr) {
      warn(SEC, `couples 역참조 조회 실패 (${couplesErr.message})`);
    } else if (couplesOfMe && couplesOfMe.length > 0) {
      warn(
        SEC,
        `비커플인데 couples에 내 흔적 ${couplesOfMe.length}건 존재 (알림만)`
      );
      fix(SEC, "보고만 함: 과거 레코드 수동 점검 필요");

      const coupleIds = couplesOfMe.map((c) => c.id);
      const { data: cps, error: cpErr } = await supabase
        .from("couple_points")
        .select("couple_id")
        .in("couple_id", coupleIds);

      if (cpErr) {
        warn(SEC, `couple_points 조회 실패 (${cpErr.message})`);
      } else if (cps && cps.length > 0) {
        warn(SEC, `비커플인데 couple_points ${cps.length}건 존재`);
        const { error: delCpErr } = await supabase
          .from("couple_points")
          .delete()
          .in("couple_id", coupleIds);
        if (delCpErr) {
          warn(SEC, `couple_points 삭제 실패 (${delCpErr.message})`);
        } else {
          fix(SEC, "couple_points 잔존 데이터 삭제 완료");
        }
      } else {
        ok(SEC, "couple_points 없음");
      }
    } else {
      ok(SEC, "couples 테이블에 내 흔적 없음");
    }

    ok("비커플 종료", "비커플 상태 검진 완료");
    return { error: null };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3) 커플일 때 정합성
  // ─────────────────────────────────────────────────────────────────────────────
  const CSEC = "커플 정합성";
  ok(CSEC, `현재 상태=커플 (couple_id=${me.couple_id})`);

  // 3-1) 파트너 유효성
  if (!me.partner_id) {
    warn(CSEC, "partner_id 없음");
    fix(CSEC, "커플 상태 해제 or partner_id 복구 필요");
    // 여기서 즉시 수정은 하지 않음 (정책에 따라)
  } else {
    const { data: partner, error: pErr } = await supabase
      .from("users")
      .select("id, couple_id, partner_id")
      .eq("id", me.partner_id)
      .maybeSingle();

    if (pErr || !partner) {
      warn(CSEC, `partner 조회 실패/없음 (${pErr?.message ?? "no row"})`);
      fix(CSEC, "partner_id 재설정 필요");
    } else {
      ok(CSEC, `partner 유효 (id=${partner.id})`);

      // 3-2) 파트너가 나를 가리키는지
      if (partner.partner_id !== me.id) {
        warn(CSEC, "상대 partner_id가 나를 가리키지 않음");
        fix(CSEC, "상대 partner_id를 내 id로 동기화 필요");
        // 정책상 자동 수정 원하면 아래 주석 해제
        // await supabase.from("users").update({ partner_id: me.id }).eq("id", partner.id);
      } else {
        ok(CSEC, "상대 partner_id ↔ 나 (양방향 일치)");
      }

      // 커플 id도 서로 동일해야 함
      if (partner.couple_id !== me.couple_id) {
        warn(CSEC, "양측 couple_id 불일치");
        fix(CSEC, "둘 중 하나의 couple_id 정정 필요");
      } else {
        ok(CSEC, "양측 couple_id 일치");
      }
    }
  }

  // 3-3) couple 테이블 유효성
  const { data: coupleRow, error: cErr } = await supabase
    .from("couples")
    .select("id, user1_id, user2_id")
    .eq("id", me.couple_id)
    .maybeSingle();

  if (cErr || !coupleRow) {
    warn(CSEC, `couples 레코드 없음/조회 실패 (${cErr?.message ?? "no row"})`);
    fix(CSEC, "커플 관계 재구축 필요");
  } else {
    const inPair = coupleRow.user1_id === me.id || coupleRow.user2_id === me.id;
    if (!inPair) {
      warn(CSEC, "couples에 내가 포함되어 있지 않음");
      fix(CSEC, "couple_id 재검토 필요");
    } else {
      ok(CSEC, "couples 레코드 유효 (내 id가 포함됨)");
    }
  }

  // 3-4) 오늘자 daily_task 생성/보정
  const DSEC = "데일리 태스크";

  // 1) 오늘자 존재 여부 먼저 확인

  const { data: myTask, error: myTaskErr } = await supabase
    .from("daily_task")
    .select("user_id, date, completed, question_id, couple_id")
    .eq("user_id", me.id)
    .limit(1)
    .maybeSingle();

  if (myTaskErr) {
    warn(DSEC, `내 daily_task 조회 실패 (${myTaskErr.message})`);
  } else if (!myTask) {
    warn(DSEC, "내 daily_task 데이터 이상");
  } else {
    const taskDate = (myTask as any).date?.slice(0, 10); // 'YYYY-MM-DD' 안전 비교
    if (taskDate === today) {
      if (!myTask.completed)
        warn(DSEC, "daily_task date는 오늘인데 completed가 false");
    } else {
      //마지막 task 완료가 오늘이 아니다 .
      if (myTask.completed) {
        warn(DSEC, "📢daily_task 리셋! completed -> false");

        const { error: resetErr } = await supabase
          .from("daily_task")
          .update({ completed: false })
          .eq("user_id", me.id)
          .eq("date", taskDate);

        if (resetErr) {
          warn(DSEC, `completed 보정 실패 (${resetErr.message})`);
        } else {
          fix(
            DSEC,
            "completed 보정 완료 → 오늘 날짜와 불일치해서 false로 초기화"
          );
        }
      }
    }
  }

  ok("커플 종료", "커플 상태 검진 완료");
  console.log("🎉🎉🎉 [DataIntegrityCheck] 데이터 무결성 체크 종료");
  return { error: null };
}
